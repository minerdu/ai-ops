const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const msgCount = await p.message.count();
  const convCount = await p.conversation.count();
  const custCount = await p.customer.count();
  console.log(`Messages: ${msgCount}, Conversations: ${convCount}, Customers: ${custCount}`);
  
  // Show a sample message
  const sample = await p.message.findFirst({ orderBy: { createdAt: 'desc' } });
  if (sample) {
    console.log('Sample message:', JSON.stringify(sample, null, 2));
  } else {
    console.log('No messages found in database.');
  }
}

main().catch(console.error).finally(() => p.$disconnect());
