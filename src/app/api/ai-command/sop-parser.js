/**
 * SOP 时间表解析器
 * 
 * 将 LLM 返回的 SOP 时间编排（sop_schedule）解析为数据库 Task 记录。
 * 支持相对时间 (day_offset) 和绝对时间 (cron 表达式/固定时间)。
 */

import { PrismaClient } from '@prisma/client';
import { reviewAndUpdateTask } from '@/lib/services/auto-review';

const prisma = new PrismaClient();

/**
 * 将 SOP 时间表解析并创建 Task
 * 
 * @param {object} sopSchedule - LLM 返回的 SOP 计划
 * @param {Array<{day_offset: number, action: object, content: string, title?: string}>} sopSchedule.steps
 * @param {object[]} targetCustomers - 目标客户列表（含 id, name）
 * @param {object} meta - 元数据
 * @param {string} meta.command - 原始运营指令
 * @param {string} meta.intent - LLM 解析的意图
 * @param {boolean} meta.needApproval - 是否全部需要人工审批
 * @returns {Promise<{tasks: object[], summary: string}>}
 */
export async function parseSopScheduleToTasks(sopSchedule, targetCustomers, meta = {}) {
  const steps = sopSchedule || [];
  const tasksCreated = [];
  const now = new Date();

  for (const customer of targetCustomers) {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      // 计算排期时间
      const scheduledAt = calculateScheduledTime(now, step);

      // 创建 Task
      const task = await prisma.task.create({
        data: {
          customerId: customer.id,
          title: step.title || `${meta.intent || 'SOP任务'} - 第${i + 1}步`,
          taskType: step.action?.type || 'text',
          content: step.content || step.action?.content || '',
          triggerSource: 'manual_command',
          triggerReason: `📋 人工 SOP 编排: "${(meta.command || '').substring(0, 80)}" → 第${i + 1}/${steps.length}步`,
          approvalStatus: 'pending',
          executeStatus: 'draft',
          scheduledAt,
        },
      });

      // 运行 AI 自动审核
      try {
        const reviewResult = await reviewAndUpdateTask(task.id, {
          batchSize: targetCustomers.length,
        });
        
        tasksCreated.push({
          id: task.id,
          customerName: customer.name,
          step: i + 1,
          scheduledAt: scheduledAt.toISOString(),
          status: reviewResult.approved ? '已排期' : '待审批',
          reviewNotes: reviewResult.reason,
        });
      } catch (e) {
        console.error(`[SOP-Parser] Auto-review failed for task ${task.id}:`, e.message);
        tasksCreated.push({
          id: task.id,
          customerName: customer.name,
          step: i + 1,
          scheduledAt: scheduledAt.toISOString(),
          status: '待审批',
        });
      }
    }
  }

  const summary = `已为 ${targetCustomers.length} 位客户创建 ${steps.length} 步 SOP 工作流，共 ${tasksCreated.length} 条任务。`;
  console.log(`[SOP-Parser] ${summary}`);

  return { tasks: tasksCreated, summary };
}

/**
 * 根据步骤定义计算排期时间
 * 
 * @param {Date} baseTime - 基准时间
 * @param {object} step - 步骤定义
 * @param {number} step.day_offset - 天数偏移（0=今天，1=明天...）
 * @param {string} step.time - 固定时间点 "HH:mm"（可选）
 * @param {number} step.hour_offset - 小时偏移（可选，精细控制）
 * @returns {Date}
 */
function calculateScheduledTime(baseTime, step) {
  const scheduled = new Date(baseTime);

  // 天数偏移
  if (typeof step.day_offset === 'number') {
    scheduled.setDate(scheduled.getDate() + step.day_offset);
  }

  // 小时偏移
  if (typeof step.hour_offset === 'number') {
    scheduled.setTime(scheduled.getTime() + step.hour_offset * 60 * 60 * 1000);
  }

  // 固定发送时间（如 "10:30"）
  if (step.time) {
    const [hours, minutes] = step.time.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
      scheduled.setHours(hours, minutes, 0, 0);
    }
  }

  // 如果计算出的时间已经过去，则顺延到下一天同一时刻
  if (scheduled <= baseTime) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  return scheduled;
}

/**
 * 校验 LLM 返回的 SOP 计划结构
 * 
 * @param {object} plan - LLM 解析的完整计划
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateSopPlan(plan) {
  const errors = [];

  if (!plan) {
    errors.push('计划对象为空');
    return { valid: false, errors };
  }

  if (!plan.sop_schedule || !Array.isArray(plan.sop_schedule)) {
    errors.push('缺少 sop_schedule 数组');
    return { valid: false, errors };
  }

  if (plan.sop_schedule.length === 0) {
    errors.push('sop_schedule 为空数组');
    return { valid: false, errors };
  }

  for (let i = 0; i < plan.sop_schedule.length; i++) {
    const step = plan.sop_schedule[i];
    if (!step.content && !step.action?.content) {
      errors.push(`第 ${i + 1} 步缺少 content`);
    }
    if (typeof step.day_offset !== 'number' && typeof step.hour_offset !== 'number') {
      errors.push(`第 ${i + 1} 步缺少 day_offset 或 hour_offset 时间编排`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export default {
  parseSopScheduleToTasks,
  validateSopPlan,
};
