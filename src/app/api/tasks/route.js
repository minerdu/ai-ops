import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getJourneySummary } from '@/lib/services/journey-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function serializeTask(task) {
  return {
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
    executedAt: task.executedAt?.toISOString() || null,
    rejectReason: task.rejectReason || null,
    createdAt: task.createdAt.toISOString(),
  };
}

function getRangeWindow(dateParam, viewMode) {
  const baseDate = dateParam ? new Date(dateParam) : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    return null;
  }

  if (viewMode === 'month') {
    const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
    end.setDate(end.getDate() + (6 - end.getDay()));
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const day = new Date(baseDate);
  day.setHours(0, 0, 0, 0);
  const start = new Date(day);
  start.setDate(day.getDate() - day.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getTabWhere(tab) {
  switch (tab) {
    case 'pending':
      return { approvalStatus: 'pending' };
    case 'approved':
      return { approvalStatus: 'approved', executeStatus: { not: 'success' } };
    case 'executed':
      return { executeStatus: 'success' };
    case 'rejected':
      return { approvalStatus: 'rejected' };
    default:
      return null;
  }
}

function getTakeValue(rawValue) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.min(parsed, 500);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const summary = searchParams.get('summary');
    if (summary === 'journey') {
      const data = await getJourneySummary();
      return NextResponse.json(data);
    }

    const tab = searchParams.get('tab');
    const includeStats = searchParams.get('includeStats') === '1';
    const viewMode = searchParams.get('viewMode');
    const date = searchParams.get('date');
    const triggerSource = searchParams.get('triggerSource');
    const customerId = searchParams.get('customerId');
    const take = getTakeValue(searchParams.get('limit'));

    const filters = [];
    if (tab) {
      const tabWhere = getTabWhere(tab);
      if (tabWhere) {
        filters.push(tabWhere);
      }
    }
    if (triggerSource) {
      filters.push({ triggerSource });
    }
    if (customerId) {
      filters.push({ customerId });
    }
    if (viewMode) {
      const range = getRangeWindow(date, viewMode);
      if (range) {
        filters.push({
          OR: [
            {
              scheduledAt: {
                gte: range.start,
                lte: range.end,
              },
            },
            {
              scheduledAt: null,
              createdAt: {
                gte: range.start,
                lte: range.end,
              },
            },
          ],
        });
      }
    }

    const where = filters.length > 0 ? { AND: filters } : undefined;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { scheduledAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take,
      include: {
        customer: {
          select: { name: true }
        }
      }
    });

    const formattedTasks = tasks.map(serializeTask);

    if (includeStats) {
      const [pending, toExecute, completed, rejected, manualTotal, manualRejected] = await Promise.all([
        prisma.task.count({ where: { approvalStatus: 'pending' } }),
        prisma.task.count({ where: { approvalStatus: 'approved', executeStatus: 'scheduled' } }),
        prisma.task.count({ where: { executeStatus: 'success' } }),
        prisma.task.count({ where: { approvalStatus: 'rejected' } }),
        prisma.task.count({ where: { triggerSource: 'manual_command' } }),
        prisma.task.count({ where: { triggerSource: 'manual_command', approvalStatus: 'rejected' } }),
      ]);

      return NextResponse.json({
        tasks: formattedTasks,
        stats: {
          pending,
          toExecute,
          completed,
          rejected,
          rejectRate: manualTotal > 0 ? Math.round((manualRejected / manualTotal) * 100) : 0,
        },
      });
    }

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
