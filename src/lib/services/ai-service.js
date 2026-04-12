import { PrismaClient } from '@prisma/client';
import { enqueue, cancel, hasQueuedMessages } from './message-queue';

const prisma = new PrismaClient();

/**
 * 从数据库加载 AI 模型配置
 */
async function loadAiConfig() {
  try {
    const config = await prisma.aiModelConfig.findUnique({ where: { id: 'default' } });
    return config;
  } catch (e) {
    console.error('[AI-Service] Failed to load AI config:', e);
    return null;
  }
}

/**
 * 构建系统提示词：融合 Persona 设定 + 客户 CRM 上下文
 * 新增：要求 LLM 返回结构化 JSON 格式
 */
async function buildSystemPrompt(customerId, configSystemPrompt) {
  // 1. 加载 Persona 设定
  let personaContext = '';
  try {
    const persona = await prisma.personaSetting.findFirst();
    if (persona) {
      personaContext = [
        persona.companyName ? `你所服务的公司：${persona.companyName}` : '',
        persona.roleDefinition ? `你的角色定位：${persona.roleDefinition}` : '',
        persona.taskWorkflow ? `你的工作流程：${persona.taskWorkflow}` : '',
        persona.edgeCases ? `特殊情况处理规则：${persona.edgeCases}` : '',
        persona.formatRules ? `输出格式规范：${persona.formatRules}` : '',
      ].filter(Boolean).join('\n');
    }
  } catch (e) { /* 静默处理 */ }

  // 2. 加载客户 CRM 信息
  let customerContext = '';
  if (customerId) {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: { tags: { include: { tag: true } } }
      });
      if (customer) {
        const tagNames = customer.tags?.map(t => t.tag.name).join('、') || '无';
        let crmInfo = '无消费记录';
        if (customer.crmHistory) {
          try {
            const records = JSON.parse(customer.crmHistory);
            crmInfo = records.map(r => `${r.date} 购买 ${r.product} (¥${r.amount})`).join('；');
          } catch (e) { /* ignore */ }
        }
        customerContext = [
          `当前对话客户：${customer.name}`,
          `客户标签：${tagNames}`,
          `意向评分：${customer.intentScore}/5`,
          `价值评分：${customer.valueScore}/5`,
          `AI摘要：${customer.aiSummary || '暂无'}`,
          `门店CRM消费记录：${crmInfo}`,
        ].join('\n');
      }
    } catch (e) { /* 静默处理 */ }
  }

  // 3. 组合最终系统提示词（结构化 JSON 输出要求）
  const defaultSystem = `你是一个专业的美容养生门店AI运营顾问。你的职责是自主与客户进行一对一沟通，推动客户预约体验、完成消费转化、做好售后关怀。
你必须像一个真正有情感、有温度的美业顾问一样说话，使用简短自然的口语。
遇到涉及退款、大额优惠、纠纷等财务敏感话题时，礼貌告知客户"已帮您转交专属顾问处理"，不要擅自承诺金额。

【重要】你必须严格按照以下 JSON 格式返回结果（不要返回任何其他内容，只返回纯JSON）：
{
  "messages": [
    {"text": "第一段消息内容（简短自然，不超过50字）", "delay_ms": 1200},
    {"text": "第二段消息内容", "delay_ms": 2000}
  ],
  "intent_tags": ["用于标记客户意图的标签"],
  "suggested_actions": ["推荐的运营动作"],
  "financial_sensitive": false
}

规则：
1. messages 数组通常2-3条消息，模拟真人分段发送
2. 每条消息不超过50字，除非客户明确要求详细解释
3. delay_ms 表示该条消息发送前的等待时间（毫秒），根据文字量自然推算
4. 如果检测到财务敏感话题，设 financial_sensitive 为 true
5. intent_tags 和 suggested_actions 是你的分析判断，不需要发给客户`;

  const parts = [
    configSystemPrompt || defaultSystem,
    personaContext ? `\n--- 企业人设信息 ---\n${personaContext}` : '',
    customerContext ? `\n--- 当前客户画像 ---\n${customerContext}` : '',
  ];

  return parts.filter(Boolean).join('\n');
}

/**
 * 加载该会话的历史消息，用作 LLM 上下文
 */
async function loadConversationHistory(conversationId, maxMessages = 20) {
  try {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: maxMessages,
    });
    return messages.map(m => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.content,
    }));
  } catch (e) {
    return [];
  }
}

/**
 * 调用真实 LLM API（自动兼容 Azure OpenAI 和标准 OpenAI 格式）
 */
async function callLLM(config, systemPrompt, conversationHistory, userMessage) {
  const baseUrl = config.apiBaseUrl.replace(/\/+$/, '');
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  // 检测是否为 Azure OpenAI（URL 中包含 .openai.azure.com）
  const isAzure = baseUrl.includes('.openai.azure.com');

  let url, headers;
  if (isAzure) {
    // Azure OpenAI 格式:
    // POST {endpoint}/openai/deployments/{deployment-name}/chat/completions?api-version=2024-08-01-preview
    const apiVersion = '2024-08-01-preview';
    url = `${baseUrl}/openai/deployments/${config.modelName}/chat/completions?api-version=${apiVersion}`;
    headers = {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    };
  } else {
    // 标准 OpenAI 兼容格式
    url = `${baseUrl}/chat/completions`;
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    };
  }

  const body = {
    messages,
    temperature: config.temperature ?? 0.7,
  };
  // Azure 新版模型用 max_completion_tokens，标准用 max_tokens
  if (isAzure) {
    body.max_completion_tokens = config.maxTokens ?? 800;
  } else {
    body.max_tokens = config.maxTokens ?? 800;
    body.model = config.modelName;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM API error (${res.status}): ${errText.substring(0, 300)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '抱歉，AI暂时无法生成回复。';
}

/**
 * 解析 LLM 返回的结构化 JSON
 * 兼容 LLM 可能在 JSON 前后包裹 markdown 代码块的情况
 */
function parseLLMStructuredResponse(rawResponse) {
  try {
    // 尝试直接解析
    return JSON.parse(rawResponse);
  } catch (e) {
    // 尝试提取 JSON 块
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {
        // 解析失败
      }
    }
  }

  // 降级：将整条文本作为单条消息
  return {
    messages: [{ text: rawResponse, delay_ms: 0 }],
    intent_tags: [],
    suggested_actions: [],
    financial_sensitive: false,
  };
}

/**
 * Mock 回复（未接入 AI 时的降级方案）— 结构化格式
 */
function getMockReply(content) {
  if (content.includes('预约') || content.includes('约')) {
    return {
      messages: [
        { text: '亲爱的，帮您查了一下～', delay_ms: 800 },
        { text: '明天下午2-5点还有空位呢，您看哪个时段方便？', delay_ms: 1500 },
        { text: '我直接帮您锁定位置哦💕', delay_ms: 1200 },
      ],
      intent_tags: ['预约意向'],
      suggested_actions: ['创建预约跟进'],
      financial_sensitive: false,
    };
  }
  if (content.includes('价格') || content.includes('多少钱') || content.includes('贵')) {
    return {
      messages: [
        { text: '亲，这个问题我帮您转交专属顾问确认最优方案～', delay_ms: 1200 },
        { text: '她会马上联系您的哦💕', delay_ms: 1000 },
      ],
      intent_tags: ['价格咨询'],
      suggested_actions: ['转人工'],
      financial_sensitive: true,
    };
  }
  if (content.includes('效果') || content.includes('有用')) {
    return {
      messages: [
        { text: '效果是非常明显的呢！', delay_ms: 800 },
        { text: '我们很多姐妹做完第一次就能感受到变化', delay_ms: 2000 },
        { text: '要不要预约一次亲身体验一下？', delay_ms: 1200 },
      ],
      intent_tags: ['效果咨询', '高意向'],
      suggested_actions: ['推荐体验预约'],
      financial_sensitive: false,
    };
  }
  return {
    messages: [
      { text: '收到您的消息啦～', delay_ms: 800 },
      { text: '有任何需要随时找我哦，祝您今天心情愉快！💕', delay_ms: 1500 },
    ],
    intent_tags: [],
    suggested_actions: [],
    financial_sensitive: false,
  };
}

/**
 * 核心入口：处理客户发来的消息，自动生成 AI 回复
 * 
 * 增强版：支持多消息分段 + 延迟发送 + 智能跳过
 */
export async function handleIncomingMessage(conversationId, incomingContent, customerId) {
  try {
    console.log(`[AI-Service] Processing inbound message on conv ${conversationId}: "${incomingContent}"`);

    // 智能跳过：如果有正在排队的消息，取消旧队列
    if (hasQueuedMessages(conversationId)) {
      console.log(`[AI-Service] New message received — cancelling queued messages for conv ${conversationId}`);
      cancel(conversationId);
    }

    const config = await loadAiConfig();
    let structured;

    if (config && config.enabled && config.apiKey && config.apiBaseUrl) {
      // --- 真实 LLM 调用 ---
      console.log(`[AI-Service] Using real LLM: ${config.provider} / ${config.modelName}`);
      const systemPrompt = await buildSystemPrompt(customerId, config.systemPrompt);
      const history = await loadConversationHistory(conversationId);
      const rawResponse = await callLLM(config, systemPrompt, history, incomingContent);
      structured = parseLLMStructuredResponse(rawResponse);
    } else {
      // --- Mock 降级 ---
      console.log('[AI-Service] AI model not configured, using mock reply.');
      await new Promise(resolve => setTimeout(resolve, 500));
      structured = getMockReply(incomingContent);
    }

    // 检测财务敏感词 -> 生成审批任务而非直接回复
    const financialKeywords = ['退款', '退钱', '退费', '赔偿', '投诉', '报价', '打折'];
    const isFinancial = structured.financial_sensitive ||
      financialKeywords.some(kw => incomingContent.includes(kw));

    if (isFinancial) {
      const allMessagesText = structured.messages.map(m => m.text).join('\n');
      await prisma.task.create({
        data: {
          customerId,
          title: '财务敏感拦截：需人工审批',
          taskType: 'text',
          content: `客户消息: "${incomingContent}"\n\nAI 拟回复:\n${allMessagesText}\n\n⚠️ 涉及财务关键词，已拦截自动发送，请人工审批后再执行。`,
          triggerSource: 'ai',
          triggerReason: '财务敏感词自动拦截',
          approvalStatus: 'pending',
          executeStatus: 'draft',
          reviewedBy: 'ai',
          reviewNotes: 'AI检测到财务敏感内容，自动路由人工审批',
        }
      });

      // 给客户一个通用安抚回复（不走队列，直接发）
      await prisma.message.create({
        data: {
          conversationId,
          direction: 'outbound',
          senderType: 'ai',
          contentType: 'text',
          content: '亲爱的，您反馈的问题已经帮您转交给专属顾问处理了，她会尽快给您回复哦，请稍等～💕',
        }
      });
      console.log('[AI-Service] Financial keyword detected. Task created for approval.');
      return;
    }

    // 多消息分段发送：通过消息队列逐条延迟发送
    const messages = structured.messages || [{ text: '收到您的消息了～', delay_ms: 0 }];

    if (messages.length === 1) {
      // 只有一条消息，直接保存不走队列
      await prisma.message.create({
        data: {
          conversationId,
          direction: 'outbound',
          senderType: 'ai',
          contentType: 'text',
          content: messages[0].text,
        }
      });
      console.log(`[AI-Service] Single reply saved: "${messages[0].text.substring(0, 50)}..."`);
    } else {
      // 多条消息走队列
      await enqueue(conversationId, messages, async (convId, text, index) => {
        await prisma.message.create({
          data: {
            conversationId: convId,
            direction: 'outbound',
            senderType: 'ai',
            contentType: 'text',
            content: text,
          }
        });
      });
    }

    // ===== AI 洞察回写 =====
    // 将 LLM 返回的 intent_tags 和 suggested_actions 写入数据库
    if (customerId) {
      try {
        await applyAiInsights(customerId, structured);
      } catch (insightErr) {
        console.warn('[AI-Service] Failed to apply AI insights:', insightErr.message);
      }
    }

  } catch (error) {
    console.error('[AI-Service] Error processing inbound message:', error);
  }
}

/**
 * 将 AI 分析结果（意图标签 + 建议动作）回写到数据库
 *
 * - 自动查找或创建 Tag 记录
 * - 关联到 Customer (CustomerTag)
 * - 根据高意向标签动态调整 intentScore
 * - 更新客户的互动时间和沉默天数
 */
async function applyAiInsights(customerId, structured) {
  const intentTags = structured.intent_tags || [];
  const suggestedActions = structured.suggested_actions || [];

  // 1. 回写意图标签
  for (const tagName of intentTags) {
    if (!tagName || tagName.length > 50) continue;

    try {
      // 查找或创建 Tag
      let tag = await prisma.tag.findUnique({ where: { name: tagName } });
      if (!tag) {
        tag = await prisma.tag.create({
          data: {
            name: tagName,
            category: 'intent',
            color: '#1890ff',
          },
        });
        console.log(`[AI-Service] Created new tag: "${tagName}"`);
      }

      // 关联到客户（忽略已存在的）
      await prisma.customerTag.upsert({
        where: {
          customerId_tagId: { customerId, tagId: tag.id },
        },
        create: {
          customerId,
          tagId: tag.id,
          addedBy: 'ai',
        },
        update: {}, // 已存在则不变
      });
    } catch (tagErr) {
      // 静默处理单个标签的写入失败
      console.warn(`[AI-Service] Failed to upsert tag "${tagName}":`, tagErr.message);
    }
  }

  // 2. 根据意图标签动态调整 intentScore
  const highIntentSignals = ['高意向', '预约意向', '购买意向', '立即下单', '复购意向'];
  const mediumIntentSignals = ['效果咨询', '价格咨询', '活动咨询', '对比咨询'];

  const hasHighIntent = intentTags.some(t => highIntentSignals.includes(t));
  const hasMediumIntent = intentTags.some(t => mediumIntentSignals.includes(t));

  const updateData = {
    silentDays: 0,
    lastInteractionAt: new Date(),
  };

  if (hasHighIntent) {
    // 高意向：提升到 4.0-4.5 之间（不覆盖已有的更高分）
    updateData.intentScore = { set: undefined }; // 需要条件更新
  }

  // 3. 更新客户记录
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { intentScore: true },
  });

  if (customer) {
    if (hasHighIntent && customer.intentScore < 4.0) {
      updateData.intentScore = Math.min(4.5, customer.intentScore + 1.0);
    } else if (hasMediumIntent && customer.intentScore < 3.5) {
      updateData.intentScore = Math.min(3.5, customer.intentScore + 0.5);
    }

    // 移除无效的 set 包装
    if (updateData.intentScore && typeof updateData.intentScore === 'object') {
      delete updateData.intentScore;
    }

    await prisma.customer.update({
      where: { id: customerId },
      data: updateData,
    });

    if (intentTags.length > 0) {
      console.log(`[AI-Service] Customer ${customerId} insights applied: tags=[${intentTags.join(',')}], score adjustment=${hasHighIntent ? '+1.0' : hasMediumIntent ? '+0.5' : 'none'}`);
    }
  }

  // 4. 将 suggested_actions 记录到审计日志（供前端展示推荐）
  if (suggestedActions.length > 0) {
    try {
      await prisma.auditLog.create({
        data: {
          entityType: 'customer',
          entityId: customerId,
          action: 'ai_suggestion',
          operator: 'ai',
          reason: `AI建议动作: ${suggestedActions.join('、')}`,
          metadata: JSON.stringify({ intentTags, suggestedActions }),
        },
      });
    } catch (logErr) {
      // 非关键路径，静默处理
    }
  }
}
