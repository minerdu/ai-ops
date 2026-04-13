const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 开始修复工作流日期和审批状态...');
  const nullDates = await prisma.task.findMany({ where: { scheduledAt: null } });
  for (const t of nullDates) {
    await prisma.task.update({ where: { id: t.id }, data: { scheduledAt: t.createdAt } });
  }

  // 2. Fix currently pending tasks based on the new rules
  const tasks = await prisma.task.findMany({ where: { approvalStatus: 'pending' } });
  let count = 0;
  for (const t of tasks) {
    const c = t.content || '';
    const needsApproval = c.includes('100') || c.includes('券') || c.includes('活动') || c.includes('大额') || c.includes('财务');
    if (!needsApproval) {
      await prisma.task.update({ 
        where: { id: t.id }, 
        data: { approvalStatus: 'approved', executeStatus: 'scheduled' } 
      });
      count++;
    }
  }
  
  console.log(`✅ 修正了 ${count} 条待办，将其设置为无需审批即刻执行，已匹配最新规则！`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
