import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Load AI model config
export async function GET() {
  try {
    let config = await prisma.aiModelConfig.findUnique({ where: { id: 'default' } });
    if (!config) {
      config = await prisma.aiModelConfig.create({
        data: { id: 'default' }
      });
    }
    // Mask API key for security (only show last 6 chars)
    const maskedKey = config.apiKey
      ? '••••••••' + config.apiKey.slice(-6)
      : '';
    return NextResponse.json({
      ...config,
      apiKeyMasked: maskedKey,
      apiKey: undefined, // Never send full key to frontend
    });
  } catch (error) {
    console.error('Failed to load AI model config:', error);
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 });
  }
}

// PUT - Save AI model config
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      provider, apiBaseUrl, apiKey, modelName, temperature, maxTokens, systemPrompt, enabled,
      kbSource, kbId, kbApiUrl,
      enableSegment, segmentMaxChars, segmentCount, segmentTriggerChars,
      segmentModelName, segmentModelApiUrl, segmentModelApiKey,
      sendInterval, stopKeywords, smartSkipMode, imageAnalysis
    } = body;

    const data = {};
    if (provider !== undefined) data.provider = provider;
    if (apiBaseUrl !== undefined) data.apiBaseUrl = apiBaseUrl;
    if (modelName !== undefined) data.modelName = modelName;
    if (temperature !== undefined) data.temperature = parseFloat(temperature);
    if (maxTokens !== undefined) data.maxTokens = parseInt(maxTokens, 10);
    if (systemPrompt !== undefined) data.systemPrompt = systemPrompt;
    if (enabled !== undefined) data.enabled = enabled;
    
    // Knowledge Base fields
    if (kbSource !== undefined) data.kbSource = kbSource;
    if (kbId !== undefined) data.kbId = kbId;
    if (kbApiUrl !== undefined) data.kbApiUrl = kbApiUrl;

    // Segmentation fields
    if (enableSegment !== undefined) data.enableSegment = enableSegment;
    if (segmentMaxChars !== undefined) data.segmentMaxChars = parseInt(segmentMaxChars, 10);
    if (segmentCount !== undefined) data.segmentCount = parseInt(segmentCount, 10);
    if (segmentTriggerChars !== undefined) data.segmentTriggerChars = parseInt(segmentTriggerChars, 10);
    if (segmentModelName !== undefined) data.segmentModelName = segmentModelName;
    if (segmentModelApiUrl !== undefined) data.segmentModelApiUrl = segmentModelApiUrl;
    // Update API keys properly securely
    if (segmentModelApiKey && !segmentModelApiKey.startsWith('••••')) {
      data.segmentModelApiKey = segmentModelApiKey;
    }

    // Advanced fields
    if (sendInterval !== undefined) data.sendInterval = parseFloat(sendInterval);
    if (stopKeywords !== undefined) data.stopKeywords = stopKeywords;
    if (smartSkipMode !== undefined) data.smartSkipMode = smartSkipMode;
    if (imageAnalysis !== undefined) data.imageAnalysis = imageAnalysis;

    // Only update API key if a real new key is provided (not the masked placeholder)
    if (apiKey && !apiKey.startsWith('••••')) {
      data.apiKey = apiKey;
    }

    const config = await prisma.aiModelConfig.upsert({
      where: { id: 'default' },
      update: data,
      create: { id: 'default', ...data },
    });

    return NextResponse.json({ success: true, enabled: config.enabled });
  } catch (error) {
    console.error('Failed to save AI model config:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}

// POST - Test connection
export async function POST(request) {
  try {
    const config = await prisma.aiModelConfig.findUnique({ where: { id: 'default' } });
    if (!config || !config.apiKey || !config.apiBaseUrl) {
      return NextResponse.json({ success: false, message: '请先填写完整的 API 配置信息' });
    }

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
      messages: [{ role: 'user', content: '你好，请回复"连接成功"四个字。' }],
      temperature: 0,
    };
    // Azure 新版模型用 max_completion_tokens，标准用 max_tokens
    if (isAzure) {
      body.max_completion_tokens = 20;
    } else {
      body.max_tokens = 20;
      body.model = config.modelName || 'gpt-3.5-turbo';
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ success: false, message: `API 返回错误 (${res.status}): ${errText.substring(0, 200)}` });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || '(无回复)';
    return NextResponse.json({ success: true, message: `连接成功! AI 回复: "${reply}"` });
  } catch (error) {
    return NextResponse.json({ success: false, message: `连接失败: ${error.message}` });
  }
}
