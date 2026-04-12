import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseSopScheduleToTasks, validateSopPlan } from './sop-parser';
import { batchReview } from '@/lib/services/auto-review';

/**
 * AI 运营指挥中心 - 自然语言工作流生成与执行（增强版）
 * 
 * 支持：
 * - 单步批量任务生成
 * - 多步 SOP 时间编排（"为客户做3次破冰SOP"）
 * - 条件筛选增强（意向分>3 且 最近7天活跃）
 * - AI 自动审核引擎集成
 */

// 加载 AI 模型配置
async function loadAiConfig() {
  try {
    return await prisma.aiModelConfig.findUnique({ where: { id: 'default' } });
  } catch (e) {
    return null;
  }
}

// 调用 LLM
async function callLLM(config, systemPrompt, userMessage) {
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
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
  };
  if (isAzure) body.max_completion_tokens = 2000;
  else { body.max_tokens = 2000; body.model = config.modelName; }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM error (${res.status}): ${errText.substring(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// 构建运营指挥增强版系统提示词
function buildCommandSystemPrompt(customerSummary) {
  return `你是一个美容养生门店的AI运营执行官。运营人员会用自然语言给你下达指令，你需要：

1. 理解指令意图（是单次消息推送，还是多步SOP编排）
2. 根据客户数据库信息，筛选出符合条件的客户
3. 生成具体的执行计划
4. 输出结构化的JSON执行方案

当前系统中的客户概况：
${customerSummary}

你必须严格按照以下JSON格式返回（不要返回任何其他内容，只返回纯JSON）：

【如果是单次任务】：
{
  "intent": "指令意图简述",
  "type": "single",
  "filter": {
    "description": "筛选条件描述",
    "criteria": "intent_high | value_high | silent | vip | all | recent_purchase | no_purchase | active_7d"
  },
  "action": {
    "type": "send_coupon | send_message | send_material | create_reminder | batch_tag",
    "title": "任务标题",
    "content": "要发送给客户的具体内容（用亲切专业的美业顾问口吻撰写）",
    "needApproval": true或false(涉及金额返true)
  },
  "summary": "用中文向运营者汇报的执行摘要（100字以内）"
}

【如果是多步SOP编排】（如"做3次破冰SOP"、"连续跟进一周"等）：
{
  "intent": "多步SOP编排",
  "type": "sop",
  "filter": {
    "description": "筛选条件描述",
    "criteria": "同上"
  },
  "sop_schedule": [
    {"day_offset": 0, "time": "10:00", "title": "第1步标题", "action": {"type": "send_message"}, "content": "第1步要发的消息内容"},
    {"day_offset": 2, "time": "14:00", "title": "第2步标题", "action": {"type": "send_message"}, "content": "第2步要发的消息内容"},
    {"day_offset": 4, "time": "10:00", "title": "第3步标题", "action": {"type": "send_message"}, "content": "第3步要发的消息内容"}
  ],
  "needApproval": true,
  "summary": "用中文向运营者汇报的执行摘要（100字以内）"
}

注意：
- SOP中每步的 content 要结合客户情况写出有差异化的话术，不要千篇一律
- day_offset 0 = 今天，1 = 明天，以此类推
- time 为建议的发送时间，格式 "HH:mm"
- 涉及优惠券、折扣等金额操作时 needApproval 必须为 true`;
}

export async function POST(request) {
  try {
    const { command } = await request.json();
    if (!command || !command.trim()) {
      return NextResponse.json({ error: '请输入运营指令' }, { status: 400 });
    }

    const config = await loadAiConfig();

    // 1. 加载客户概况摘要供 LLM 分析
    const customers = await prisma.customer.findMany({
      where: { isGroup: false },
      include: { tags: { include: { tag: true } } },
    });

    const customerSummary = customers.map(c => {
      const tags = c.tags?.map(t => t.tag.name).join('、') || '无';
      const hasCrm = c.crmHistory ? '有消费记录' : '无消费记录';
      return `- ${c.name} | 意向:${c.intentScore} | 价值:${c.valueScore} | 沉默:${c.silentDays}天 | 标签:[${tags}] | ${hasCrm}`;
    }).join('\n');

    let plan;

    if (config && config.enabled && config.apiKey && config.apiBaseUrl) {
      // 真实 LLM 解析指令
      const systemPrompt = buildCommandSystemPrompt(customerSummary);
      const llmResponse = await callLLM(config, systemPrompt, command);

      // 提取 JSON（LLM 可能在 JSON 前后包裹 markdown 代码块）
      let jsonStr = llmResponse;
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];

      try {
        plan = JSON.parse(jsonStr);
      } catch (e) {
        return NextResponse.json({
          success: true,
          type: 'text',
          message: llmResponse, // 如果 LLM 没返回 JSON，直接当文本回复
        });
      }
    } else {
      // Mock 模式
      plan = buildMockPlan(command, customers);
    }

    // 2. 根据 plan.filter.criteria 筛选客户
    let targetCustomers = filterCustomers(customers, plan.filter?.criteria || 'all');

    // 3. 判断是单次任务还是多步 SOP
    if (plan.type === 'sop' && plan.sop_schedule) {
      // ===== 多步 SOP 编排 =====
      const validation = validateSopPlan(plan);
      if (!validation.valid) {
        return NextResponse.json({
          success: false,
          type: 'error',
          message: `SOP 计划结构不合法: ${validation.errors.join('；')}`,
        }, { status: 400 });
      }

      const result = await parseSopScheduleToTasks(
        plan.sop_schedule,
        targetCustomers,
        {
          command,
          intent: plan.intent,
          needApproval: plan.needApproval ?? true,
        }
      );

      return NextResponse.json({
        success: true,
        type: 'sop_workflow',
        plan: {
          intent: plan.intent,
          filterDesc: plan.filter?.description,
          steps: plan.sop_schedule.length,
          needApproval: plan.needApproval,
        },
        execution: {
          targetCount: targetCustomers.length,
          targetNames: targetCustomers.map(c => c.name),
          tasksCreated: result.tasks.length,
          tasks: result.tasks.slice(0, 20),
        },
        summary: plan.summary || result.summary,
      });
    }

    // ===== 单次批量任务 =====
    const needApproval = plan.action?.needApproval ?? false;
    const tasksCreated = [];

    for (const customer of targetCustomers) {
      const task = await prisma.task.create({
        data: {
          customerId: customer.id,
          title: plan.action?.title || '自然语言指令任务',
          taskType: plan.action?.type === 'send_material' ? 'image' : 'text',
          content: plan.action?.content || command,
          triggerSource: 'ai',
          triggerReason: `运营指令: "${command.substring(0, 50)}"`,
          approvalStatus: 'pending', // 先设 pending，由 auto-review 决定
          executeStatus: 'draft',
        },
      });
      tasksCreated.push(task);
    }

    // 运行 AI 自动审核
    const taskIds = tasksCreated.map(t => t.id);
    const reviewResult = await batchReview(taskIds);

    // 构建返回数据
    const responseTaskDetails = tasksCreated.map((task, i) => {
      const customer = targetCustomers[i];
      const isApproved = reviewResult.approved.includes(task.id);
      return {
        id: task.id,
        customerName: customer.name,
        status: isApproved ? '已排期（AI自动审核通过）' : '待审批',
        reviewedBy: 'ai',
      };
    });

    return NextResponse.json({
      success: true,
      type: 'workflow',
      plan: {
        intent: plan.intent,
        filterDesc: plan.filter?.description,
        actionTitle: plan.action?.title,
        actionContent: plan.action?.content,
        needApproval,
      },
      execution: {
        targetCount: targetCustomers.length,
        targetNames: targetCustomers.map(c => c.name),
        tasksCreated: tasksCreated.length,
        autoApproved: reviewResult.approved.length,
        pendingManual: reviewResult.pending.length,
        tasks: responseTaskDetails.slice(0, 10),
      },
      summary: plan.summary || `已为 ${targetCustomers.length} 位客户生成工作流任务（${reviewResult.approved.length}条自动通过，${reviewResult.pending.length}条待人工审批）。`,
    });

  } catch (error) {
    console.error('[AI-Command] Error:', error);
    return NextResponse.json({
      success: false,
      type: 'error',
      message: `执行失败: ${error.message}`,
    }, { status: 500 });
  }
}

// 客户筛选逻辑
function filterCustomers(customers, criteria) {
  switch (criteria) {
    case 'intent_high':
      return customers.filter(c => c.intentScore >= 4.0);
    case 'value_high':
      return customers.filter(c => c.valueScore >= 4.0);
    case 'silent':
      return customers.filter(c =>
        c.tags?.some(t => t.tag.name === '沉默客户') || c.silentDays > 7
      );
    case 'vip':
      return customers.filter(c =>
        c.tags?.some(t => t.tag.name === 'VIP')
      );
    case 'recent_purchase':
      return customers.filter(c => c.crmHistory);
    case 'no_purchase':
      return customers.filter(c => !c.crmHistory);
    case 'active_7d': {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return customers.filter(c =>
        c.lastInteractionAt && new Date(c.lastInteractionAt) >= sevenDaysAgo
      );
    }
    default:
      return customers;
  }
}

// Mock 模式降级方案
function buildMockPlan(command, customers) {
  // 多步 SOP Mock
  if (command.includes('SOP') || command.includes('sop') || command.includes('破冰') || command.includes('连续跟进')) {
    return {
      intent: '多步SOP编排：沉默客户破冰',
      type: 'sop',
      filter: { description: '沉默超过7天的客户', criteria: 'silent' },
      sop_schedule: [
        {
          day_offset: 0,
          time: '10:00',
          title: '第1步：温暖问候',
          action: { type: 'send_message' },
          content: '好久没见到您啦～最近怎么样呀？店里新到了一批有机精油，好多姐妹用了都说效果特别好呢🌿',
        },
        {
          day_offset: 2,
          time: '14:00',
          title: '第2步：价值输出',
          action: { type: 'send_message' },
          content: '亲爱的，今天刚好看到一篇养生科普文章，关于秋冬季节皮肤保养的，感觉对您可能有帮助，想分享给您看看～',
        },
        {
          day_offset: 4,
          time: '10:00',
          title: '第3步：邀约体验',
          action: { type: 'send_message' },
          content: '这周末我们店里有新项目体验日，名额有限，我特意给您留了一个VIP位～方便的话过来坐坐？☕',
        },
      ],
      needApproval: false,
      summary: '已为沉默客户制定3步破冰SOP：问候→价值输出→邀约体验，间隔2天执行。',
    };
  }

  if (command.includes('优惠') || command.includes('券')) {
    return {
      intent: '向意向客户发送优惠券',
      type: 'single',
      filter: { description: '意向评分 ≥ 4.0 的高意向客户', criteria: 'intent_high' },
      action: { type: 'send_coupon', title: '定向发放体验优惠券', content: '亲爱的，感谢您一直以来对我们的关注！特别为您准备了一张200元专属体验券，可用于面部护理或精油开背项目，有效期7天，想预约随时跟我说哦～💕', needApproval: true },
      summary: '已筛选出高意向客户，为她们生成了优惠券发放任务，因涉及金额已提交审批。',
    };
  }
  if (command.includes('沉默') || command.includes('激活') || command.includes('唤醒')) {
    return {
      intent: '激活沉默客户',
      type: 'single',
      filter: { description: '标记为"沉默客户"的用户', criteria: 'silent' },
      action: { type: 'send_message', title: '沉默客户温暖激活', content: '好久没见到您啦～最近店里上了好多新项目，好多姐妹体验完都赞不绝口呢！这周末有空的话过来坐坐？我给您留个VIP专属体验位～', needApproval: false },
      summary: '已筛选出沉默客户，将自动发送温暖激活消息。',
    };
  }
  if (command.includes('VIP') || command.includes('vip')) {
    return {
      intent: 'VIP客户专属关怀',
      type: 'single',
      filter: { description: '标记为VIP的客户', criteria: 'vip' },
      action: { type: 'send_message', title: 'VIP专属关怀推送', content: '亲爱的VIP会员，本月专属福利已为您解锁！新到的高端抗衰精华体验名额，仅限VIP享用，需要帮您预约吗？💎', needApproval: false },
      summary: '已为所有VIP客户生成专属关怀消息推送任务。',
    };
  }
  return {
    intent: '通用运营指令',
    type: 'single',
    filter: { description: '全部单聊客户', criteria: 'all' },
    action: { type: 'send_message', title: '批量消息推送', content: '亲爱的，我们店最近有一些很棒的活动和新项目，有空来店里逛逛呀～期待见到您！💕', needApproval: false },
    summary: `已为全部客户生成消息推送任务。`,
  };
}
