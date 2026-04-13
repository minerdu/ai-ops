import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const search = searchParams.get('search') || '';

    // Build query
    let whereClause = {};
    
    if (search) {
      whereClause = {
        OR: [
          { name: { contains: search } },
          { wechatId: { contains: search } },
          { aiSummary: { contains: search } },
          { tags: { some: { tag: { name: { contains: search } } } } }
        ]
      };
    }

    if (filter === 'ai_handling') {
      whereClause.conversations = { some: { aiMode: true } };
    } else if (filter === 'manual') {
      whereClause.conversations = { some: { aiMode: false } };
    } else if (filter === 'high_intent') {
      whereClause.intentScore = { gte: 3.5 };
    } else if (filter === 'silent') {
      whereClause.silentDays = { gte: 14 };
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        tags: {
          include: { tag: true }
        },
        conversations: {
          select: { unreadCount: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Transform to match front-end expectations
    const formattedData = customers.map(c => {
      const crm = c.crmHistory ? JSON.parse(c.crmHistory) : {};
      const uiScores = crm.scores || (c.isGroup ? {
        activityScore: 8.5, spendingScore: 7.0, interactionScore: 8.0,
        referralScore: 6.5, loyaltyScore: 7.5, conversionScore: 8.0
      } : {
        valueScore: c.valueScore, intentScore: c.intentScore,
        demandScore: 7.0, satisfactionScore: c.satisfactionScore,
        relationScore: 6.5, loyaltyScore: 7.0
      });

      return {
        id: c.id,
        name: c.name,
        avatar: c.avatar,
        uiScores,
        silentDays: c.silentDays,
        aiSummary: c.aiSummary || '',
        unreadCount: c.conversations.reduce((acc, conv) => acc + conv.unreadCount, 0),
        isGroup: c.isGroup,
        assignedToId: c.assignedToId,
        memberLevel: c.memberLevel,
        totalSpent: c.totalSpent,
        crmHistory: crm,
      // Flat map tags array with category for AI command center
      tags: c.tags.map(ct => ({
        name: ct.tag.name,
        category: ct.tag.category,
        color: ct.tag.color
      }))
    };
  });

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
