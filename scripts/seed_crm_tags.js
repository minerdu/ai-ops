const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 丰富CRM数据 & 标签系统升级脚本
 * - 为每位客户生成完整CRM档案（等级、消费记录、偏好、基本信息）
 * - 为每位客户打上5-10个多维度标签
 */

// ===================== 标签库定义 =====================
const TAG_LIBRARY = [
  // 消费维度
  { name: '高消费', category: 'value', color: '#FF4D4F' },
  { name: '中消费', category: 'value', color: '#FA8C16' },
  { name: '低消费', category: 'value', color: '#999999' },
  { name: '未消费', category: 'value', color: '#BFBFBF' },
  // 意向维度
  { name: '高意向', category: 'intent', color: '#FF4D4F' },
  { name: '中意向', category: 'intent', color: '#FA8C16' },
  { name: '潜力客户', category: 'intent', color: '#1677FF' },
  // 生命周期
  { name: 'VIP', category: 'lifecycle', color: '#722ED1' },
  { name: '新客户', category: 'lifecycle', color: '#52C41A' },
  { name: '沉默客户', category: 'lifecycle', color: '#999999' },
  { name: '体验过', category: 'lifecycle', color: '#FA8C16' },
  { name: '已转化', category: 'lifecycle', color: '#13C2C2' },
  { name: '流失风险', category: 'risk', color: '#FF4D4F' },
  // 偏好维度
  { name: '面部护理', category: 'preference', color: '#EB2F96' },
  { name: '身体SPA', category: 'preference', color: '#2F54EB' },
  { name: '抗衰项目', category: 'preference', color: '#F5222D' },
  { name: '私密养护', category: 'preference', color: '#7C3AED' },
  { name: '肩颈调理', category: 'preference', color: '#389E0D' },
  { name: '骨盆修复', category: 'preference', color: '#C41D7F' },
  { name: '排毒养生', category: 'preference', color: '#08979C' },
  // 行为维度
  { name: '价格敏感', category: 'behavior', color: '#D48806' },
  { name: '决策果断', category: 'behavior', color: '#52C41A' },
  { name: '多次咨询', category: 'behavior', color: '#1677FF' },
  { name: '朋友圈活跃', category: 'behavior', color: '#FA541C' },
  { name: '常带闺蜜', category: 'behavior', color: '#EB2F96' },
  { name: '周末客户', category: 'behavior', color: '#13C2C2' },
  { name: '工作日客户', category: 'behavior', color: '#2F54EB' },
  // 人群属性
  { name: '宝妈', category: 'demographic', color: '#EB2F96' },
  { name: '职场白领', category: 'demographic', color: '#1677FF' },
  { name: '企业主', category: 'demographic', color: '#722ED1' },
  { name: '自由职业', category: 'demographic', color: '#FA8C16' },
  { name: '备孕中', category: 'demographic', color: '#52C41A' },
  { name: '产后修复', category: 'demographic', color: '#F5222D' },
  // 来源维度
  { name: '老客推荐', category: 'source', color: '#13C2C2' },
  { name: '线上获客', category: 'source', color: '#2F54EB' },
  { name: '到店自然客', category: 'source', color: '#389E0D' },
  { name: '朋友圈广告', category: 'source', color: '#FA541C' },
];

// ===================== CRM 服务项目库 =====================
const SERVICE_ITEMS = [
  { name: '基础面部清洁护理', price: 198, category: '面部' },
  { name: '深层补水光子嫩肤', price: 398, category: '面部' },
  { name: '热玛吉抗衰紧致 (全脸)', price: 6800, category: '抗衰' },
  { name: '超声刀V脸提升', price: 4980, category: '抗衰' },
  { name: '水光针注射 (3ml)', price: 1580, category: '面部' },
  { name: '胶原蛋白修复面膜 SPA', price: 299, category: '面部' },
  { name: '精油开背深度放松', price: 268, category: '身体' },
  { name: '肩颈经络疏通调理', price: 358, category: '身体' },
  { name: '全身淋巴排毒 SPA', price: 498, category: '排毒' },
  { name: '远红外线排汗排毒舱', price: 198, category: '排毒' },
  { name: '私密紧致修复疗程', price: 2980, category: '私密' },
  { name: '产后骨盆修复仪疗程', price: 1980, category: '骨盆' },
  { name: '臀部提升塑形', price: 1280, category: '身体' },
  { name: '基因抗衰检测报告', price: 3980, category: '抗衰' },
  { name: '面部拨筋排毒', price: 328, category: '面部' },
  { name: '头部经络刮痧', price: 168, category: '身体' },
  { name: '泥灸排湿全身调理', price: 458, category: '排毒' },
  { name: '光子嫩肤祛斑套组', price: 2680, category: '面部' },
  { name: '面部抗衰提拉年卡', price: 12800, category: '抗衰' },
  { name: '私密深层养护(12次卡)', price: 9800, category: '私密' },
  { name: '精油开背季卡(10次)', price: 1980, category: '身体' },
  { name: 'VIP水疗年度尊享卡', price: 19800, category: '身体' },
];

// ===================== 客户信息库 =====================
const CUSTOMER_PROFILES = [
  { name: '苏云', age: 32, occupation: '外企市场经理', address: '城南·翡翠湖畔小区', skinType: '混合偏干', allergies: '无', notes: '决策力强, 注重效率', memberLevel: 'V4', totalSpent: 28600, preferredTech: '李技师', preferredTime: '周末下午', preferredProjects: ['抗衰项目', '面部护理'], tagIds: ['高消费', 'VIP', '高意向', '抗衰项目', '面部护理', '决策果断', '职场白领', '周末客户', '老客推荐'] },
  { name: '王丽娟', age: 45, occupation: '私营企业主', address: '城东·万科御景湾', skinType: '干性敏感肌', allergies: '酒精类护肤品过敏', notes: '消费力强但挑剔, 喜欢私密空间', memberLevel: 'V5', totalSpent: 52800, preferredTech: '陈技师', preferredTime: '工作日上午', preferredProjects: ['私密养护', '抗衰项目', '排毒养生'], tagIds: ['高消费', 'VIP', '高意向', '私密养护', '抗衰项目', '排毒养生', '企业主', '工作日客户', '决策果断', '老客推荐'] },
  { name: '陆佳佳', age: 28, occupation: '幼儿园教师', address: '城北·阳光花园', skinType: '油性痘痘肌', allergies: '无', notes: '预算有限但忠诚度高', memberLevel: 'V2', totalSpent: 5980, preferredTech: '王技师', preferredTime: '暑假全天', preferredProjects: ['面部护理', '身体SPA'], tagIds: ['中消费', '体验过', '中意向', '面部护理', '身体SPA', '价格敏感', '朋友圈活跃'] },
  { name: '林瑶', age: 35, occupation: '全职宝妈', address: '城西·碧桂园', skinType: '中性偏干', allergies: '蜂胶过敏', notes: '时间灵活, 常带孩子一起来', memberLevel: 'V3', totalSpent: 15600, preferredTech: '赵技师', preferredTime: '工作日下午', preferredProjects: ['肩颈调理', '骨盆修复', '排毒养生'], tagIds: ['中消费', 'VIP', '高意向', '肩颈调理', '骨盆修复', '排毒养生', '宝妈', '产后修复', '工作日客户', '常带闺蜜'] },
  { name: '赵红', age: 38, occupation: '银行客户经理', address: '市中心·金融中心公寓', skinType: '混合性', allergies: '无', notes: '注重隐私, 社交圈广, 有转介绍潜力', memberLevel: 'V4', totalSpent: 31200, preferredTech: '李技师', preferredTime: '周末上午', preferredProjects: ['抗衰项目', '私密养护', '面部护理'], tagIds: ['高消费', 'VIP', '高意向', '抗衰项目', '私密养护', '面部护理', '职场白领', '决策果断', '周末客户', '常带闺蜜'] },
  { name: '黄晓燕', age: 29, occupation: '自媒体博主', address: '城南·创意产业园', skinType: '敏感肌', allergies: '部分精油过敏', notes: '会在社交平台分享体验, 曝光价值高', memberLevel: 'V3', totalSpent: 12800, preferredTech: '王技师', preferredTime: '下午场', preferredProjects: ['面部护理', '排毒养生', '身体SPA'], tagIds: ['中消费', '体验过', '高意向', '面部护理', '排毒养生', '朋友圈活跃', '自由职业', '价格敏感', '线上获客'] },
  { name: '杨静', age: 41, occupation: '大学教授', address: '大学城·学府苑', skinType: '干性衰老肌', allergies: '无', notes: '理性消费, 注重科学依据, 转介绍能力强', memberLevel: 'V4', totalSpent: 26500, preferredTech: '陈技师', preferredTime: '寒暑假', preferredProjects: ['抗衰项目', '面部护理'], tagIds: ['高消费', 'VIP', '高意向', '抗衰项目', '面部护理', '决策果断', '职场白领', '老客推荐'] },
  { name: '刘芳芳', age: 33, occupation: '护士', address: '城东·人民医院宿舍', skinType: '混合偏油', allergies: '无', notes: '了解医美, 对手法要求高', memberLevel: 'V2', totalSpent: 6800, preferredTech: '赵技师', preferredTime: '夜班后上午', preferredProjects: ['肩颈调理', '面部护理'], tagIds: ['中消费', '体验过', '中意向', '肩颈调理', '面部护理', '多次咨询', '职场白领'] },
  { name: '张雪', age: 26, occupation: '互联网产品经理', address: '科技园·优品公寓', skinType: '油性', allergies: '无', notes: '年轻高收入, 追求新技术', memberLevel: 'V2', totalSpent: 4580, preferredTech: '不固定', preferredTime: '周末', preferredProjects: ['面部护理', '身体SPA'], tagIds: ['低消费', '新客户', '潜力客户', '面部护理', '身体SPA', '朋友圈活跃', '职场白领', '线上获客'] },
  { name: '郑琳', age: 37, occupation: '房产中介总监', address: '城南·万达广场', skinType: '混合偏干', allergies: '无', notes: '社交圈广, 推荐能力极强', memberLevel: 'V5', totalSpent: 48600, preferredTech: '李技师', preferredTime: '灵活', preferredProjects: ['抗衰项目', '私密养护', '骨盆修复'], tagIds: ['高消费', 'VIP', '高意向', '抗衰项目', '私密养护', '骨盆修复', '决策果断', '常带闺蜜', '企业主', '老客推荐'] },
  { name: '李秀梅', age: 50, occupation: '退休教师', address: '老城区·教师新村', skinType: '干性松弛', allergies: '无', notes: '注重养生, 时间充裕', memberLevel: 'V3', totalSpent: 18900, preferredTech: '陈技师', preferredTime: '工作日上午', preferredProjects: ['排毒养生', '肩颈调理', '面部护理'], tagIds: ['中消费', 'VIP', '中意向', '排毒养生', '肩颈调理', '面部护理', '工作日客户', '到店自然客'] },
  { name: '陈美华', age: 42, occupation: '美容连锁投资人', address: '城中·湖景豪庭', skinType: '中性', allergies: '无', notes: '行业人士, 懂行, 服务标准高', memberLevel: 'V6', totalSpent: 86500, preferredTech: '店长亲做', preferredTime: '灵活', preferredProjects: ['抗衰项目', '私密养护', '面部护理', '身体SPA'], tagIds: ['高消费', 'VIP', '高意向', '抗衰项目', '私密养护', '面部护理', '身体SPA', '企业主', '决策果断', '老客推荐'] },
  { name: '周薇', age: 30, occupation: '律师', address: 'CBD·世贸中心', skinType: '混合性', allergies: '酸类产品不耐受', notes: '工作压力大, 肩颈问题严重', memberLevel: 'V3', totalSpent: 13500, preferredTech: '赵技师', preferredTime: '周末', preferredProjects: ['肩颈调理', '身体SPA', '排毒养生'], tagIds: ['中消费', '体验过', '高意向', '肩颈调理', '身体SPA', '排毒养生', '职场白领', '周末客户'] },
  { name: '吴雅琴', age: 48, occupation: '会计师', address: '城北·金地花园', skinType: '干性敏感肌', allergies: '果酸过敏', notes: '谨慎型消费, 需要充分说服', memberLevel: 'V2', totalSpent: 7200, preferredTech: '王技师', preferredTime: '周末上午', preferredProjects: ['面部护理', '排毒养生'], tagIds: ['中消费', '体验过', '中意向', '面部护理', '排毒养生', '价格敏感', '多次咨询', '职场白领'] },
  { name: '徐莉', age: 34, occupation: '全职宝妈', address: '城西·恒大绿洲', skinType: '混合偏干', allergies: '无', notes: '产后恢复需求强, 老公支持消费', memberLevel: 'V3', totalSpent: 16800, preferredTech: '赵技师', preferredTime: '工作日', preferredProjects: ['骨盆修复', '产后修复', '肩颈调理'], tagIds: ['中消费', '已转化', '高意向', '骨盆修复', '肩颈调理', '排毒养生', '宝妈', '产后修复', '工作日客户', '常带闺蜜'] },
  { name: '孙萍', age: 39, occupation: '餐饮店老板', address: '商业街·美食城', skinType: '油性', allergies: '无', notes: '时间不固定, 经常临时预约', memberLevel: 'V2', totalSpent: 8500, preferredTech: '不固定', preferredTime: '下午空闲时', preferredProjects: ['面部护理', '身体SPA'], tagIds: ['中消费', '体验过', '中意向', '面部护理', '身体SPA', '企业主', '到店自然客'] },
  { name: '马兰', age: 27, occupation: '瑜伽教练', address: '城南·体育中心', skinType: '中性健康', allergies: '无', notes: '身体素质好, 对手法有自己见解', memberLevel: 'V1', totalSpent: 2680, preferredTech: '王技师', preferredTime: '上午', preferredProjects: ['身体SPA', '排毒养生'], tagIds: ['低消费', '新客户', '潜力客户', '身体SPA', '排毒养生', '自由职业', '朋友圈活跃'] },
  { name: '朱媛', age: 36, occupation: '小学校长', address: '城东·书香世家', skinType: '干性', allergies: '无', notes: '领导气质, 消费稳定', memberLevel: 'V3', totalSpent: 14200, preferredTech: '陈技师', preferredTime: '周末', preferredProjects: ['面部护理', '抗衰项目'], tagIds: ['中消费', 'VIP', '高意向', '面部护理', '抗衰项目', '职场白领', '周末客户', '老客推荐'] },
  { name: '胡欣', age: 31, occupation: '设计师', address: '创意园·LOFT公寓', skinType: '混合敏感', allergies: '精油部分过敏', notes: '审美要求高, 对效果敏感', memberLevel: 'V2', totalSpent: 5600, preferredTech: '李技师', preferredTime: '周末下午', preferredProjects: ['面部护理', '身体SPA'], tagIds: ['中消费', '体验过', '中意向', '面部护理', '身体SPA', '价格敏感', '自由职业', '朋友圈活跃'] },
  { name: '郭佩', age: 44, occupation: '保险精英', address: '新区·保利花园', skinType: '混合偏干', allergies: '无', notes: '销售能力强, 有转介绍资源', memberLevel: 'V4', totalSpent: 24800, preferredTech: '陈技师', preferredTime: '灵活', preferredProjects: ['抗衰项目', '面部护理', '私密养护'], tagIds: ['高消费', 'VIP', '高意向', '抗衰项目', '面部护理', '私密养护', '职场白领', '决策果断', '常带闺蜜', '老客推荐'] },
  { name: '何晓', age: 25, occupation: '大学研究生', address: '大学城·学生公寓', skinType: '油性痘痘', allergies: '无', notes: '学生预算有限, 但影响力大', memberLevel: 'V1', totalSpent: 1280, preferredTech: '不固定', preferredTime: '周末', preferredProjects: ['面部护理'], tagIds: ['未消费', '新客户', '潜力客户', '面部护理', '价格敏感', '朋友圈活跃', '线上获客'] },
  { name: '高艳', age: 40, occupation: '医院主任', address: '城中·和谐家园', skinType: '干性衰老', allergies: '无', notes: '医学背景, 注重安全和资质', memberLevel: 'V4', totalSpent: 35600, preferredTech: '店长亲做', preferredTime: '周日上午', preferredProjects: ['抗衰项目', '面部护理', '排毒养生'], tagIds: ['高消费', 'VIP', '高意向', '抗衰项目', '面部护理', '排毒养生', '职场白领', '决策果断', '周末客户'] },
  { name: '许佳', age: 29, occupation: '电商运营', address: '城南·互联网大厦', skinType: '混合偏油', allergies: '无', notes: '对价格敏感但复购率高', memberLevel: 'V2', totalSpent: 6200, preferredTech: '王技师', preferredTime: '晚上', preferredProjects: ['面部护理', '肩颈调理'], tagIds: ['中消费', '体验过', '中意向', '面部护理', '肩颈调理', '价格敏感', '职场白领', '线上获客'] },
  { name: '曹静', age: 46, occupation: '家庭主妇', address: '城东·御湖花园', skinType: '干性松弛', allergies: '无', notes: '丈夫高管, 消费能力强', memberLevel: 'V5', totalSpent: 45200, preferredTech: '陈技师', preferredTime: '工作日全天', preferredProjects: ['抗衰项目', '私密养护', '排毒养生', '身体SPA'], tagIds: ['高消费', 'VIP', '高意向', '抗衰项目', '私密养护', '排毒养生', '身体SPA', '决策果断', '工作日客户', '老客推荐'] },
  { name: '沈梦', age: 33, occupation: '品牌PR', address: '城中·太古里', skinType: '中性', allergies: '无', notes: '有品味, 适合推高端项目', memberLevel: 'V3', totalSpent: 11800, preferredTech: '李技师', preferredTime: '周末', preferredProjects: ['面部护理', '身体SPA', '抗衰项目'], tagIds: ['中消费', '已转化', '高意向', '面部护理', '身体SPA', '抗衰项目', '职场白领', '朋友圈活跃', '周末客户'] },
];

// ===================== 消费记录生成 =====================
function generateConsumptionRecords(profile) {
  const records = [];
  const numRecords = Math.max(2, Math.floor(profile.totalSpent / 3000) + 1);
  let remaining = profile.totalSpent;
  
  for (let i = 0; i < numRecords && remaining > 0; i++) {
    const preferredCategories = profile.preferredProjects.map(p => {
      if (p.includes('抗衰')) return '抗衰';
      if (p.includes('面部')) return '面部';
      if (p.includes('私密')) return '私密';
      if (p.includes('骨盆')) return '骨盆';
      if (p.includes('排毒')) return '排毒';
      if (p.includes('肩颈')) return '身体';
      return '身体';
    });
    
    // Pick a service matching preferences
    let candidates = SERVICE_ITEMS.filter(s => preferredCategories.includes(s.category));
    if (candidates.length === 0) candidates = SERVICE_ITEMS;
    const service = candidates[Math.floor(Math.random() * candidates.length)];
    
    const amount = Math.min(service.price, remaining);
    remaining -= amount;
    
    const monthsAgo = Math.floor(Math.random() * 18);
    const day = Math.floor(Math.random() * 28) + 1;
    const date = new Date();
    date.setMonth(date.getMonth() - monthsAgo);
    date.setDate(day);
    
    records.push({
      date: date.toISOString().split('T')[0],
      product: service.name,
      amount: amount,
      category: service.category,
      technician: profile.preferredTech,
      satisfaction: Math.floor(Math.random() * 2) + 4  // 4-5 stars
    });
  }
  
  records.sort((a, b) => new Date(b.date) - new Date(a.date));
  return records;
}

// ===================== 完整CRM JSON生成 =====================
function generateCrmJson(profile) {
  const consumptionRecords = generateConsumptionRecords(profile);
  
  // 根据消费额推算合理的入会时长（月）
  // V1: 3-6个月, V2: 6-12个月, V3: 12-24个月, V4: 18-30个月, V5: 24-36个月, V6: 36-48个月
  const levelMonthsMap = { V1: [3, 6], V2: [6, 12], V3: [12, 24], V4: [18, 30], V5: [24, 36], V6: [36, 48] };
  const [minMonths, maxMonths] = levelMonthsMap[profile.memberLevel] || [6, 12];
  const memberMonths = minMonths + Math.floor(Math.random() * (maxMonths - minMonths + 1));
  
  // 到店次数: 平均每月2-3次, 合理范围
  const avgVisitsPerMonth = 2 + Math.random() * 1.5;
  const visitCount = Math.max(3, Math.floor(memberMonths * avgVisitsPerMonth));
  
  const memberSinceDate = new Date();
  memberSinceDate.setMonth(memberSinceDate.getMonth() - memberMonths);
  
  const firstVisitDate = new Date(memberSinceDate);
  firstVisitDate.setDate(firstVisitDate.getDate() - Math.floor(Math.random() * 14)); // 首次到店比入会稍早
  
  const lastVisitDate = new Date();
  lastVisitDate.setDate(lastVisitDate.getDate() - Math.floor(Math.random() * 20));
  
  // 生日: 直接用当前年份减去年龄
  const birthYear = new Date().getFullYear() - profile.age;
  const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  
  return {
    // 会员等级
    memberLevel: profile.memberLevel,
    totalSpent: profile.totalSpent,
    visitCount: visitCount,
    firstVisitDate: firstVisitDate.toISOString().split('T')[0],
    lastVisitDate: lastVisitDate.toISOString().split('T')[0],
    
    // 基本信息
    basicInfo: {
      age: profile.age,
      occupation: profile.occupation,
      address: profile.address,
      skinType: profile.skinType,
      allergies: profile.allergies,
      birthday: `${birthYear}-${birthMonth}-${birthDay}`,
    },
    
    // 消费记录
    consumptionRecords,
    
    // 客户偏好
    preferences: {
      preferredTech: profile.preferredTech,
      preferredTime: profile.preferredTime,
      preferredProjects: profile.preferredProjects,
      communicationStyle: Math.random() > 0.5 ? '喜欢详细解释' : '喜欢简洁沟通',
      notes: profile.notes,
    },
    
    // 积分与权益
    points: Math.floor(profile.totalSpent * 0.1),
    availableCoupons: Math.floor(Math.random() * 3),
    memberSince: memberSinceDate.toISOString().split('T')[0],
  };
}

async function main() {
  console.log('🔄 开始丰富CRM数据与标签系统...\n');
  
  // Step 1: Create all tags (upsert to avoid duplicates)
  console.log('📌 创建标签库...');
  const tagMap = {};
  for (const tagDef of TAG_LIBRARY) {
    const tag = await prisma.tag.upsert({
      where: { name: tagDef.name },
      update: { category: tagDef.category, color: tagDef.color },
      create: tagDef,
    });
    tagMap[tag.name] = tag;
  }
  console.log(`   ✅ ${Object.keys(tagMap).length} 个标签就绪\n`);
  
  // Step 2: Get all customers
  const customers = await prisma.customer.findMany({
    include: { tags: { include: { tag: true } } },
  });
  console.log(`👥 找到 ${customers.length} 位客户\n`);
  
  let updated = 0;
  
  for (const customer of customers) {
    if (customer.isGroup) continue; // Skip group chats
    
    // Find matching profile
    const profile = CUSTOMER_PROFILES.find(p => p.name === customer.name);
    if (!profile) {
      console.log(`   ⏭ ${customer.name} — 无匹配档案, 使用默认数据`);
      // Generate default profile for unmatched customers
      const defaultProfile = {
        name: customer.name,
        age: 30 + Math.floor(Math.random() * 15),
        occupation: ['自由职业', '公司职员', '个体经营', '全职宝妈'][Math.floor(Math.random() * 4)],
        address: ['城南·阳光小区', '城东·翠苑花园', '城北·和谐家园', '城西·紫薇花园'][Math.floor(Math.random() * 4)],
        skinType: ['混合性', '干性', '油性', '中性'][Math.floor(Math.random() * 4)],
        allergies: '无',
        notes: '初次了解, 待深入沟通',
        memberLevel: ['V1', 'V2'][Math.floor(Math.random() * 2)],
        totalSpent: Math.floor(Math.random() * 5000 + 500),
        preferredTech: '不固定',
        preferredTime: ['周末', '工作日', '灵活'][Math.floor(Math.random() * 3)],
        preferredProjects: ['面部护理', '身体SPA'],
        tagIds: ['中意向', '体验过', '面部护理', '身体SPA', Math.random() > 0.5 ? '价格敏感' : '潜力客户'],
      };
      
      const crmData = generateCrmJson(defaultProfile);
      
      // Update customer
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          crmHistory: JSON.stringify(crmData),
          memberLevel: defaultProfile.memberLevel,
          totalSpent: defaultProfile.totalSpent,
        },
      });
      
      // Add tags
      await prisma.customerTag.deleteMany({ where: { customerId: customer.id } });
      for (const tagName of defaultProfile.tagIds) {
        if (tagMap[tagName]) {
          await prisma.customerTag.create({
            data: { customerId: customer.id, tagId: tagMap[tagName].id, addedBy: 'ai' },
          }).catch(() => {}); // Skip duplicates
        }
      }
      
      updated++;
      continue;
    }
    
    console.log(`   📝 ${customer.name} — ${profile.memberLevel} · ¥${profile.totalSpent.toLocaleString()}`);
    
    const crmData = generateCrmJson(profile);
    
    // Update customer record
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        crmHistory: JSON.stringify(crmData),
        memberLevel: profile.memberLevel,
        totalSpent: profile.totalSpent,
        intentScore: profile.totalSpent > 20000 ? 4.5 : profile.totalSpent > 10000 ? 4.0 : 3.5,
        valueScore: profile.totalSpent > 30000 ? 4.8 : profile.totalSpent > 15000 ? 4.0 : 3.0,
      },
    });
    
    // Clear old tags and add new ones
    await prisma.customerTag.deleteMany({ where: { customerId: customer.id } });
    for (const tagName of profile.tagIds) {
      if (tagMap[tagName]) {
        await prisma.customerTag.create({
          data: { customerId: customer.id, tagId: tagMap[tagName].id, addedBy: 'ai' },
        }).catch(() => {}); // Skip duplicates
      }
    }
    
    updated++;
  }
  
  console.log(`\n✅ 完成! 共更新 ${updated} 位客户的CRM档案与标签`);
  console.log(`📊 标签库总数: ${Object.keys(tagMap).length} 个`);
}

main()
  .catch(e => { console.error('❌ 错误:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
