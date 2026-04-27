import { handleIncomingMessage } from '@/lib/services/ai-service';
import prisma from '@/lib/prisma';

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

    let customerId = payload.customerId || '';
    let robotId = payload.robotId || '';
    let msgId = payload.msgId || '';
    let msg = payload.msg || '';
    let msgType = payload.msgType || payload.msgtype;
    let isGroup = false;

    // Detect if this is an OpenClaw `/v1/responses` payload coming from the colleague's local Bridge
    if (payload.model && payload.user && payload.input) {
      console.log(`[WeCom Webhook] Detected OpenClaw JSON format from Bridge`);
      
      // Extract from user field: e.g. "openapi-private_wx123_robot456" or "openapi-group_12345"
      const userStr = payload.user || '';
      if (userStr.includes('private_')) {
        const parts = userStr.split('private_')[1].split('_');
        customerId = parts[0];
        if (parts.length > 1) robotId = parts[1];
      } else if (userStr.includes('group_')) {
        customerId = userStr.split('group_')[1];
        isGroup = true;
      } else {
        customerId = userStr.replace('openapi-', ''); // fallback
      }

      // Extract msg text from input blocks
      const inputBlocks = payload.input || [];
      for (const block of inputBlocks) {
        if (block.content && Array.isArray(block.content)) {
          for (const item of block.content) {
            if (item.type === 'input_text' && item.text) {
              msg += item.text + '\n';
            }
          }
        }
      }
      msg = msg.trim();
    } 
    // Handle Raw Group Callback format (400006)
    else if (payload.type === 400006 || payload.type === '400006') {
      const data = payload.data || {};
      customerId = data.sender_serial_no || '';
      robotId = data.wxId || data.robot_serial_no || payload.wxId || '';
      msgId = data.msg_id || data.msg_serial_no || '';
      
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
    handleIncomingMessage(customer.id, msg).catch(err => {
      console.error(`[WeCom Webhook] Pipeline Error:`, err);
    });

    // 5. Return success immediately to provider
    const responsePayload = (payload.model && payload.user && payload.input)
      ? { output: [{ type: "output_text", text: "NO_REPLY" }] }
      : { code: 0, message: 'success' };

    return new Response(JSON.stringify(responsePayload), {
      headers: { 'Content-Type': 'application/json' }
    });


  } catch (error) {
    console.error(`[WeCom Webhook] Parse Error:`, error);
    return new Response(JSON.stringify({ code: 500, error: 'Internal Server Error' }), { status: 500 });
  }
}
