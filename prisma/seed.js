const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  await prisma.conversation.deleteMany();
  await prisma.customerTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.customer.deleteMany();

  console.log('Seeding high-fidelity mock data (Beauty / Massage Salon Context)...');

  // Create Tags
  const tagIntent = await prisma.tag.create({ data: { name: '高意向', category: 'intent', color: '#FF4D4F' } });
  const tagSilent = await prisma.tag.create({ data: { name: '沉默客户', category: 'lifecycle', color: '#999999' } });
  const tagVIP = await prisma.tag.create({ data: { name: 'VIP', category: 'custom', color: '#1677FF' } });
  const tagTrial = await prisma.tag.create({ data: { name: '体验过', category: 'lifecycle', color: '#FA8C16' } });
  const tagBargain = await prisma.tag.create({ data: { name: '价格敏感', category: 'risk', color: '#722ED1' } });

  const tagsArray = [tagIntent, tagSilent, tagVIP, tagTrial, tagBargain];

  const fullNames = ['王丽娟', '李秀梅', '张雪', '刘芳芳', '陈美华', '杨静', '黄晓燕', '赵红', '周薇', '吴雅琴', '徐莉', '孙萍', '马兰', '朱媛', '胡欣', '林瑶', '郭佩', '何晓', '高艳', '郑琳', '许佳', '苏云', '陆佳佳', '曹静', '沈梦'];
  const groupPrefixes = ['焕颜抗衰', '私密养护', '肩颈调理', '面部提拉', '清透排毒', '骨盆修复', 'VIP水疗'];
  const groupSuffixes = ['打卡群', '福利群', '内测群', '交流群', '互助群', 'VIP1群', '专属群'];

  const singleMessages = [
    '你们店那个私密养护套餐，大概要做几次才有效果？',
    '有没有适合备孕期做的肩颈舒缓按摩呀？',
    '上次我做的面部拨筋，昨天做完有点红，是正常的排毒反应吗？',
    '精油开背现在的体验价是多少？能和闺蜜一起团购吗？',
    '我的基因抗衰报告出来了，这周哪天过去听一下解读？',
    '之前推荐的那个术后修复面膜哪里有买？发我一下。',
    '你们现在的双十一超声刀活动，比平时单次划算多少？',
    '预约这周末下午3点，李技师有空吗？帮我排一下。',
    '请问买了年卡之后如果怀孕了不能做，可以申请延期吗？',
    '预算三四千左右，想专门改善一下假胯宽，有什么仪器推荐吗？'
  ];

  const aiRepliesSingle = [
    '亲爱的，由于我们主要是深度调理，通常3-5次为一个完整疗程，做完后会有非常明显的改善感受。',
    '亲爱的，备孕期非常推荐我们的轻柔淋巴排毒按摩，避开腹部和特殊穴位，不仅放松身心还有助于调节内分泌呢。',
    '亲爱的不用担心，面部拨筋后出现轻微泛红正常的，这是局部经络疏通加速了血液循环，注意补水，一两天就会消退。',
    '精油开背目前体验价只需199元哦，两人同行还可以再送您各一份头部刮痧放松，要帮您预约吗？',
    '报告已在系统收到啦，这周四或者周五下午都有专家坐诊，您看哪个时段方便呢？',
    '修复面膜链接已经为您生成啦：[点击选购专属修复套组]，今天可以直接从旗舰店发货哦。',
    '现在的活动是最给力的了！相当于平时的6折，还额外赠送3次基础补水呢。',
    '帮您查了系统，李技师周末下午3点正好有个空档，已经自动帮您锁定了哦，稍后推送预约单。',
    '完全可以的亲爱的，年卡包含因为备孕怀孕等不可抗因素的无理由冻结权益，您放心。',
    '针对假胯宽，我们刚刚引进了全新的骨盆修复高端仪器，体验效果特别好，刚好在您的预算内。'
  ];

  const groupMessages = [
    '@AI顾问 帮我查一下上次抢购的次卡里面还剩几次？',
    '群里昨天发的那个半价护理券今天还能领吗？',
    '有没有姐妹做过那个徒手捏胸的？效果真有说明书那么好吗？',
    '大家平时敷泥灸都会出很多汗吗？我昨天做完感觉浑身轻松。',
    '@AI顾问 麻烦问下门店这个首发仪器，周末还有体验名额吗？',
    '今天怎么没有发抗日晒美白小常识？',
    '我昨天在店里买的精油，用法有点忘记了，谁能发我个教程…',
    '分享一个我自己在家做热敷的小窍门，记得用粗盐！',
    '双十一的抢购群啥时候开始呀，等不及了！',
    '有人能发一下上次讲座讲产后修复的PPT吗？'
  ];

  const crmProducts = ['面部抗衰提拉 年卡套组', '私密深层养护疗程 (12次)', '高端定制精油开背季卡', '全身淋巴排毒套餐', '骨盆修复强化仪 次卡'];

  function getRandomTag() {
    return tagsArray[Math.floor(Math.random() * tagsArray.length)];
  }

  const generateData = async (subId, countSingle, countGroup, offset) => {
    const promises = [];
    
    let nameIdx = offset % fullNames.length;

    for (let i = 0; i < countSingle; i++) {
       const fullName = fullNames[nameIdx % fullNames.length];
       nameIdx++;
       const msgIndex = Math.floor(Math.random() * singleMessages.length);
       
       let crmHistory = null;
       const isPurchasedInfo = Math.random() > 0.6;
       if (isPurchasedInfo) {
           const buyCount = Math.floor(Math.random() * 3) + 1;
           const records = [];
           for (let j=0; j<buyCount; j++) {
               records.push({
                   date: `2024-${String(Math.floor(Math.random()*12)+1).padStart(2,'0')}-${String(Math.floor(Math.random()*28)+1).padStart(2,'0')}`,
                   product: crmProducts[Math.floor(Math.random() * crmProducts.length)],
                   amount: Math.floor(Math.random() * 10000 + 1980)
               });
           }
           records.sort((a,b) => new Date(b.date) - new Date(a.date));
           crmHistory = JSON.stringify(records);
       }
       
       let randTag = getRandomTag();
       while (isPurchasedInfo && randTag.id === tagVIP.id) {
         randTag = getRandomTag();
       }

       promises.push(
         prisma.customer.create({
           data: {
             name: fullName,
             phone: `138${Math.floor(10000000 + Math.random() * 90000000)}`,
             avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
             wechatId: `wx_${subId}_s_${i}_${Date.now()}`,
             isGroup: false,
             assignedToId: subId,
             crmHistory: crmHistory,
             aiSummary: `该女性顾客高度关注形体与面部保养，询问了${singleMessages[msgIndex].substring(0, 8)}等相关信息。`,
             intentScore: parseFloat((Math.random() * 2 + 3).toFixed(1)),
             valueScore: parseFloat((Math.random() * 2 + 3).toFixed(1)),
             tags: {
               create: [
                 { tagId: randTag.id },
                 ...(isPurchasedInfo ? [{ tagId: tagVIP.id }] : [])
               ]
             },
             conversations: {
               create: {
                 aiMode: true,
                 status: 'active',
                 unreadCount: 1,
                 messages: {
                   create: [
                     { direction: 'inbound', senderType: 'customer', content: singleMessages[msgIndex] },
                     { direction: 'outbound', senderType: 'ai', content: aiRepliesSingle[msgIndex] },
                     { direction: 'inbound', senderType: 'customer', content: '好的，那就拜托安排啦。' }
                   ]
                 }
               }
             }
           }
         })
       );
    }

    // Group chats
    for (let i = 0; i < countGroup; i++) {
       const prefix = groupPrefixes[Math.floor(Math.random() * groupPrefixes.length)];
       const suffix = groupSuffixes[Math.floor(Math.random() * groupSuffixes.length)];
       const msgIndex = Math.floor(Math.random() * groupMessages.length);
       
       promises.push(
         prisma.customer.create({
           data: {
             name: `${prefix}${suffix} (${Math.floor(Math.random() * 200 + 50)}人)`,
             avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(prefix)}`,
             wechatId: `wx_group_${subId}_${i}_${Date.now()}`,
             isGroup: true,
             assignedToId: subId,
             aiSummary: `【美业门店互助交流圈】，活跃度高，群友日常自发探讨手法体验，系统偶尔自动介入答疑。`,
             conversations: {
               create: {
                 aiMode: true,
                 status: 'active',
                 unreadCount: 1, 
                 messages: {
                   create: [
                     { direction: 'inbound', senderType: 'customer', content: groupMessages[msgIndex] },
                   ]
                 }
               }
             }
           }
         })
       );
    }
    
    for (const promise of promises) {
       await promise;
    }
  };

  await generateData('sub_1', 10, 5, 0);
  await generateData('sub_2', 10, 5, 10);
  await generateData('sub_3', 10, 5, 20);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
