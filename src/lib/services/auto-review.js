/**
 * AI 自动审核引擎
 * 
 * 低风险任务 AI 自动审批通过，高风险任务自动路由人工审批。
 * 所有审核操作记录到 AuditLog 表。
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --------------------------------------------------------
// 自动通过规则
// --------------------------------------------------------

const AUTO_APPROVE_RULES = {
  // 单次批量任务覆盖人数 ≤ 此值则可自动通过
  maxCustomerCount: 10,

  // 涉及以下任务类型必须人工审批
  requireManualTypes: ['send_coupon', 'send_refund', 'price_change'],

  // 消息内容过长需人工审查
  maxContentLength: 200,

  // 财务/敏感关键词 → 强制人工
  financialKeywords: [
    '退款', '退钱', '退费', '赔偿', '投诉', '报价', '打折',
    '优惠券', '折扣', '免费', '赠送', '返现', '佣金',
  ],

  // 触发来源白名单：仅这些来源可被 AI 自动审核
  autoReviewableSources: ['ai', 'sop', 'ai-sop'],
};

/**
 * 加载动态安全规则（从数据库 SafetyRule 表）
 */
async function loadDynamicRules() {
  try {
    const rules = await prisma.safetyRule.findMany({
      where: { isActive: true },
    });
    return {
      stopKeywords: rules.filter(r => r.ruleType === 'stop_keyword').map(r => r.value),
      financialKeywords: rules.filter(r => r.ruleType === 'financial_keyword').map(r => r.value),
      journeyBlocks: rules.filter(r => r.ruleType === 'journey_block').map(r => r.value),
      dailyLimit: rules.find(r => r.ruleType === 'daily_limit')?.value || '100',
    };
  } catch (e) {
    console.warn('[AutoReview] Failed to load dynamic rules, using defaults:', e.message);
    return { stopKeywords: [], financialKeywords: [], journeyBlocks: [], dailyLimit: '100' };
  }
}

/**
 * 审核一个 Task，决定自动通过还是路由人工
 * 
 * @param {object} task - 带 customer 关联的 Task 对象
 * @param {object} options - 额外选项
 * @param {number} options.batchSize - 本批次涵盖的客户总数
 * @returns {Promise<{approved: boolean, reason: string}>}
 */
export async function reviewTask(task, options = {}) {
  const reasons = [];
  const batchSize = options.batchSize || 1;

  // 1. 检查触发来源
  if (!AUTO_APPROVE_RULES.autoReviewableSources.includes(task.triggerSource)) {
    reasons.push(`触发来源 "${task.triggerSource}" 不在自动审核白名单`);
  }

  // 2. 检查批量大小
  if (batchSize > AUTO_APPROVE_RULES.maxCustomerCount) {
    reasons.push(`批量任务覆盖 ${batchSize} 人，超过自动通过阈值 (${AUTO_APPROVE_RULES.maxCustomerCount}人)`);
  }

  // 3. 检查任务类型
  if (AUTO_APPROVE_RULES.requireManualTypes.includes(task.taskType)) {
    reasons.push(`任务类型 "${task.taskType}" 需人工审批`);
  }

  // 4. 检查内容长度
  if (task.content && task.content.length > AUTO_APPROVE_RULES.maxContentLength) {
    reasons.push(`消息内容过长 (${task.content.length}字)，建议人工审查`);
  }

  // 5. 检查财务敏感词（静态 + 动态）
  const dynamicRules = await loadDynamicRules();
  const allFinancialKeywords = [
    ...AUTO_APPROVE_RULES.financialKeywords,
    ...dynamicRules.financialKeywords,
  ];
  const foundKeywords = allFinancialKeywords.filter(kw => task.content?.includes(kw));
  if (foundKeywords.length > 0) {
    reasons.push(`包含财务敏感词: [${foundKeywords.join('、')}]`);
  }

  // 6. 检查休止关键字
  const foundStopwords = dynamicRules.stopKeywords.filter(kw => task.content?.includes(kw));
  if (foundStopwords.length > 0) {
    reasons.push(`包含休止关键字: [${foundStopwords.join('、')}]`);
  }

  // 7. 检查每日发送量限制
  const dailyLimit = parseInt(dynamicRules.dailyLimit, 10);
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await prisma.task.count({
      where: {
        executeStatus: { in: ['scheduled', 'success'] },
        createdAt: { gte: todayStart },
      },
    });
    if (todayCount + batchSize > dailyLimit) {
      reasons.push(`今日已排期/已执行 ${todayCount} 条，加上本次 ${batchSize} 条将超出每日上限 ${dailyLimit}`);
    }
  } catch (e) {
    // 查询失败不阻塞
  }

  const approved = reasons.length === 0;
  const reviewNotes = approved
    ? 'AI自动审核通过：低风险任务，符合所有自动通过条件'
    : `AI自动审核拦截：${reasons.join('；')}`;

  // 记录审计日志
  try {
    await prisma.auditLog.create({
      data: {
        entityType: 'task',
        entityId: task.id,
        action: approved ? 'auto_approve' : 'auto_reject_to_manual',
        operator: 'ai',
        reason: reviewNotes,
        metadata: JSON.stringify({
          batchSize,
          taskType: task.taskType,
          triggerSource: task.triggerSource,
          contentLength: task.content?.length || 0,
        }),
      },
    });
  } catch (e) {
    console.error('[AutoReview] Failed to create audit log:', e.message);
  }

  return { approved, reason: reviewNotes };
}

/**
 * 对 Task 执行审核并自动更新其状态
 * 
 * @param {string} taskId - Task ID
 * @param {object} options - { batchSize }
 * @returns {Promise<{approved: boolean, reason: string}>}
 */
export async function reviewAndUpdateTask(taskId, options = {}) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { customer: true },
  });

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const result = await reviewTask(task, options);

  // 更新 Task 状态
  await prisma.task.update({
    where: { id: taskId },
    data: {
      approvalStatus: result.approved ? 'approved' : 'pending',
      executeStatus: result.approved ? 'scheduled' : 'draft',
      reviewedBy: 'ai',
      reviewNotes: result.reason,
      // 自动通过的任务，排期到 5 分钟后执行
      scheduledAt: result.approved ? new Date(Date.now() + 5 * 60 * 1000) : null,
    },
  });

  console.log(`[AutoReview] Task ${taskId}: ${result.approved ? '✅ AUTO-APPROVED' : '⏸️ PENDING MANUAL REVIEW'}`);
  console.log(`[AutoReview] Reason: ${result.reason}`);

  return result;
}

/**
 * 批量审核多个 Task
 * 
 * @param {string[]} taskIds - Task ID 列表
 * @returns {Promise<{approved: string[], pending: string[], results: object[]}>}
 */
export async function batchReview(taskIds) {
  const approved = [];
  const pending = [];
  const results = [];

  for (const taskId of taskIds) {
    const result = await reviewAndUpdateTask(taskId, { batchSize: taskIds.length });
    if (result.approved) {
      approved.push(taskId);
    } else {
      pending.push(taskId);
    }
    results.push({ taskId, ...result });
  }

  console.log(`[AutoReview] Batch review: ${approved.length} approved, ${pending.length} pending manual`);

  return { approved, pending, results };
}

export default {
  reviewTask,
  reviewAndUpdateTask,
  batchReview,
  AUTO_APPROVE_RULES,
};
