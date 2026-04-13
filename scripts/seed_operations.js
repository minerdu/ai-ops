const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 开始恢复工作流与审批任务记录...');

  await prisma.task.deleteMany();
  await prisma.sopTemplate.deleteMany();

  // 1. 生成几条核心 SOP 模版
  const sops = [
    { name: '沉睡客户唤醒', needApproval: true, actionDef: '{"type":"message", "content":"好久不见..."}' },
    { name: '高潜线索逼单', needApproval: true, actionDef: '{"type":"combo", "content":"发放优惠券"}' },
    { name: '新客到店邀请', needApproval: false, actionDef: '{"type":"message", "content":"新人礼..."}' },
    { name: '生日祝福推送', needApproval: false, actionDef: '{"type":"message", "content":"生日快乐!"}' }
  ];

  for (const s of sops) {
    await prisma.sopTemplate.create({
      data: {
        name: s.name,
        triggerConditions: '{"event":"auto"}',
        actionDef: s.actionDef,
        needApproval: s.needApproval
      }
    });
  }

  // 2. 生成历史工单 Task (回溯 30 天) + 未来工单 (未来 7 天)
  const customers = await prisma.customer.findMany({ select: { id: true, name: true, memberLevel: true } });
  if (customers.length === 0) { console.log('❌ 数据库没有顾客纪录！'); return; }

  const ALL_TASKS = [];
  const NOW = Date.now();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // 过去30天随机布点
  for (let i = 1; i <= 30; i++) {
    const dailyCount = Math.floor(Math.random() * 8) + 2; // 每天 2 ~ 9 个任务
    const baseTime = NOW - i * MS_PER_DAY;

    for (let j = 0; j < dailyCount; j++) {
      const c = customers[Math.floor(Math.random() * customers.length)];
      
      const isApproved = Math.random() > 0.3; // 70% approval rate
      const executeStatus = isApproved ? 'success' : 'cancelled';

      ALL_TASKS.push({
        customerId: c.id,
        title: `系统自动生成 ${c.name} 的关怀提醒`,
        taskType: Math.random() > 0.5 ? 'combo' : 'text',
        content: `自动化SOP触发记录 (历史)`,
        triggerSource: 'ai-sop',
        approvalStatus: isApproved ? 'approved' : 'rejected',
        rejectReason: isApproved ? null : '客户当前无需求',
        executeStatus: executeStatus,
        createdAt: new Date(baseTime + Math.random() * MS_PER_DAY),
        executedAt: isApproved ? new Date(baseTime + Math.random() * MS_PER_DAY + 60*60*1000) : null
      });
    }
  }

  // 未来 7 天布点 (Scheduled)
  for (let i = 1; i <= 7; i++) {
    const dailyCount = Math.floor(Math.random() * 5) + 3; // 每天 3 ~ 8 个待机任务
    const baseTime = NOW + i * MS_PER_DAY;

    for (let j = 0; j < dailyCount; j++) {
      const c = customers[Math.floor(Math.random() * customers.length)];

      ALL_TASKS.push({
        customerId: c.id,
        title: `[即将执行] ${c.name} 到店周年庆邀约`,
        taskType: 'text',
        content: `待审核的系统未来待办任务`,
        triggerSource: 'ai-sop',
        approvalStatus: 'pending',
        executeStatus: 'scheduled',
        scheduledAt: new Date(baseTime + Math.random() * MS_PER_DAY),
        createdAt: new Date(NOW - Math.random() * 60*60*1000) 
      });
    }
  }

  await prisma.task.createMany({ data: ALL_TASKS });
  
  console.log(`✅ 成功生成 4 个SOP模板 与 ${ALL_TASKS.length} 个跨度为37天的工作流工单！`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
