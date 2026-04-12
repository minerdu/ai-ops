const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

const wait = (ms) => new Promise(res => setTimeout(res, ms));

async function getLLMConfig() {
  const config = await prisma.aiModelConfig.findUnique({ where: { id: 'default' } });
  if (!config || !config.apiKey || !config.apiBaseUrl) {
    throw new Error('AI Model is not properly configured in the database (API Key or Base URL missing).');
  }
  return config;
}

async function callLLM(config, prompt, temperature = 0.7) {
  const baseUrl = config.apiBaseUrl.replace(/\/+$/, '');
  const isAzure = baseUrl.includes('.openai.azure.com');

  let url, headers;
  if (isAzure) {
    const apiVersion = '2024-08-01-preview';
    url = `${baseUrl}/openai/deployments/${config.modelName}/chat/completions?api-version=${apiVersion}`;
    headers = {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    };
  } else {
    url = `${baseUrl}/chat/completions`;
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    };
  }

  const body = {
    messages: [{ role: 'user', content: prompt }],
    temperature,
  };

  if (isAzure) {
    body.max_completion_tokens = 4000;
  } else {
    body.max_tokens = 4000;
    body.model = config.modelName || 'gpt-3.5-turbo';
  }

  // Use proxy if configured in environment
  const fetchOptions = {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  };

  const res = await fetch(url, fetchOptions);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM Error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  return text;
}

function parseJSON(text) {
  try {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
      return JSON.parse(text.substring(start, end + 1));
    }
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

async function generateHistory() {
  console.log('[Script] Starting LLM History Seed...');
  const config = await getLLMConfig();
  console.log(`[Script] Loaded AI Config: ${config.modelName} via ${config.apiBaseUrl}`);

  const customers = await prisma.customer.findMany();
  console.log(`[Script] Found ${customers.length} total customers/groups.`);

  // Clear existing messages
  await prisma.message.deleteMany();
  console.log('[Script] Cleared existing messages table.');

  for (let i = 0; i < customers.length; i++) {
    const c = customers[i];
    console.log(`\n[${i + 1}/${customers.length}] Generating for ${c.isGroup ? 'Group' : 'Direct'}: ${c.name} (${c.id})`);

    const count = c.isGroup ? 50 : Math.floor(Math.random() * 21) + 10; // Group: 50, Individual: 10~30
    
    const prompt = c.isGroup 
      ? `你现在需要为美业门店的一个微信群聊（群名：${c.name}）伪造 ${count} 条逼真的历史聊天记录数组。
群聊场景：里面有几位经常聊天的VIP客人（请给她们起随机但不违和的微信昵称如“王姐”、“Linda”、“小熊”），讨论抗衰、预约排班或者店里的服务体验，偶尔有门店AI助理（角色为 "AI助理"）出来做公告、答疑或发引导。
【规则】
1. 完全返回原生 JSON Array，不要加任何包裹和 markdown 语法。
2. JSON 数组中每个对象包含: 
   - senderName: 说话人的名字，如果是AI必须叫 "AI助理"
   - role: 如果是顾客则为 "user"，如果是AI则是 "ai"
   - text: 说话的内容
3. 大部分是 user 的发言互相聊天，只有少量（约10%）是 ai 的公告/回复。
4. 按时间正序排列（从早到晚）。`

      : `你现在需要为美业门店的私人聊天（客户：${c.name}）伪造 ${count} 条逼真的客服对历史话记录数组。
场景：高转化的美业顾问（AI或客服）与顾客进行的一对一深度咨询对答。可能涉及项目咨询、团单核销核验、术后关怀、日常维系等。
【规则】
1. 完全返回原生 JSON Array，不要加任何包裹和 markdown 语法。
2. JSON 数组中每个对象包含:
   - senderName: "${c.name}" 或 "AI助理"
   - role: "user" 或 "ai"
   - text: 说话的内容
3. 双方你来我往，时而连发几句。
4. 按时间正序排列（从早到晚）。`;

    let retryCount = 0;
    let messagesObj = null;

    while (retryCount < 3) {
      try {
        const resultText = await callLLM(config, prompt);
        messagesObj = parseJSON(resultText);
        if (messagesObj && Array.isArray(messagesObj) && messagesObj.length > 5) break;
        throw new Error('Invalid JSON format or insufficient chunks returned.');
      } catch (err) {
        retryCount++;
        console.error(`  [!] Try ${retryCount} failed: ${err.message}`);
        await wait(2000);
      }
    }

    if (!messagesObj) {
      console.log(`  [X] Skipped ${c.name} due to repeated LLM generation failures.`);
      continue;
    }

    // Now insert them with fake timestamps
    let baseTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // Start 7 days ago
    
    // Smooth time spread out across the count
    const timeDelta = (7 * 24 * 60 * 60 * 1000) / count;

    // Get or create conversation for customer
    let conversation = await prisma.conversation.findFirst({ where: { customerId: c.id } });
    if (!conversation) {
      conversation = await prisma.conversation.create({ data: { customerId: c.id } });
    }

    let inserts = [];
    for (let msg of messagesObj) {
      baseTime += timeDelta * (0.8 + Math.random() * 0.4); // Add some jitter
      inserts.push({
        id: crypto.randomUUID(),
        conversationId: conversation.id,
        direction: msg.role === 'ai' ? 'outbound' : 'inbound',
        contentType: 'text',
        content: msg.text,
        senderType: msg.role === 'ai' ? 'ai' : 'customer',
        createdAt: new Date(baseTime),
        status: 'sent'
      });
    }

    // Prisma batch create
    await prisma.message.createMany({ data: inserts });
    
    console.log(`  [✓] Inserted ${inserts.length} messages smoothly.`);

    // Wait slightly to avoid ratelimits
    await wait(1000);
  }

  console.log('\n[Script] Generation Complete!');
}

generateHistory()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
