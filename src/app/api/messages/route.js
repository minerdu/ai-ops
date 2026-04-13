import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { handleIncomingMessage } from '@/lib/services/ai-service';

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    const isAll = searchParams.get('all') === 'true';
    if (!customerId) return NextResponse.json([], { status: 400 });

    const queryArgs = {
      where: { conversation: { customerId } },
      orderBy: { createdAt: 'desc' }
    };
    if (!isAll) queryArgs.take = 40;

    const messagesData = await prisma.message.findMany(queryArgs);

    if (!messagesData.length) return NextResponse.json([]);

    // Return messages in the format ChatPanel expects, reversed to chronological
    const messages = messagesData.reverse().map(m => ({
      id: m.id,
      direction: m.direction,
      senderType: m.senderType,
      contentType: m.contentType,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
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
      direction: newMessage.direction,
      senderType: newMessage.senderType,
      contentType: newMessage.contentType,
      content: newMessage.content,
      createdAt: newMessage.createdAt.toISOString(),
    });

  } catch (error) {
    console.error('Failed to send message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
