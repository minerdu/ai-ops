import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { syncAllCustomers } from '@/lib/youzanService';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

// 简单的同步锁，防止重复触发
let isSyncing = false;
let lastSyncResult = null;

/**
 * GET /api/youzan/sync — 获取同步状态和历史
 */
export async function GET() {
  try {
    const config = await prisma.youzanConfig.findUnique({ where: { id: 'default' } });

    return NextResponse.json({
      isSyncing,
      lastSyncAt: config?.lastSyncAt || null,
      lastSyncResult,
    });
  } catch (error) {
    console.error('[Youzan Sync] GET error:', error);
    return NextResponse.json({ error: '获取同步状态失败' }, { status: 500 });
  }
}

/**
 * POST /api/youzan/sync — 手动触发从有赞 CRM 同步客户数据
 */
export async function POST() {
  if (isSyncing) {
    return NextResponse.json({
      success: false,
      message: '同步正在进行中，请稍后再试',
    }, { status: 409 });
  }

  try {
    isSyncing = true;

    // 检查配置是否完整
    const config = await prisma.youzanConfig.findUnique({ where: { id: 'default' } });
    if (!config || !config.appId || !config.appSecret) {
      isSyncing = false;
      return NextResponse.json({
        success: false,
        message: '请先配置有赞 CRM 的 App ID 和 App Secret',
      }, { status: 400 });
    }

    // 执行同步
    const result = await syncAllCustomers();
    lastSyncResult = result;
    isSyncing = false;

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `同步完成！获取 ${result.totalFetched} 个客户，新增 ${result.totalCreated}，更新 ${result.totalUpdated}`
        : `同步完成但有错误：${result.errors.length} 个错误`,
      ...result,
    });
  } catch (error) {
    isSyncing = false;
    console.error('[Youzan Sync] POST error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || '同步失败',
    }, { status: 500 });
  }
}
