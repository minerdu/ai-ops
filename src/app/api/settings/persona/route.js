import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET current persona settings
export async function GET() {
  try {
    // Get the first user's settings (single-tenant MVP)
    const user = await prisma.user.findFirst({
      include: { settings: true }
    });

    if (!user || !user.settings) {
      // Return defaults if no settings exist yet
      return NextResponse.json({
        companyName: '蔚为科技',
        roleDefinition: '',
        taskWorkflow: '',
        edgeCases: '',
        formatRules: '',
      });
    }

    const s = user.settings;
    return NextResponse.json({
      companyName: s.companyName,
      roleDefinition: s.roleDefinition,
      taskWorkflow: s.taskWorkflow,
      edgeCases: s.edgeCases,
      formatRules: s.formatRules,
    });
  } catch (error) {
    console.error('Error fetching persona settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT to save/update persona settings
export async function PUT(request) {
  try {
    const body = await request.json();
    const { companyName, roleDefinition, taskWorkflow, edgeCases, formatRules } = body;

    // Find or create default user (single-tenant MVP)
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          username: 'admin',
          password: 'admin',
          name: '管理员',
          role: 'admin',
        }
      });
    }

    // Upsert persona settings
    const settings = await prisma.personaSetting.upsert({
      where: { userId: user.id },
      update: {
        companyName: companyName || '蔚为科技',
        roleDefinition: roleDefinition || '',
        taskWorkflow: taskWorkflow || '',
        edgeCases: edgeCases || '',
        formatRules: formatRules || '',
      },
      create: {
        userId: user.id,
        companyName: companyName || '蔚为科技',
        roleDefinition: roleDefinition || '',
        taskWorkflow: taskWorkflow || '',
        edgeCases: edgeCases || '',
        formatRules: formatRules || '',
      }
    });

    return NextResponse.json({
      companyName: settings.companyName,
      roleDefinition: settings.roleDefinition,
      taskWorkflow: settings.taskWorkflow,
      edgeCases: settings.edgeCases,
      formatRules: settings.formatRules,
    });
  } catch (error) {
    console.error('Error saving persona settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
