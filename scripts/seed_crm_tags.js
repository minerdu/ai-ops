const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ===================== 标签库定义 =====================
const TAG_LIBRARY = [
  { name: '高消费', category: 'value', color: '#FF4D4F' },
  { name: '中消费', category: 'value', color: '#FA8C16' },
  { name: '低消费', category: 'value', color: '#999999' },
  { name: '未消费', category: 'value', color: '#BFBFBF' },
  { name: '高意向', category: 'intent', color: '#FF4D4F' },
  { name: '中意向', category: 'intent', color: '#FA8C16' },
  { name: '潜力客户', category: 'intent', color: '#1677FF' },
  { name: 'VIP', category: 'lifecycle', color: '#722ED1' },
  { name: '新客户', category: 'lifecycle', color: '#52C41A' },
  { name: '沉默客户', category: 'lifecycle', color: '#999999' },
  { name: '体验过', category: 'lifecycle', color: '#FA8C16' },
  { name: '已转化', category: 'lifecycle', color: '#13C2C2' },
  { name: '流失风险', category: 'risk', color: '#FF4D4F' },
  { name: '面部护理', category: 'preference', color: '#EB2F96' },
  { name: '身体SPA', category: 'preference', color: '#2F54EB' },
  { name: '抗衰项目', category: 'preference', color: '#F5222D' },
  { name: '私密养护', category: 'preference', color: '#7C3AED' },
  { name: '肩颈调理', category: 'preference', color: '#389E0D' },
  { name: '骨盆修复', category: 'preference', color: '#C41D7F' },
  { name: '排毒养生', category: 'preference', color: '#08979C' },
  { name: '价格敏感', category: 'behavior', color: '#D48806' },
  { name: '决策果断', category: 'behavior', color: '#52C41A' },
  { name: '多次咨询', category: 'behavior', color: '#1677FF' },
  { name: '朋友圈活跃', category: 'behavior', color: '#FA541C' },
  { name: '常带闺蜜', category: 'behavior', color: '#EB2F96' },
  { name: '周末客户', category: 'behavior', color: '#13C2C2' },
  { name: '工作日客户', category: 'behavior', color: '#2F54EB' },
  { name: '宝妈', category: 'demographic', color: '#EB2F96' },
  { name: '职场白领', category: 'demographic', color: '#1677FF' },
  { name: '企业主', category: 'demographic', color: '#722ED1' },
  { name: '自由职业', category: 'demographic', color: '#FA8C16' },
  { name: '备孕中', category: 'demographic', color: '#52C41A' },
  { name: '产后修复', category: 'demographic', color: '#F5222D' },
  { name: '老客推荐', category: 'source', color: '#13C2C2' },
  { name: '线上获客', category: 'source', color: '#2F54EB' },
  { name: '到店自然客', category: 'source', color: '#389E0D' },
  { name: '朋友圈广告', category: 'source', color: '#FA541C' },
];

const SERVICE_ITEMS = [
  { name: '基础面部清洁护理', price: 198, category: '面部' },
  { name: '深层补水光子嫩肤', price: 398, category: '面部' },
  { name: '热玛吉抗衰紧致', price: 6800, category: '抗衰' },
  { name: '超声刀V脸提升', price: 4980, category: '抗衰' },
  { name: '全身淋巴排毒', price: 498, category: '排毒' },
  { name: '私密紧致修复疗程', price: 2980, category: '私密' },
  { name: '产后骨盆修复疗程', price: 1980, category: '骨盆' },
  { name: '肩颈经络疏通调理', price: 358, category: '身体' },
];

// 固定大客资料，保证演示效果
const FIXED_PROFILES = [
  { name: '苏云', age: 32, memberLevel: 'V4', totalSpent: 28600, tagIds: ['高消费', 'VIP', '高意向'] },
  { name: '王丽娟', age: 45, memberLevel: 'V5', totalSpent: 52800, tagIds: ['高消费', 'VIP', '高意向'] },
  { name: '陈美华', age: 42, memberLevel: 'V6', totalSpent: 86500, tagIds: ['高消费', 'VIP', '高意向'] },
  { name: '郑琳', age: 37, memberLevel: 'V5', totalSpent: 48600, tagIds: ['高消费', 'VIP'] },
  { name: '高艳', age: 40, memberLevel: 'V4', totalSpent: 35600, tagIds: ['高消费', 'VIP'] },
  { name: '曹静', age: 46, memberLevel: 'V5', totalSpent: 45200, tagIds: ['高消费', 'VIP'] }
];

const SURNAMES = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜';
const FIRSTNAMES = '佳丽云红静燕蕾萍兰瑶佩晓艳琳佳梦欣芳雪微媛梅';

function generateRandomName() {
  const sur = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  const fnLength = Math.random() > 0.5 ? 2 : 1;
  let fn = '';
  for(let i=0; i<fnLength; i++) fn += FIRSTNAMES[Math.floor(Math.random() * FIRSTNAMES.length)];
  return sur + fn;
}

function generateConsumptionRecords(totalSpent, category) {
  const records = [];
  if (totalSpent === 0) return records;
  const numRecords = Math.max(2, Math.floor(totalSpent / 3000) + 1);
  let remaining = totalSpent;
  for (let i = 0; i < numRecords && remaining > 0; i++) {
    const service = SERVICE_ITEMS[Math.floor(Math.random() * SERVICE_ITEMS.length)];
    const amount = Math.min(service.price, remaining);
    remaining -= amount;
    const monthsAgo = Math.floor(Math.random() * 18);
    const date = new Date();
    date.setDate(date.getDate() - (monthsAgo * 30 + Math.floor(Math.random()*28)));
    records.push({ date: date.toISOString().split('T')[0], product: service.name, amount, category: service.category, satisfaction: 5 });
  }
  return records.sort((a,b)=> new Date(b.date)-new Date(a.date));
}

function generateCrmJson(level, totalSpent) {
  const age = 22 + Math.floor(Math.random() * 28); // 22~50
  
  if (totalSpent === 0 || level === '未分级') {
    return {
      memberLevel: '未分级', totalSpent: 0, visitCount: 0, points: 0,
      basicInfo: { age, occupation: '未知', address: '未知', birthday: '1990-01-01' },
      consumptionRecords: [], preferences: {}
    };
  }

  const levelMap = { V1: 6, V2: 12, V3: 18, V4: 24, V5: 36, V6: 48 };
  const months = levelMap[level] || 12;
  const memberMonths = months + Math.floor(Math.random() * 12);
  const visitCount = Math.max(2, Math.floor(memberMonths * (1.5 + Math.random())));
  
  const memberSince = new Date();
  memberSince.setMonth(memberSince.getMonth() - memberMonths);

  const val = totalSpent > 20000 ? 8.5 : totalSpent > 5000 ? 7 : (totalSpent === 0 ? 3 : 5);
  const scores = {
    valueScore: val + Math.random() * 1.5,
    intentScore: val + Math.random() - 0.5,
    demandScore: 6 + Math.random() * 3,
    satisfactionScore: totalSpent > 5000 ? 8 + Math.random() * 2 : 5 + Math.random() * 3,
    relationScore: totalSpent > 20000 ? 8 + Math.random() * 2 : 6 + Math.random() * 2,
    loyaltyScore: totalSpent > 10000 ? 8 + Math.random() * 2 : 4 + Math.random() * 4
  };

  return {
    memberLevel: level, totalSpent, visitCount, points: Math.floor(totalSpent * 0.1),
    memberSince: memberSince.toISOString().split('T')[0],
    firstVisitDate: memberSince.toISOString().split('T')[0],
    lastVisitDate: new Date(Date.now() - Math.floor(Math.random()*15)*86400000).toISOString().split('T')[0],
    basicInfo: { age, occupation: '职员', address: '市区', birthday: '1990-01-01' },
    consumptionRecords: generateConsumptionRecords(totalSpent, '面部'),
    preferences: { preferredProjects: ['面部护理', '身体SPA'] },
    scores
  };
}

async function main() {
  console.log('🔄 开始极速扩张 273名个人 + 20个群 的大数据底座...');
  
  await prisma.customerTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.customer.deleteMany();

  const tagMap = {};
  for (const t of TAG_LIBRARY) {
    tagMap[t.name] = await prisma.tag.create({ data: t });
  }

  // 需求分配: 118 (ad1), 88 (ad2), 67 (ad3) 全部分配
  const individuals = [];
  const assignedPlan = [
    ...Array(118).fill('WeClaw-AI顾问1'),
    ...Array(88).fill('WeClaw-AI顾问2'),
    ...Array(67).fill('WeClaw-AI顾问3'),
  ];
  
  // 生成 273 个实体
  for (let i = 0; i < 273; i++) {
    let namePath = generateRandomName();
    let level = 'V1', spent = 0;
    
    // Mix data: 20%未消费, 30%V1, 25%V2, 10%V3, 8%V4, 5%V5, 2%V6
    const r = Math.random();
    if(r < 0.20) { level = '未分级'; spent = 0; }
    else if(r < 0.50) { level = 'V1'; spent = 800 + Math.random()*2000; }
    else if(r < 0.75) { level = 'V2'; spent = 3000 + Math.random()*5000; }
    else if(r < 0.85) { level = 'V3'; spent = 10000 + Math.random()*8000; }
    else if(r < 0.93) { level = 'V4'; spent = 20000 + Math.random()*10000; }
    else if(r < 0.98) { level = 'V5'; spent = 40000 + Math.random()*15000; }
    else { level = 'V6'; spent = 80000 + Math.random()*20000; }

    individuals.push({
      name: namePath,
      level, spent: Math.floor(spent),
      advisor: assignedPlan[i]
    });
  }

  // 替换前几个为 FIXED_PROFILES
  for(let i=0; i<FIXED_PROFILES.length; i++) {
    individuals[i].name = FIXED_PROFILES[i].name;
    individuals[i].level = FIXED_PROFILES[i].memberLevel;
    individuals[i].spent = FIXED_PROFILES[i].totalSpent;
  }

  // 开始插入数据库
  for (const ind of individuals) {
    const isZero = ind.spent === 0;
    const crmData = generateCrmJson(ind.level, ind.spent);
    
    const customer = await prisma.customer.create({
      data: {
        name: ind.name,
        isGroup: false,
        assignedToId: ind.advisor,
        memberLevel: ind.level,
        totalSpent: ind.spent,
        silentDays: isZero ? Math.floor(Math.random()*60) : Math.floor(Math.random()*5),
        crmHistory: JSON.stringify(crmData),
        intentScore: ind.spent > 20000 ? 5 : ind.spent > 5000 ? 4 : (isZero ? 2 : 3),
        valueScore: ind.spent > 20000 ? 5 : ind.spent > 5000 ? 4 : (isZero ? 1 : 3),
      }
    });

    const tagsToAssign = [];
    if(isZero) tagsToAssign.push('未消费', '新客户');
    else {
      tagsToAssign.push(ind.spent > 20000 ? '高消费' : '中消费');
      if (ind.spent > 40000) tagsToAssign.push('VIP');
    }
    
    for (const t of tagsToAssign) {
       await prisma.customerTag.create({ data: { customerId: customer.id, tagId: tagMap[t].id }});
    }
  }

  // 生成 20 个群聊
  const GROUP_NAMES = [
    '核心抗衰交流群', 'VIP水疗内测群', '面部提拉福利群', '肩颈调理私享群', '产后修复打卡营',
    '骨盆紧致内测群', '高端私密养护群', '健康排毒俱乐部', '初级护肤讨论群', '闺蜜分享福利群',
    '丽人抗初老群', '宝妈交流群', '周末特惠福利群', '胶原蛋白VIP群', '热玛吉咨询群',
    '超声刀术后护理群', '全身SPA预约群', '夏季防晒团购群', '秋冬补水护肤群', '敏感肌互助群'
  ];

  for (let i = 0; i < 20; i++) {
    const advisor = assignedPlan[Math.floor(Math.random() * assignedPlan.length)];
    const population = 30 + Math.floor(Math.random() * 260); // 30 ~ 290 人
    const crmData = {
      groupPopulation: population,
      groupTags: ['活跃', '刚需'],
      scores: {
        activityScore: 7 + Math.random()*3, spendingScore: 6 + Math.random()*4,
        interactionScore: 7 + Math.random()*2, loyaltyScore: 6 + Math.random()*3,
        referralScore: 5 + Math.random()*3, conversionScore: 7 + Math.random()*2
      }
    };
    
    await prisma.customer.create({
      data: {
        name: `${GROUP_NAMES[i]} (${population}人)`,
        isGroup: true,
        assignedToId: advisor,
        totalSpent: 0,
        crmHistory: JSON.stringify(crmData)
      }
    });
  }

  console.log(`✅ 成功生成 273 个人客户与 20 个群聊！`);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
