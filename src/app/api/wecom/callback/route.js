import { processIncomingMessage } from '@/lib/services/ai-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Optional: Security token matching
const EXPECTED_AUTH = process.env.OPENAPI_BRIDGE_AUTH || '';

export async function POST(req) {
  try {
    // 1. Auth check
    if (EXPECTED_AUTH) {
      const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key');
      // Just a loose check if they configured it
      if (authHeader && !authHeader.includes(EXPECTED_AUTH) && authHeader !== EXPECTED_AUTH) {
        console.warn(`[WeCom Webhook] Unauthorized request received.`);
        return new Response(JSON.stringify({ code: 401, error: 'Unauthorized' }), { status: 401 });
      }
    }

    const payload = await req.json();
    console.log(`\n[WeCom Webhook] Received payload:`, JSON.stringify(payload).substring(0, 500));

    // 2. Parse Payload (handles private chat + group chat formats based on Bridge spec)
    let customerId = payload.customerId;
    let robotId = payload.robotId;
    let msgId = payload.msgId;
    let msg = payload.msg;
    let msgType = payload.msgType || payload.msgtype;
    let isGroup = false;

    // Handle Group Callback format (400006)
    if (payload.type === 400006 || payload.type === '400006') {
      const data = payload.data || {};
      customerId = data.sender_serial_no || '';
      robotId = data.wxId || data.robot_serial_no || payload.wxId || '';
      msgId = data.msg_id || data.msg_serial_no || '';
      
      // Decode base64 msg_content
      if (data.msg_content) {
        try {
          msg = Buffer.from(data.msg_content, 'base64').toString('utf-8');
        } catch (e) {
          msg = data.msg_content;
        }
      } else {
        msg = data.href || data.title || '[Media/Link]';
      }
      
      msgType = data.msg_type;
      isGroup = true;
    }

    // Filter self-echo (Self sending messages shouldn't trigger AI unless needed)
    if (customerId && customerId === robotId) {
      console.log(`[WeCom Webhook] Ignoring self-echo from robot: ${robotId}`);
      return new Response(JSON.stringify({ code: 0, message: 'ignored self echo' }));
    }

    if (!customerId || !msg) {
      console.warn(`[WeCom Webhook] Missing customerId or msg. Payload:`, payload);
      return new Response(JSON.stringify({ code: 0, message: 'missing required fields' }));
    }

    // 3. Upsert Customer in CRM
    // If the customer doesn't exist, create an anonymous/skeleton record
    let customer = await prisma.customer.findUnique({
      where: { wechatId: customerId }
    });

    if (!customer) {
      console.log(`[WeCom Webhook] Creating new customer profile for ${customerId}`);
      customer = await prisma.customer.create({
        data: {
          name: `微信客户_${customerId.substring(0, 6)}`,
          wechatId: customerId,
          source: 'wechat',
          isGroup: isGroup,
          lifecycleStatus: 'new',
        }
      });
    }

    // 4. Forward to AI Service Pipeline
    // processIncomingMessage manages Conversation, Message persisting, Queueing, AI generation, and async sending
    console.log(`[WeCom Webhook] Processing msg pipeline for ${customer.name} (${customerId})`);
    
    // Fire and forget (don't block the webhook response)
    processIncomingMessage(customer.id, msg).catch(err => {
      console.error(`[WeCom Webhook] Pipeline Error:`, err);
    });

    // 5. Return success immediately to provider
    return new Response(JSON.stringify({ code: 0, message: 'success' }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`[WeCom Webhook] Parse Error:`, error);
    return new Response(JSON.stringify({ code: 500, error: 'Internal Server Error' }), { status: 500 });
  }
}
