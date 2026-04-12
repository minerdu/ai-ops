/**
 * 安全规则 API 路由
 * 
 * 管理 SafetyRule 表的 CRUD 操作
 * 规则类型：stop_keyword, journey_block, financial_keyword, daily_limit
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - 获取所有安全规则
export async function GET() {
  try {
    const rules = await prisma.safetyRule.findMany({
      orderBy: [
        { ruleType: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // 按类型分组
    const grouped = {
      stop_keywords: rules.filter(r => r.ruleType === 'stop_keyword'),
      financial_keywords: rules.filter(r => r.ruleType === 'financial_keyword'),
      journey_blocks: rules.filter(r => r.ruleType === 'journey_block'),
      daily_limit: rules.find(r => r.ruleType === 'daily_limit') || { value: '100', isActive: true },
    };

    return NextResponse.json(grouped);
  } catch (error) {
    console.error('[Safety Rules] GET error:', error);
    return NextResponse.json({ error: 'Failed to load rules' }, { status: 500 });
  }
}

// POST - 添加新安全规则
export async function POST(request) {
  try {
    const { ruleType, value } = await request.json();

    if (!ruleType || !value) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const validTypes = ['stop_keyword', 'financial_keyword', 'journey_block', 'daily_limit'];
    if (!validTypes.includes(ruleType)) {
      return NextResponse.json({ error: '无效的规则类型' }, { status: 400 });
    }

    // daily_limit 只能有一条，做 upsert
    if (ruleType === 'daily_limit') {
      const existing = await prisma.safetyRule.findFirst({ where: { ruleType: 'daily_limit' } });
      if (existing) {
        const updated = await prisma.safetyRule.update({
          where: { id: existing.id },
          data: { value },
        });
        return NextResponse.json(updated);
      }
    }

    // 检查是否重复
    const exists = await prisma.safetyRule.findFirst({
      where: { ruleType, value },
    });
    if (exists) {
      return NextResponse.json({ error: '该规则已存在' }, { status: 409 });
    }

    const rule = await prisma.safetyRule.create({
      data: { ruleType, value },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error('[Safety Rules] POST error:', error);
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
  }
}

// PUT - 更新规则状态（启用/停用）
export async function PUT(request) {
  try {
    const { id, isActive } = await request.json();

    if (!id) {
      return NextResponse.json({ error: '缺少规则ID' }, { status: 400 });
    }

    const rule = await prisma.safetyRule.update({
      where: { id },
      data: { isActive: isActive ?? true },
    });

    return NextResponse.json(rule);
  } catch (error) {
    console.error('[Safety Rules] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 });
  }
}

// DELETE - 删除规则
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少规则ID' }, { status: 400 });
    }

    await prisma.safetyRule.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Safety Rules] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
  }
}
