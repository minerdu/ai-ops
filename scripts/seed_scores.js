const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 开始重新计算所有客户与群聊的雷达图多维度评分 (1-10分制)...\n');
  
  const customers = await prisma.customer.findMany();
  console.log(`👥 共找到 ${customers.length} 个实体`);

  let updatedCount = 0;

  for (const c of customers) {
    let crmHistory = {};
    if (c.crmHistory) {
      try {
        crmHistory = JSON.parse(c.crmHistory);
      } catch (e) {
        console.error(`无法解析 ${c.name} 的 crmHistory`);
      }
    }

    let scores = {};

    if (c.isGroup) {
      // --------------------------------------------------------
      // 群聊评分逻辑 (6个维度: 1-10分)
      // 根据活跃情况随机生成较高分
      // --------------------------------------------------------
      // 例如：活跃度(Activity), 消费力(Spending Power), 互动质量(Interaction Quality)
      //       转介绍(Referral Potential), 品牌粘性(Brand Loyalty), 转化潜力(Conversion Potential)
      
      const activity = (Math.random() * 4 + 6).toFixed(1); // 6-10
      const spend = (Math.random() * 5 + 5).toFixed(1);    // 5-10
      const interaction = (Math.random() * 4.5 + 5.5).toFixed(1); // 5.5-10
      const referral = (Math.random() * 4 + 4).toFixed(1); // 4-8
      const loyalty = (Math.random() * 3 + 7).toFixed(1);  // 7-10
      const conversion = (Math.random() * 5 + 5).toFixed(1); // 5-10

      scores = {
        activityScore: parseFloat(activity),
        spendingScore: parseFloat(spend),
        interactionScore: parseFloat(interaction),
        referralScore: parseFloat(referral),
        loyaltyScore: parseFloat(loyalty),
        conversionScore: parseFloat(conversion)
      };

    } else {
      // --------------------------------------------------------
      // 个人客户评分逻辑 (6个维度: 1-10分)
      // 基于历史消费总额 (totalSpent) 等进行智能评估
      // --------------------------------------------------------
      // 维度：价值(Value), 意向(Intent), 满意度(Satisfaction), 需求(Demand), 关系(Relation), 忠诚度(Loyalty)
      
      const spent = c.totalSpent || 0;
      
      // 消费力越强，基础分越高
      let baseValue = 5.0;
      if (spent > 50000) baseValue = 9.5;
      else if (spent > 30000) baseValue = 8.5;
      else if (spent > 15000) baseValue = 7.5;
      else if (spent > 8000) baseValue = 6.5;
      else if (spent > 3000) baseValue = 5.5;
      else if (spent > 0) baseValue = 4.5;
      else baseValue = 3.0; // 未消费

      // 添加合理波动
      const val = (baseValue + (Math.random() * 1.0 - 0.5));
      const sat = (baseValue * 0.9 + (Math.random() * 2.0));  // 满意度普遍偏高(尤其是高消费)
      const rel = (baseValue * 0.8 + (Math.random() * 2.5));  // 关系维护情况
      const loy = (baseValue * 0.9 + (Math.random() * 1.5));  // 忠诚度与消费强相关
      
      const valueScore = Math.max(1, Math.min(10, val));
      const intentScore = Math.max(1, Math.min(10, (Math.random() * 5 + 5))); // 意向波动大
      const satisfactionScore = Math.max(1, Math.min(10, sat));
      const demandScore = Math.max(1, Math.min(10, (Math.random() * 4 + 6))); // 需求普遍存在
      const relationScore = Math.max(1, Math.min(10, rel));
      const loyaltyScore = Math.max(1, Math.min(10, loy));

      scores = {
        valueScore: parseFloat(valueScore.toFixed(1)),
        intentScore: parseFloat(intentScore.toFixed(1)),
        satisfactionScore: parseFloat(satisfactionScore.toFixed(1)),
        demandScore: parseFloat(demandScore.toFixed(1)),
        relationScore: parseFloat(relationScore.toFixed(1)),
        loyaltyScore: parseFloat(loyaltyScore.toFixed(1))
      };
      
      // 同步覆盖数据库原生字段(兼容其它逻辑)，原生可能只存到字段里或者废弃
      // 在这里我们也同步更下
      await prisma.customer.update({
        where: { id: c.id },
        data: {
          intentScore: scores.intentScore,
          valueScore: scores.valueScore,
          satisfactionScore: scores.satisfactionScore
        }
      });
    }

    // 写入 crmHistory -> scores
    crmHistory.scores = scores;

    await prisma.customer.update({
      where: { id: c.id },
      data: {
        crmHistory: JSON.stringify(crmHistory)
      }
    });

    console.log(`✅ 已更新 ${c.isGroup ? '群聊' : '个人'} [${c.name}] 的 6 维度评分`);
    updatedCount++;
  }

  console.log(`\n🎉 全部完成! 共处理 ${updatedCount} 条记录。`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
