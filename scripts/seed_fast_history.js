const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

async function getLLMConfig() {
  const config = await prisma.aiModelConfig.findUnique({ where: { id: 'default' } });
  if (!config) throw new Error('AI Model is not properly configured.');
  return config;
}

async function callLLM(config, prompt, temperature = 0.7) {
  const baseUrl = config.apiBaseUrl.replace(/\/+$/, '');
  const isAzure = baseUrl.includes('.openai.azure.com');

  let url, headers;
  if (isAzure) {
    const apiVersion = '2024-08-01-preview';
    url = `${baseUrl}/openai/deployments/${config.modelName}/chat/completions?api-version=${apiVersion}`;
    headers = { 'Content-Type': 'application/json', 'api-key': config.apiKey };
  } else {
    url = `${baseUrl}/chat/completions`;
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` };
  }

  const body = { messages: [{ role: 'user', content: prompt }], temperature };
  if (isAzure) body.max_completion_tokens = 4000;
  else { body.max_tokens = 4000; body.model = config.modelName || 'gpt-3.5-turbo'; }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`LLM Error ${res.status}: ${await res.text()}`);

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseJSON(text) {
  try {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1) return JSON.parse(text.substring(start, end + 1));
    return JSON.parse(text);
  } catch (e) { return null; }
}

async function generateHistory() {
  console.log('[Script] Starting Template-Cycling History Generator...');
  const config = await getLLMConfig();
  const customers = await prisma.customer.findMany();
  await prisma.message.deleteMany();

  const groupPrompt = `你现在需要为一个美业门店微信群伪造 60 条连续历史记录数组。包含 senderName("AI助理" 或客人昵称), role("user"或"ai"), text。纯原生的 JSON Array。`;
  const personalPrompt = `你现在需要为美业一对一伪造 40 条历史对话。包含 senderName("{{CUSTOMER_NAME}}"或"AI助理"), role("user"或"ai"), text。连续的多轮对话。纯原生 JSON Array。`;

  console.log('Fetching Templates...');
  let groupTpl = parseJSON(await callLLM(config, groupPrompt, 0.8)) || [];
  let personalTpl = parseJSON(await callLLM(config, personalPrompt, 0.8)) || [];
  if (!groupTpl.length || !personalTpl.length) throw new Error('Failed to fetch templates');

  let allInserts = [];
  
  for (let c of customers) {
    let targetCount = 0;
    if (c.isGroup) {
      targetCount = 50 + Math.floor(Math.random() * 50); // 50-100 for groups
    } else {
      let visitCount = 0;
      if (c.crmHistory) {
        try { const crm = JSON.parse(c.crmHistory); visitCount = crm.visitCount || 0; } catch(e){}
      }
      if (visitCount === 0) targetCount = Math.floor(Math.random() * 5) + 3; // Unconverted: 3-8 limits
      else targetCount = Math.min((visitCount * 10) + Math.floor(Math.random() * 20), 400); // 24 visits -> ~250 msgs
    }

    let conversation = await prisma.conversation.findFirst({ where: { customerId: c.id } });
    if (!conversation) conversation = await prisma.conversation.create({ data: { customerId: c.id } });

    let tpl = c.isGroup ? groupTpl : personalTpl;
    let baseTime = Date.now() - ( (targetCount > 50 ? 90 : 7) * 24 * 60 * 60 * 1000); // spread across 90 days if huge count
    const timeDelta = ((Date.now() - baseTime) / targetCount);

    let templateIndex = 0;
    for (let i = 0; i < targetCount; i++) {
      let msg = tpl[templateIndex % tpl.length];
      templateIndex++;

      let sText = msg.text;
      let role = msg.role;
      if (!c.isGroup) { sText = sText.replace(/{{CUSTOMER_NAME}}/g, c.name); }
      
      baseTime += timeDelta * (0.5 + Math.random() * 1.0);
      
      allInserts.push({
        id: crypto.randomUUID(),
        conversationId: conversation.id,
        direction: role === 'ai' ? 'outbound' : 'inbound',
        contentType: 'text',
        content: sText + (i > tpl.length ? '...' : ''), // Small variation logic
        senderType: role === 'ai' ? 'ai' : 'customer',
        createdAt: new Date(baseTime),
        status: 'sent'
      });
    }
  }

  // Insert in batches of 1000
  for (let i=0; i<allInserts.length; i+=1000) {
    await prisma.message.createMany({ data: allInserts.slice(i, i+1000) });
  }
  
  console.log(`\n[✓] DONE! Inserted ${allInserts.length} total matched messages.`);
}

generateHistory().catch(console.error).finally(() => prisma.$disconnect());
