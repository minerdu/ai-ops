import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { testConnection } from '@/lib/youzanService';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

/**
 * GET /api/youzan — 获取有赞 CRM 配置（脱敏）
 */
export async function GET() {
  try {
    let config = await prisma.youzanConfig.findUnique({ where: { id: 'default' } });

    if (!config) {
      // 首次访问，创建默认配置
      config = await prisma.youzanConfig.create({
        data: { id: 'default' },
      });
    }

    return NextResponse.json({
      appId: config.appId || '',
      appSecret: config.appSecret ? '••••••••' : '', // 脱敏显示
      shopId: config.shopId || '',
      syncEnabled: config.syncEnabled,
      syncInterval: config.syncInterval,
      lastSyncAt: config.lastSyncAt,
      hasSecret: !!config.appSecret, // 告诉前端是否已配置
    });
  } catch (error) {
    console.error('[Youzan Config] GET error:', error);
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}

/**
 * PUT /api/youzan — 保存有赞 CRM 配置
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const { appId, appSecret, shopId, syncEnabled, syncInterval } = body;

    const updateData = {
      appId: appId || '',
      shopId: shopId || '',
      syncEnabled: syncEnabled ?? false,
      syncInterval: syncInterval || 'daily',
    };

    // 只有当用户实际输入了新的密钥时才更新（非脱敏的占位符）
    if (appSecret && appSecret !== '••••••••' && appSecret.trim() !== '') {
      updateData.appSecret = appSecret;
      // 密钥变更时清除旧 token，强制刷新
      updateData.accessToken = '';
      updateData.tokenExpiry = null;
    }

    const config = await prisma.youzanConfig.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...updateData },
      update: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'CRM 配置已保存',
      appId: config.appId,
      shopId: config.shopId,
      syncEnabled: config.syncEnabled,
      syncInterval: config.syncInterval,
    });
  } catch (error) {
    console.error('[Youzan Config] PUT error:', error);
    return NextResponse.json({ error: '保存配置失败' }, { status: 500 });
  }
}

/**
 * POST /api/youzan — 测试有赞 API 连接
 */
export async function POST() {
  try {
    const result = await testConnection();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Youzan Config] POST (test) error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || '连接测试失败',
    }, { status: 500 });
  }
}
