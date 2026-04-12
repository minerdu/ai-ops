import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { handleIncomingMessage } from '@/lib/services/ai-service';

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) return NextResponse.json([], { status: 400 });

    const conversations = await prisma.conversation.findMany({
      where: { customerId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!conversations.length) return NextResponse.json([]);

    // For simplicity, return messages of the most recent active conversation
    const messages = conversations[conversations.length - 1].messages.map(m => ({
      id: m.id,
      text: m.content,
      sender: m.direction === 'inbound' ? 'user' : (m.senderType === 'human' ? 'human' : 'ai'),
      time: m.createdAt.toISOString()
    }));

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { customerId, content, senderType } = await request.json();

    // 1. Find or create active conversation
    let conv = await prisma.conversation.findFirst({
      where: { customerId, status: 'active' },
      orderBy: { createdAt: 'desc' }
    });

    if (!conv) {
      conv = await prisma.conversation.create({
        data: { customerId }
      });
    }

    const direction = senderType === 'customer' ? 'inbound' : 'outbound';

    // 2. Insert standard message
    const newMessage = await prisma.message.create({
      data: {
        conversationId: conv.id,
        direction,
        senderType,
        contentType: 'text',
        content,
      }
    });

    // 3. (Async) Triger AI service if it's an inbound message
    if (direction === 'inbound' && conv.aiMode) {
      // Background execution for AI logic so we don't block the UI response
      handleIncomingMessage(conv.id, content, customerId).catch(console.error);
    }

    // Returning formatted for front-end
    return NextResponse.json({
      id: newMessage.id,
      text: newMessage.content,
      sender: newMessage.direction === 'inbound' ? 'user' : (newMessage.senderType === 'human' ? 'human' : 'ai'),
      time: newMessage.createdAt.toISOString()
    });

  } catch (error) {
    console.error('Failed to send message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
