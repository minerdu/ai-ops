const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.customer.updateMany({ where: { assignedToId: 'WeClaw-AI顾问1' }, data: { assignedToId: 'sub_1' }});
  await prisma.customer.updateMany({ where: { assignedToId: 'WeClaw-AI顾问2' }, data: { assignedToId: 'sub_2' }});
  await prisma.customer.updateMany({ where: { assignedToId: 'WeClaw-AI顾问3' }, data: { assignedToId: 'sub_3' }});
  console.log('✅ IDs Mapped Successfully');
}
main().finally(() => prisma.$disconnect());
