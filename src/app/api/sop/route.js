import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const templatesRaw = await prisma.sopTemplate.findMany({
      orderBy: { updatedAt: 'desc' }
    });

    const templates = templatesRaw.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      icon: t.icon,
      isActive: t.isActive,
      needApproval: t.needApproval,
      triggerConditions: t.triggerConditions ? JSON.parse(t.triggerConditions) : {},
      action: t.action ? JSON.parse(t.action) : {},
      stats: { triggered: t.statsTriggered, approved: t.statsApproved, replied: t.statsReplied },
      updatedAt: t.updatedAt
    }));

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching SOP templates:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, isActive } = body;

    if (!id || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const updated = await prisma.sopTemplate.update({
      where: { id },
      data: { isActive }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating SOP template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
