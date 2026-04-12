import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { 
  mockCustomers, 
  mockMessages, 
  mockTasks, 
  mockPersona, 
  mockMaterials 
} from '@/lib/mockData';

export async function GET() {
  try {
    // 1. Clear existing data
    await prisma.message.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.customerTag.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.material.deleteMany({});
    await prisma.personaSetting.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.sopTemplate.deleteMany({});

    // 2. Create User
    const user = await prisma.user.create({
      data: {
        username: 'admin',
        password: 'password123',
        name: '店长配置',
        role: 'admin',
      }
    });

    // 3. Create Persona Settings
    await prisma.personaSetting.create({
      data: {
        userId: user.id,
        companyName: mockPersona.companyName,
        greeting: mockPersona.greeting,
        businessScope: mockPersona.businessScope,
        personaStyle: mockPersona.personaStyle,
        dialogRestriction: mockPersona.dialogRestriction,
      }
    });

    // 4. Create Tags mapping
    const tagMap = new Map();
    const allTagsSet = new Set();
    const tagStore = [];

    mockCustomers.forEach(c => {
      c.tags.forEach(t => {
        const key = t.name + t.category;
        if (!allTagsSet.has(key)) {
          allTagsSet.add(key);
          tagStore.push({ name: t.name, category: t.category, color: t.color });
        }
      });
    });

    for (const t of tagStore) {
      const createdTag = await prisma.tag.create({
        data: { name: t.name, category: t.category, color: t.color }
      });
      tagMap.set(t.name, createdTag.id);
    }

    // 5. Create Customers, Tags correlation, Conversations and Messages
    for (const mc of mockCustomers) {
      const customer = await prisma.customer.create({
        data: {
          id: mc.id, // Keep explicit UUIDs if possible, but prisma allows custom string IDs if specified
          name: mc.name,
          phone: mc.phone,
          wechatId: mc.wechatId,
          source: mc.source,
          lifecycleStatus: mc.lifecycleStatus,
          intentScore: mc.intentScore,
          valueScore: mc.valueScore,
          satisfactionScore: mc.satisfactionScore,
          silentDays: mc.silentDays,
          aiSummary: mc.aiSummary,
          lastInteractionAt: mc.lastInteractionAt ? new Date(mc.lastInteractionAt) : null,
          lastKeyQuestion: mc.lastKeyQuestion,
          assignedToId: mc.assignedTo,
        }
      });

      // Tie tags
      for (const t of mc.tags) {
        await prisma.customerTag.create({
          data: {
            customerId: customer.id,
            tagId: tagMap.get(t.name)
          }
        });
      }

      // Create conversation
      const conversation = await prisma.conversation.create({
        data: {
          customerId: customer.id,
          status: 'active',
          aiMode: true,
          lastMessageAt: mc.lastInteractionAt ? new Date(mc.lastInteractionAt) : null,
          unreadCount: 0,
        }
      });

      // Create messages
      const msgs = mockMessages[mc.id];
      if (msgs) {
        for (const msg of msgs) {
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              direction: msg.direction,
              senderType: msg.senderType,
              contentType: msg.contentType,
              content: msg.content,
              createdAt: new Date(msg.createdAt)
            }
          });
        }
      }
    }

    // 6. Create Tasks
    for (const task of mockTasks) {
      await prisma.task.create({
        data: {
          id: task.id,
          customerId: task.customerId,
          title: task.title,
          taskType: task.taskType,
          content: task.content,
          triggerSource: task.triggerSource,
          triggerReason: task.triggerReason,
          approvalStatus: task.approvalStatus,
          executeStatus: task.executeStatus,
          scheduledAt: task.scheduledAt ? new Date(task.scheduledAt) : null,
        }
      });
    }

    // 7. Create Materials
    for (const mat of mockMaterials) {
      await prisma.material.create({
        data: {
          id: mat.id,
          title: mat.title,
          type: mat.type,
          content: mat.content || mat.title, // Default content
          tags: mat.tags,
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Database seeded successfully with mock data' });

  } catch (error) {
    console.error('Seeding error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
