import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { name: true }
        }
      }
    });

    const formattedTasks = tasks.map(t => ({
      id: t.id,
      customerId: t.customerId,
      customerName: t.customer?.name || '未知客户',
      title: t.title,
      content: t.content,
      triggerSource: t.triggerSource,
      triggerReason: t.triggerReason || '',
      taskType: t.taskType,
      approvalStatus: t.approvalStatus,
      executeStatus: t.executeStatus,
      scheduledAt: t.scheduledAt?.toISOString() || null,
      executedAt: t.executedAt?.toISOString() || null,
      rejectReason: t.rejectReason || null,
      createdAt: t.createdAt.toISOString()
    }));

    return NextResponse.json(formattedTasks);
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { customerId, title, taskType, content, scheduledAt, triggerSource, triggerReason, needApproval } = await request.json();

    if (!customerId || !content) {
      return NextResponse.json({ error: 'customerId and content are required' }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        customerId,
        title: title || '跟进任务',
        taskType: taskType || 'text',
        content,
        triggerSource: triggerSource || 'manual',
        triggerReason: triggerReason || '手动创建',
        approvalStatus: needApproval === false ? 'approved' : 'pending',
        executeStatus: needApproval === false ? 'scheduled' : 'draft',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
      include: {
        customer: { select: { name: true } }
      }
    });

    return NextResponse.json({
      id: task.id,
      customerId: task.customerId,
      customerName: task.customer?.name || '未知客户',
      title: task.title,
      content: task.content,
      triggerSource: task.triggerSource,
      triggerReason: task.triggerReason || '',
      taskType: task.taskType,
      approvalStatus: task.approvalStatus,
      executeStatus: task.executeStatus,
      scheduledAt: task.scheduledAt?.toISOString() || null,
      createdAt: task.createdAt.toISOString()
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    // Accept both { id, action } and { taskId, action } for compatibility
    const taskId = body.id || body.taskId;
    const { action, updateData } = body;

    if (!taskId || !action) {
      return NextResponse.json({ error: 'id and action are required' }, { status: 400 });
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    let data = {};

    switch (action) {
      case 'approve':
        data.approvalStatus = 'approved';
        data.executeStatus = 'scheduled';
        if (updateData?.content) data.content = updateData.content;
        if (updateData?.scheduledAt) {
          data.scheduledAt = new Date(updateData.scheduledAt);
        } else if (!task.scheduledAt) {
          data.scheduledAt = new Date(Date.now() + 60000);
        }
        break;
      case 'reject':
        data.approvalStatus = 'rejected';
        data.executeStatus = 'cancelled';
        if (updateData?.rejectReason) data.rejectReason = updateData.rejectReason;
        break;
      case 'execute':
        data.executeStatus = 'success';
        data.executedAt = new Date();
        break;
      case 'cancel':
        data.executeStatus = 'cancelled';
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data
    });

    return NextResponse.json({ success: true, updatedTask });
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
