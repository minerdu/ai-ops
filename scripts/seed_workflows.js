const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 工作流仿真数据生成器 v2
 * 生成 3/13 - 5/13 两个月的旅程自动 + 人工指令工作流
 */

const JOURNEY_STAGES = [
  { stage: '新客破冰', templates: [
    '亲爱的{name}，欢迎加入悦心养生馆大家庭～我是你的专属美容顾问，有任何问题随时找我哦🌸',
    '你好{name}～今天给你推荐我们店最受欢迎的面部焕颜护理，新客体验价只要98元，约吗？',
    '{name}姐姐好～感谢关注我们！我们这周有精油体验日，免费哦，约个时间来试试吧💕',
  ]},
  { stage: '意向沟通', templates: [
    '{name}姐姐，上次聊到的抗衰精华护理，我把详细介绍发给你看看哦～',
    '亲爱的{name}，你上次关心的肩颈理疗项目，本月有限时体验价，需要帮你预约吗？',
    '{name}，你之前说对补水项目感兴趣，周末有空的话过来体验一下呀～',
  ]},
  { stage: '客户转化', templates: [
    '{name}姐，我们本周有限时新人体验包，3项热门服务只要299元，性价比超高！要不要来试试？',
    '亲爱的{name}，给你看看李姐做完抗衰精华的效果对比图，真的很明显呢！你也可以来感受一下～',
    '{name}，你关注很久了，这次会员日折扣力度最大，再不来就过期了哦～',
  ]},
  { stage: '客户下单', templates: [
    '{name}姐姐，你预约的{project}已经安排好了，{date}下午2点到店就可以啦～',
    '亲爱的{name}，温馨提醒一下，你的护理预约在明天，记得按时来哦，我提前给你把房间准备好☺️',
    '{name}，你的订单已确认！到店时带上身份证就可以了，我提前帮你做好准备～',
  ]},
  { stage: '到店消费', templates: [
    '{name}姐姐，今天的护理体验怎么样呀？希望你喜欢～有什么感受可以跟我说哦❤️',
    '亲爱的{name}，感谢今天的到来！护理结束后记得多喝温水，效果会更好呢～',
    '{name}，帮你做的是深层补水项目，回去后记得敷面膜哦，效果会翻倍💧',
  ]},
  { stage: '消费关怀', templates: [
    '{name}姐姐，护理后3天了，皮肤状态怎么样呀？有什么变化可以随时跟我反馈呢～',
    '亲爱的{name}，上次做完精油开背，肩颈有没有轻松很多呀？很多姐妹反馈说效果特别好呢！',
    '{name}，你上次的面部护理效果应该开始显现了～如果感觉不错的话，可以考虑做个疗程哦，效果更持久💕',
  ]},
  { stage: '客户维系', templates: [
    '{name}姐姐，好久没见了～想你了！最近店里有新到的有机精油系列，特别适合你的肤质呢🌿',
    '亲爱的{name}，{holiday}快乐！送你一份专属会员福利，详情点这里查看～',
    '{name}，作为我们的VIP会员，这个月有专属的新品体验名额留给你了，周末来坐坐？☕',
  ]},
  { stage: '跟进提醒', templates: [
    '{name}，好长时间没见你了，最近忙不忙呀？有空过来坐坐，我给你泡杯花茶☕',
    '亲爱的{name}，上次约的复诊时间快到了哦～需要帮你安排本周的时间吗？',
    '{name}姐姐，最近换季了，肌肤和身体都需要特别护理哦，要不要来做个深层调理？',
  ]},
  { stage: '沉默激活', templates: [
    '{name}姐姐，好久没联系了～我们最近上了几款新项目，好多老客户体验完都赞不绝口，特意留了个名额给你💝',
    '亲爱的{name}，好想你呀！这个月我们有老客户专属回馈活动，你一定要来看看～',
    '{name}，送你一张专属优惠券，是我特意给老朋友申请的哦！有效期7天，赶紧用起来～',
  ]},
];

const MANUAL_TASKS = [
  { title: '三八节会员福利推送', content: '亲爱的会员家人，三八女神节快乐！🌸 悦心养生馆为您准备了专属福利：全场满300减50，指定项目第二件半价！3月8日-10日限时3天，提前预约还送精美伴手礼哦～', needApproval: true, type: 'send_coupon' },
  { title: 'VIP客户年度答谢', content: '尊敬的VIP会员{name}，感谢您一直以来的信任与支持！我们诚挚邀请您参加4月20日的年度VIP答谢晚宴，届时有惊喜礼品和专属体验项目等着您💎', needApproval: false, type: 'send_message' },
  { title: '五一活动预热通知', content: '🎉 五一黄金周钜惠来袭！4/28-5/4期间，全场消费满1000减200，新客首单立减100！还有抽奖活动等你来～赶紧约起来吧！', needApproval: true, type: 'send_coupon' },
  { title: '新品项目推荐', content: '亲爱的{name}，我们新引进了日本进口胶原蛋白光子嫩肤仪，效果真的超棒！本月体验价388元（原价688），名额有限先到先得～', needApproval: false, type: 'send_message' },
  { title: '会员日专属活动', content: '每月15号是我们的会员日！本月会员日特惠：全场护理项目8折，储值3000送500！别忘了来哦～', needApproval: true, type: 'send_coupon' },
  { title: '春季养生课堂邀约', content: '亲爱的{name}，本周六下午3点我们有一场免费的「春季养生课堂」，教你如何通过饮食和穴位按摩改善肌肤问题，名额有限赶紧报名吧～🌱', needApproval: false, type: 'send_message' },
  { title: '端午节问候', content: '端午安康🎋{name}姐姐！悦心养生馆祝您和家人端午快乐！节日期间正常营业，欢迎随时预约哦～', needApproval: false, type: 'send_message' },
  { title: '母亲节特别活动', content: '💐 母亲节特惠！5月11-12日，带妈妈一起来做护理，妈妈享受全单免费！这是给最爱妈妈的最好礼物～', needApproval: true, type: 'send_coupon' },
];

const HOURS = ['09:00','09:30','10:00','10:30','11:00','14:00','14:30','15:00','15:30','16:00','17:00','19:00','19:30','20:00'];

function randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function main() {
  console.log('🗑️ Step 1: Clearing old Task & AuditLog data...');
  await prisma.auditLog.deleteMany({});
  await prisma.task.deleteMany({});
  console.log('✅ Cleared all tasks and audit logs');

  console.log('📋 Step 2: Loading customers...');
  const customers = await prisma.customer.findMany({ where: { isGroup: false } });
  console.log(`  Found ${customers.length} individual customers`);

  const startDate = new Date('2026-03-13T00:00:00+08:00');
  const endDate = new Date('2026-05-13T23:59:59+08:00');
  const today = new Date('2026-04-13T00:00:00+08:00');

  let totalJourney = 0;
  let totalManual = 0;

  console.log('🤖 Step 3: Generating journey auto-tasks (3/13 - 5/13)...');
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const currentDate = new Date(d);
    const isPast = currentDate < today;
    const dailyCount = randomInt(12, 28);
    
    const dayTasks = [];
    for (let i = 0; i < dailyCount; i++) {
      const customer = randomPick(customers);
      const stageIdx = randomInt(0, JOURNEY_STAGES.length - 1);
      const stage = JOURNEY_STAGES[stageIdx];
      const template = randomPick(stage.templates);
      const content = template
        .replace(/\{name\}/g, customer.name)
        .replace(/\{project\}/g, randomPick(['面部焕颜','精油开背','肩颈理疗','深层补水','抗衰精华']))
        .replace(/\{date\}/g, `${currentDate.getMonth()+1}月${currentDate.getDate()}日`)
        .replace(/\{holiday\}/g, randomPick(['春节','元宵节','三八节','清明','劳动节','母亲节']));
      
      const time = randomPick(HOURS);
      const [h, m] = time.split(':');
      const scheduledAt = new Date(currentDate);
      scheduledAt.setHours(parseInt(h), parseInt(m), randomInt(0,59), 0);

      dayTasks.push({
        customerId: customer.id,
        title: `${stage.stage} · ${customer.name}`,
        taskType: 'text',
        content,
        triggerSource: 'journey',
        triggerReason: `🤖 客户旅程自动 · ${stage.stage}`,
        approvalStatus: 'approved',
        executeStatus: isPast ? 'success' : 'scheduled',
        scheduledAt,
        executedAt: isPast ? scheduledAt : null,
        reviewedBy: 'ai',
        reviewNotes: 'AI自动审核通过：客户旅程自动运营任务，免审直通',
        createdAt: scheduledAt,
        updatedAt: scheduledAt,
      });
    }
    
    // Batch insert
    if (dayTasks.length > 0) {
      await prisma.task.createMany({ data: dayTasks });
      totalJourney += dayTasks.length;
    }
    
    if (totalJourney % 200 === 0) {
      process.stdout.write(`  ... ${totalJourney} journey tasks created\r`);
    }
  }
  console.log(`\n✅ Created ${totalJourney} journey auto-tasks`);

  console.log('📋 Step 4: Generating manual command tasks...');
  
  // Every ~4-5 days, insert 1-2 manual tasks
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + randomInt(3, 5))) {
    const currentDate = new Date(d);
    const isPast = currentDate < today;
    const taskCount = randomInt(1, 2);
    
    for (let i = 0; i < taskCount; i++) {
      const manualDef = randomPick(MANUAL_TASKS);
      const targetCustomers = [];
      const batchSize = randomInt(3, 15);
      for (let j = 0; j < Math.min(batchSize, customers.length); j++) {
        targetCustomers.push(customers[randomInt(0, customers.length - 1)]);
      }
      
      // Create task for each target customer (pick first 3 to keep data manageable)
      const targets = targetCustomers.slice(0, 3);
      for (const customer of targets) {
        const time = randomPick(HOURS);
        const [h, m] = time.split(':');
        const scheduledAt = new Date(currentDate);
        scheduledAt.setHours(parseInt(h), parseInt(m), randomInt(0,59), 0);
        
        const content = manualDef.content.replace(/\{name\}/g, customer.name);
        const isRejected = isPast && manualDef.needApproval && Math.random() < 0.08;
        
        await prisma.task.create({
          data: {
            customerId: customer.id,
            title: manualDef.title,
            taskType: manualDef.type === 'send_coupon' ? 'text' : 'text',
            content,
            triggerSource: 'manual_command',
            triggerReason: `📋 人工运营指令: "${manualDef.title}"`,
            approvalStatus: isRejected ? 'rejected' : (manualDef.needApproval && !isPast ? 'pending' : 'approved'),
            executeStatus: isRejected ? 'cancelled' : (isPast ? 'success' : (manualDef.needApproval ? 'draft' : 'scheduled')),
            rejectReason: isRejected ? '金额/活动力度需商议确认' : null,
            scheduledAt,
            executedAt: isPast && !isRejected ? scheduledAt : null,
            reviewedBy: manualDef.needApproval ? 'human' : 'ai',
            reviewNotes: manualDef.needApproval 
              ? (isRejected ? 'AI拦截：涉及财务操作，管理者驳回' : '人工审批通过')
              : 'AI自动审核通过：运营指令任务，未检测到财务风险',
            createdAt: scheduledAt,
            updatedAt: scheduledAt,
          },
        });
        totalManual++;
      }
    }
  }
  console.log(`✅ Created ${totalManual} manual command tasks`);

  console.log('📝 Step 5: Creating audit logs for journey tasks...');
  const journeyTasks = await prisma.task.findMany({ where: { triggerSource: 'journey' }, take: 200 });
  const auditData = journeyTasks.map(t => ({
    entityType: 'task',
    entityId: t.id,
    action: 'auto_approve',
    operator: 'ai',
    reason: 'AI自动审核通过：客户旅程自动运营任务，免审直通',
    metadata: JSON.stringify({ triggerSource: 'journey', taskType: t.taskType }),
    createdAt: t.createdAt,
  }));
  if (auditData.length > 0) {
    await prisma.auditLog.createMany({ data: auditData });
  }
  console.log(`✅ Created ${auditData.length} audit logs`);

  console.log('\n🎉 Done! Summary:');
  console.log(`  Journey tasks: ${totalJourney}`);
  console.log(`  Manual tasks: ${totalManual}`);
  console.log(`  Total: ${totalJourney + totalManual}`);
  console.log(`  Date range: 3/13 - 5/13 (2 months)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
