/**
 * AI 自动审核引擎 v2
 * 
 * 双模式审核：
 * - journey（旅程自动）→ 一律自动通过
 * - manual_command（人工指令）→ 检查财务关键词/金额 → 决定通过或人工审批
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --------------------------------------------------------
// 审核规则
// --------------------------------------------------------

const FINANCIAL_KEYWORDS = [
  '退款', '退钱', '退费', '赔偿', '报价',
  '优惠券', '折扣', '免费', '赠送', '返现', '佣金',
  '元券', '代金券', '现金券',
];

// 金额正则：匹配 "100元"、"¥200"、"200块" 等
const AMOUNT_REGEX = /(?:¥|￥)?(\d+(?:\.\d+)?)\s*(?:元|块|¥)/g;

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
      dailyLimit: rules.find(r => r.ruleType === 'daily_limit')?.value || '500',
    };
  } catch (e) {
    console.warn('[AutoReview] Failed to load dynamic rules:', e.message);
    return { stopKeywords: [], financialKeywords: [], dailyLimit: '500' };
  }
}

/**
 * 检查内容中是否包含超过 100 元的金额
 */
function containsHighAmount(content) {
  if (!content) return false;
  const matches = [...content.matchAll(AMOUNT_REGEX)];
  return matches.some(m => parseFloat(m[1]) > 100);
}

/**
 * 审核一个 Task
 * 
 * @param {object} task
 * @returns {Promise<{approved: boolean, reason: string}>}
 */
export async function reviewTask(task) {
  // ============================================================
  // 规则 1：旅程自动任务 → 一律自动通过
  // ============================================================
  if (task.triggerSource === 'journey' || task.triggerSource === 'ai-sop') {
    return {
      approved: true,
      reason: 'AI自动审核通过：客户旅程自动运营任务，免审直通',
    };
  }

  // ============================================================
  // 规则 2：手动指令 / SOP → 检查财务风险
  // ============================================================
  const reasons = [];

  // 2a. 检查财务敏感词（静态 + 动态）
  const dynamicRules = await loadDynamicRules();
  const allFinancialKeywords = [...FINANCIAL_KEYWORDS, ...dynamicRules.financialKeywords];
  const foundKeywords = allFinancialKeywords.filter(kw => task.content?.includes(kw));
  if (foundKeywords.length > 0) {
    reasons.push(`包含财务敏感词: [${foundKeywords.join('、')}]`);
  }

  // 2b. 检查金额 >100
  if (containsHighAmount(task.content)) {
    reasons.push('内容包含超过100元的金额');
  }

  // 2c. 检查休止关键字
  const foundStopwords = dynamicRules.stopKeywords.filter(kw => task.content?.includes(kw));
  if (foundStopwords.length > 0) {
    reasons.push(`包含休止关键字: [${foundStopwords.join('、')}]`);
  }

  // 2d. 检查任务类型
  if (['send_coupon', 'send_refund', 'price_change'].includes(task.taskType)) {
    reasons.push(`任务类型 "${task.taskType}" 涉及财务操作`);
  }

  const approved = reasons.length === 0;
  const reviewNotes = approved
    ? 'AI自动审核通过：运营指令任务，未检测到财务风险'
    : `AI自动审核拦截 → 需人工审批：${reasons.join('；')}`;

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
 */
export async function reviewAndUpdateTask(taskId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { customer: true },
  });

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const result = await reviewTask(task);

  await prisma.task.update({
    where: { id: taskId },
    data: {
      approvalStatus: result.approved ? 'approved' : 'pending',
      executeStatus: result.approved ? 'scheduled' : 'draft',
      reviewedBy: 'ai',
      reviewNotes: result.reason,
      scheduledAt: result.approved
        ? (task.scheduledAt || new Date(Date.now() + 5 * 60 * 1000))
        : task.scheduledAt,
    },
  });

  console.log(`[AutoReview] Task ${taskId}: ${result.approved ? '✅ AUTO-APPROVED' : '⏸️ PENDING MANUAL'}`);
  return result;
}

/**
 * 批量审核多个 Task
 */
export async function batchReview(taskIds) {
  const approved = [];
  const pending = [];
  const results = [];

  for (const taskId of taskIds) {
    const result = await reviewAndUpdateTask(taskId);
    if (result.approved) {
      approved.push(taskId);
    } else {
      pending.push(taskId);
    }
    results.push({ taskId, ...result });
  }

  console.log(`[AutoReview] Batch: ${approved.length} approved, ${pending.length} pending`);
  return { approved, pending, results };
}

export default { reviewTask, reviewAndUpdateTask, batchReview };
