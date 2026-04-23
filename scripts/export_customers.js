/**
 * 客户数据导出脚本
 * 导出所有客户数据（含标签、会话、任务）为 JSON 和 CSV 格式
 * 用于导入有赞 CRM 系统
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportCustomers() {
  console.log('📦 开始导出客户数据...\n');

  // 1. 导出客户完整数据（含关联）
  const customers = await prisma.customer.findMany({
    include: {
      tags: {
        include: {
          tag: true
        }
      },
      conversations: {
        include: {
          messages: true
        }
      },
      tasks: true
    }
  });

  console.log(`✅ 找到 ${customers.length} 条客户记录\n`);

  // 2. 导出标签数据
  const tags = await prisma.tag.findMany();
  console.log(`✅ 找到 ${tags.length} 条标签记录\n`);

  // 3. 构建导出目录
  const exportDir = path.join(__dirname, '..', 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // ── 导出完整 JSON（含所有关联数据）──
  const fullExport = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    summary: {
      totalCustomers: customers.length,
      totalTags: tags.length,
      totalConversations: customers.reduce((sum, c) => sum + c.conversations.length, 0),
      totalMessages: customers.reduce((sum, c) => sum + c.conversations.reduce((s, conv) => s + conv.messages.length, 0), 0),
      totalTasks: customers.reduce((sum, c) => sum + c.tasks.length, 0)
    },
    tags: tags,
    customers: customers
  };

  const jsonPath = path.join(exportDir, `customers_full_${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(fullExport, null, 2), 'utf-8');
  console.log(`📄 完整数据已导出: ${jsonPath}`);

  // ── 导出客户基本信息 CSV（用于 CRM 导入）──
  const csvHeaders = [
    'id',
    'name',
    'phone',
    'wechatId',
    'source',
    'lifecycleStatus',
    'intentScore',
    'valueScore',
    'satisfactionScore',
    'silentDays',
    'memberLevel',
    'totalSpent',
    'orderCount',
    'lastOrderAt',
    'aiSummary',
    'lastInteractionAt',
    'lastKeyQuestion',
    'tags',
    'crmHistory',
    'createdAt'
  ];

  const csvRows = customers.map(c => {
    const tagNames = c.tags.map(ct => ct.tag.name).join(';');
    return [
      c.id,
      escapeCsv(c.name),
      c.phone || '',
      c.wechatId || '',
      c.source,
      c.lifecycleStatus,
      c.intentScore,
      c.valueScore,
      c.satisfactionScore,
      c.silentDays,
      c.memberLevel || '',
      c.totalSpent,
      c.orderCount,
      c.lastOrderAt || '',
      escapeCsv(c.aiSummary || ''),
      c.lastInteractionAt || '',
      escapeCsv(c.lastKeyQuestion || ''),
      escapeCsv(tagNames),
      escapeCsv(c.crmHistory || ''),
      c.createdAt
    ].join(',');
  });

  const csvContent = '\uFEFF' + csvHeaders.join(',') + '\n' + csvRows.join('\n');
  const csvPath = path.join(exportDir, `customers_crm_${timestamp}.csv`);
  fs.writeFileSync(csvPath, csvContent, 'utf-8');
  console.log(`📊 CRM导入用CSV已导出: ${csvPath}`);

  // ── 导出有赞CRM格式的JSON（精简版，适合API导入）──
  const youzanFormat = customers.map(c => ({
    name: c.name,
    mobile: c.phone || '',
    weixin_openid: c.wechatId || '',
    tags: c.tags.map(ct => ct.tag.name),
    source: c.source,
    level: c.memberLevel || '',
    total_spent: c.totalSpent,
    order_count: c.orderCount,
    lifecycle_status: c.lifecycleStatus,
    intent_score: c.intentScore,
    value_score: c.valueScore,
    satisfaction_score: c.satisfactionScore,
    silent_days: c.silentDays,
    ai_summary: c.aiSummary || '',
    last_interaction_at: c.lastInteractionAt,
    last_key_question: c.lastKeyQuestion || '',
    crm_history: c.crmHistory ? JSON.parse(c.crmHistory) : null,
    local_id: c.id,
    created_at: c.createdAt
  }));

  const youzanPath = path.join(exportDir, `customers_youzan_${timestamp}.json`);
  fs.writeFileSync(youzanPath, JSON.stringify(youzanFormat, null, 2), 'utf-8');
  console.log(`🏪 有赞CRM格式已导出: ${youzanPath}`);

  // ── 打印摘要 ──
  console.log('\n' + '═'.repeat(50));
  console.log('📋 导出摘要');
  console.log('═'.repeat(50));
  console.log(`  客户总数:   ${customers.length}`);
  console.log(`  标签总数:   ${tags.length}`);
  console.log(`  会话总数:   ${fullExport.summary.totalConversations}`);
  console.log(`  消息总数:   ${fullExport.summary.totalMessages}`);
  console.log(`  任务总数:   ${fullExport.summary.totalTasks}`);
  console.log('═'.repeat(50));
  console.log('\n导出文件:');
  console.log(`  1. 完整数据 (JSON): ${jsonPath}`);
  console.log(`  2. CRM导入 (CSV):   ${csvPath}`);
  console.log(`  3. 有赞格式 (JSON): ${youzanPath}`);
  console.log('\n✅ 导出完成!\n');

  // Print customer list preview
  console.log('── 客户列表预览 ──');
  customers.forEach((c, i) => {
    const tagStr = c.tags.map(ct => ct.tag.name).join(', ');
    console.log(`  ${i + 1}. ${c.name} | ${c.lifecycleStatus} | 意向:${c.intentScore} | 价值:${c.valueScore} | 消费:¥${c.totalSpent} | 标签:[${tagStr}]`);
  });

  await prisma.$disconnect();
}

function escapeCsv(str) {
  if (!str) return '';
  const s = String(str);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

exportCustomers().catch(e => {
  console.error('❌ 导出失败:', e);
  prisma.$disconnect();
  process.exit(1);
});
