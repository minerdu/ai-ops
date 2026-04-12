import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendWeComMessage } from '@/lib/services/wecom-adapter';

const prisma = new PrismaClient();

/**
 * 定时执行引擎（增强版）
 * 
 * 增强点：
 * 1. 执行前动态预检 — 调 LLM 判断"该客户当前是否适合发送原定消息"
 * 2. 失败重试机制 — 失败后延迟30分钟重试，最多3次
 * 3. 审计日志记录
 */

// 加载 AI 配置（用于动态预检）
async function loadAiConfig() {
  try {
    return await prisma.aiModelConfig.findUnique({ where: { id: 'default' } });
  } catch (e) {
    return null;
  }
}

// 轻量 LLM 调用（用于预检）
async function callLLMLight(config, prompt) {
  if (!config || !config.enabled || !config.apiKey) return null;

  const baseUrl = config.apiBaseUrl.replace(/\/+$/, '');
  const isAzure = baseUrl.includes('.openai.azure.com');

  let url, headers;
  if (isAzure) {
    url = `${baseUrl}/openai/deployments/${config.modelName}/chat/completions?api-version=2024-08-01-preview`;
    headers = { 'Content-Type': 'application/json', 'api-key': config.apiKey };
  } else {
    url = `${baseUrl}/chat/completions`;
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` };
  }

  const body = {
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
  };
  if (isAzure) body.max_completion_tokens = 200;
  else { body.max_tokens = 200; body.model = config.modelName; }

  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.warn('[Cron Engine] LLM precheck call failed:', e.message);
    return null;
  }
}

/**
 * 动态预检：判断客户当前状态下是否适合发送原定消息
 */
async function precheckTask(task, config) {
  if (!config || !config.enabled) {
    // 无 LLM 配置时直接通过预检
    return { shouldExecute: true, reason: 'LLM未配置，跳过预检' };
  }

  const customer = task.customer;
  if (!customer) {
    return { shouldExecute: true, reason: '无客户信息，跳过预检' };
  }

  const prompt = `你是一个运营助手。请判断以下任务是否仍然适合现在执行。

客户信息：
- 姓名: ${customer.name}
- 生命周期: ${customer.lifecycleStatus}
- 意向分: ${customer.intentScore}/5
- 沉默天数: ${customer.silentDays}
- AI摘要: ${customer.aiSummary || '无'}

待发送任务：
- 标题: ${task.title}
- 内容: ${task.content?.substring(0, 200)}
- 触发原因: ${task.triggerReason || '无'}

请回答 "EXECUTE" 如果适合执行，或 "SKIP:原因" 如果不适合（如客户已成交但仍收到激活消息）。只回答这一行，不要其他内容。`;

  const result = await callLLMLight(config, prompt);

  if (!result) {
    return { shouldExecute: true, reason: 'LLM预检超时或失败，默认执行' };
  }

  if (result.trim().startsWith('SKIP')) {
    const skipReason = result.replace(/^SKIP:?\s*/i, '').trim() || 'AI判断当前不适合发送';
    return { shouldExecute: false, reason: skipReason };
  }

  return { shouldExecute: true, reason: 'AI预检通过' };
}

export async function GET(request) {
  try {
    // SECURITY: In production, add Secret Bearer Token check
    
    // 1. Query for tasks that are ready to execute
    const now = new Date();
    const tasksToExecute = await prisma.task.findMany({
      where: {
        executeStatus: 'scheduled',
        approvalStatus: 'approved',
        scheduledAt: {
          lte: now
        }
      },
      include: {
        customer: true
      }
    });

    if (tasksToExecute.length === 0) {
      return NextResponse.json({ status: 'idle', count: 0 });
    }

    const config = await loadAiConfig();
    const executedIds = [];
    const failedIds = [];
    const skippedIds = [];

    // 2. Loop through and execute
    for (const task of tasksToExecute) {
      try {
        // --- 动态预检 ---
        const precheck = await precheckTask(task, config);
        if (!precheck.shouldExecute) {
          console.log(`[Cron Engine] Skipping task ${task.id}: ${precheck.reason}`);
          await prisma.task.update({
            where: { id: task.id },
            data: {
              executeStatus: 'cancelled',
              rejectReason: `AI预检跳过: ${precheck.reason}`,
            }
          });
          // 记录审计日志
          await prisma.auditLog.create({
            data: {
              entityType: 'task',
              entityId: task.id,
              action: 'precheck_skip',
              operator: 'ai',
              reason: precheck.reason,
            }
          });
          skippedIds.push(task.id);
          continue;
        }

        if (!task.customer || !task.customer.wechatId) {
          throw new Error('Customer or WechatId missing');
        }

        // Send via WeCom
        const wecomResponse = await sendWeComMessage(
          task.customer.wechatId, 
          task.content, 
          task.taskType
        );

        if (!wecomResponse.success) {
          throw new Error('WeCom Adapter failed');
        }

        // Get recent conversation or create one
        let conv = await prisma.conversation.findFirst({
          where: { customerId: task.customer.id, status: 'active' },
          orderBy: { createdAt: 'desc' }
        });

        if (!conv) {
          conv = await prisma.conversation.create({
            data: { customerId: task.customer.id }
          });
        }

        // Add to Message stream
        await prisma.message.create({
          data: {
            conversationId: conv.id,
            direction: 'outbound',
            senderType: 'system', // SOP/Task runner
            contentType: task.taskType === 'combo' ? 'text' : task.taskType,
            content: task.content,
            externalMsgId: wecomResponse.externalMsgId
          }
        });

        // Mark task as success
        await prisma.task.update({
          where: { id: task.id },
          data: {
            executeStatus: 'success',
            executedAt: new Date()
          }
        });

        // ===== 客户状态回写 =====
        // 执行成功 → 重置沉默天数 + 更新最近互动时间 + 升级生命周期
        try {
          const updateData = {
            silentDays: 0,
            lastInteractionAt: new Date(),
          };
          // 如果客户当前是 "new" 或 "silent"，升级为 "following"
          if (['new', 'silent'].includes(task.customer.lifecycleStatus)) {
            updateData.lifecycleStatus = 'following';
          }
          await prisma.customer.update({
            where: { id: task.customer.id },
            data: updateData,
          });
          console.log(`[Cron Engine] Customer ${task.customer.name} state updated: silentDays=0, lastInteraction=now`);
        } catch (custErr) {
          console.warn(`[Cron Engine] Failed to update customer state for ${task.customer.id}:`, custErr.message);
        }

        // 审计日志
        await prisma.auditLog.create({
          data: {
            entityType: 'task',
            entityId: task.id,
            action: 'execute',
            operator: 'system',
            reason: '定时执行成功',
          }
        });

        executedIds.push(task.id);
      } catch (err) {
        console.error(`[Cron Engine] Failed to execute task ${task.id}:`, err);

        const retryCount = (task.retryCount || 0) + 1;
        const maxRetries = task.maxRetries || 3;

        if (retryCount < maxRetries) {
          // --- 重试机制：延迟30分钟后重试 ---
          const retryAt = new Date(Date.now() + 30 * 60 * 1000);
          await prisma.task.update({
            where: { id: task.id },
            data: {
              retryCount,
              scheduledAt: retryAt,
              rejectReason: `执行失败(第${retryCount}次): ${err.message}，将于 ${retryAt.toISOString()} 重试`,
            }
          });
          console.log(`[Cron Engine] Task ${task.id} scheduled for retry ${retryCount}/${maxRetries} at ${retryAt.toISOString()}`);
        } else {
          // 超过最大重试次数，标记为失败
          await prisma.task.update({
            where: { id: task.id },
            data: {
              executeStatus: 'failed',
              retryCount,
              rejectReason: `已重试${maxRetries}次仍失败: ${err.message}`,
            }
          });
          // 审计日志
          await prisma.auditLog.create({
            data: {
              entityType: 'task',
              entityId: task.id,
              action: 'execute_failed',
              operator: 'system',
              reason: `已重试${maxRetries}次仍失败: ${err.message}`,
            }
          });
        }
        failedIds.push(task.id);
      }
    }

    return NextResponse.json({
      status: 'success',
      executed: executedIds.length,
      failed: failedIds.length,
      skipped: skippedIds.length,
      logs: { executedIds, failedIds, skippedIds }
    });

  } catch (error) {
    console.error('[Cron Engine] Critical Error:', error);
    return NextResponse.json({ error: 'Engine failed' }, { status: 500 });
  }
}
