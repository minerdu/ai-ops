const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing tasks...');
  await prisma.task.deleteMany();

  console.log('Fetching beauty salon female customers...');
  const customers = await prisma.customer.findMany({ take: 10, where: { isGroup: false } });

  if (customers.length < 5) {
    console.log('Not enough customers found. Run seed.js first.');
    return;
  }

  console.log('Creating full automation model tasks (Financial = Pending, Operational = Executed)...');
  
  // -------------------------------------------------------------
  // PENDING (待审批) - Strictly Financial / Excessive Permissions
  // -------------------------------------------------------------
  await prisma.task.create({
    data: {
      customerId: customers[0].id,
      title: '大额代金券定向发放审批',
      taskType: 'text',
      content: '申请原因：该顾客年卡将于下月到期且近期咨询了价值1.8w的面部提拉新疗程。\n申请权限：定向推送【两千元超额专属抵用券】作为续转诱饵。（超出AI常规300元权限）',
      triggerSource: 'ai',
      triggerReason: '高意向捕捉+年卡续费空档期',
      approvalStatus: 'pending',
      executeStatus: 'draft'
    }
  });

  await prisma.task.create({
    data: {
      customerId: customers[1].id,
      title: '私密养护套餐特殊退单申请',
      taskType: 'text',
      content: '申请原因：该顾客确诊备孕成功，申请将已耗卡2次的疗程无责退掉。\n处理建议：AI基于《意外孕期保命条款》建议走退款绿色审批通道，请财务主管放行。',
      triggerSource: 'manual',
      triggerReason: '触达底层风控与财务预警系统',
      approvalStatus: 'pending',
      executeStatus: 'draft'
    }
  });

  await prisma.task.create({
    data: {
      customerId: customers[2].id,
      title: '高赔率售后客诉安抚折让',
      taskType: 'combo',
      content: '顾客反馈全身精油开背因推拿力度过大致使局部青紫。\n预案：除立刻开启7*24h专属理疗师跟进外，申请一次【千元全身SPA免费免单名额】消除客诉风险。',
      triggerSource: 'ai',
      triggerReason: '风险词库触发【淤青、不舒服、推拿太重】',
      approvalStatus: 'pending',
      executeStatus: 'draft'
    }
  });

  // -------------------------------------------------------------
  // EXECUTED (已执行) - Fully Automated Operational Follow-ups
  // -------------------------------------------------------------
  await prisma.task.create({
    data: {
      customerId: customers[3].id,
      title: '[自动] 图文素材投喂：秋季补水盲区',
      taskType: 'image',
      content: '系统已成功依据该高潜客户的肌肤缺水模型，自动投放《初秋角质层维护及补水指南.jpg》。',
      triggerSource: 'sop',
      triggerReason: '【日常促活SOP】自动执行',
      approvalStatus: 'approved',
      executeStatus: 'success',
      executedAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
    }
  });

  await prisma.task.create({
    data: {
      customerId: customers[4].id,
      title: '[自动] 疗程预约自动排期确认',
      taskType: 'text',
      content: '系统已依据对话“明天下午有空”，全自动调用门店排插板并成功预留位置，预约单已下发。',
      triggerSource: 'ai',
      triggerReason: '闲聊意图转向【直接预约】',
      approvalStatus: 'approved',
      executeStatus: 'success',
      executedAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
    }
  });

  await prisma.task.create({
    data: {
      customerId: customers[5].id,
      title: '[自动] 沉默客户限时盲盒促活',
      taskType: 'image',
      content: '系统探测到客户沉默超14天，自动抛出【盲盒抽奖大转盘】微前端卡片进行破冰激活。',
      triggerSource: 'ai',
      triggerReason: '生命周期阈值到达【休眠期】',
      approvalStatus: 'approved',
      executeStatus: 'success',
      executedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    }
  });

  // -------------------------------------------------------------
  // SCHEDULED (待执行) - Automated but Queued Timers
  // -------------------------------------------------------------
  await prisma.task.create({
    data: {
      customerId: customers[6].id,
      title: '[定时触发] 生日周特别慰问',
      taskType: 'combo',
      content: '系统预测下周二是客户生日，已自动编排温馨贺卡+500积分自动入库通知。',
      triggerSource: 'ai',
      triggerReason: '客户数字资产库预警【临近生日】',
      approvalStatus: 'approved',
      executeStatus: 'scheduled',
      scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000)
    }
  });

  await prisma.task.create({
    data: {
      customerId: customers[7].id,
      title: '[定时触发] 次卡耗尽警告与续充预热',
      taskType: 'text',
      content: '该客户的面部提拉卡即将见底（剩余1次），系统排定客户离店后3小时发送特惠内购续转方案。',
      triggerSource: 'sop',
      triggerReason: '余额预警自动防流失预警',
      approvalStatus: 'approved',
      executeStatus: 'scheduled',
      scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
    }
  });

  // -------------------------------------------------------------
  // REJECTED (已驳回) - Historical Overturned Financial Requests
  // -------------------------------------------------------------
  await prisma.task.create({
    data: {
      customerId: customers[8].id,
      title: '强推终身VIP黑卡申请',
      taskType: 'text',
      content: 'AI预警到全网最强消费力，提议赠与【终身不限次黑卡】。已由主管拦截撤销，避免破坏价格梯队体系。',
      triggerSource: 'ai',
      triggerReason: '客户画像总分爆表',
      approvalStatus: 'rejected',
      executeStatus: 'draft',
      rejectReason: '拒绝滥发高级别黑卡，暂缓执行。'
    }
  });

  await prisma.task.create({
    data: {
      customerId: customers[9].id,
      title: '低价破冰私转退款案',
      taskType: 'text',
      content: '前端测试提议主动退款破冰，此操作被财务自动防线驳回。',
      triggerSource: 'sop',
      triggerReason: '风险边缘SOP',
      approvalStatus: 'rejected',
      executeStatus: 'draft',
      rejectReason: '非高客单价禁止直接倒贴退款。'
    }
  });

  console.log('Mock tasks (10 entries over various queues) created successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
