const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function c() {
  const t = await p.task.count();
  const a = await p.auditLog.count();
  console.log('Tasks: ' + t + ' AuditLogs: ' + a);
}
c().finally(() => p.$disconnect());
