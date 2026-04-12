import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Mock materials for when DB is empty — beauty industry scenario
const MOCK_MATERIALS = [
  {
    id: 'mock-1',
    title: '春季补水焕肤套餐（大促版）',
    type: 'image',
    content: '🌸 春季限定！深层补水+光子嫩肤组合，原价¥1280，限时¥799。\n\n耽误你变美的不是没钱和没时间，而是犹豫和考虑。别让美丽仅仅停留在羡慕别人的朋友圈里，现在就是最好的开始。点击领取你的专属美丽优惠券！',
    tags: '促销,春季,补水',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    title: '客户回访话术模板 - 产康/抗衰',
    type: 'text',
    content: '亲爱的{{客户名}}，距离您上次做面部抗衰/盆骨修复已经{{天数}}天了～最近感觉状态怎么样呀？\n女人的高级感，是别人拿不走的能力和永远追不上的年轻力。你花的每一分钱，在脸上都看得见。我们新到了一台全新的深层提拉设备，要不要这周末来店里体验一下？现在给老客户预约免费送一次肩颈深层舒压哦～',
    tags: '回访,话术,模板,抗衰',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-3',
    title: '朋友圈 — 治愈情感共鸣 (VIP水疗)',
    type: 'moments',
    content: '爱自己，是终身浪漫的开始。在这个快节奏的时代，给自己一点时间，去享受一场深度治愈的SPA，你的身体会告诉你，它有多爱你。✨💆‍♀️\n治愈的不止是皮肤，还有一天琐碎的心情。每做一次护理，就多爱自己一次。 #我的疗愈时刻 #周末日常',
    tags: '朋友圈,SPA,治愈',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-4',
    title: '朋友圈 — 专家人设/日常展示',
    type: 'moments',
    content: '今日营业中。忙碌的日子，也是热爱生活的证明。感谢每一位小仙女的信任与选择，最好的服务，值得等待。\n开门营业，把爱与用心融入每一个细节。好的品质总会遇见好眼光的人，好的服务总会遇到一直回购的你。 #美业人 #匠心服务',
    tags: '朋友圈,开店日常,专业',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-5',
    title: '互动话题营销模板',
    type: 'text',
    content: '如果有一周的假期，你最想体验哪项护理项目？🤔\nA. 深层补水焕肤\nB. 抗衰提拉热玛吉\nC. 全身舒压精油SPA\n\n直接回复字母告诉我，我们将随机抽取 3 位幸运仙女，送出你选中的护理项目单次全额免单体验券！[礼物][礼物]',
    tags: '互动,营销,拓客',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-6',
    title: '朋友圈 — 客户真实反馈',
    type: 'moments',
    content: '今天收到老客户张姐的反馈图，做完3次光子嫩肤后，斑点淡了好多，皮肤也变得通透了✨ 她说现在都不用粉底液了，素颜出门都被夸！每次看到客户的蜕变，都觉得自己的坚持特别有意义❤️ 你想要的惊艳，时间都会给你！ #护肤日记 #真实客照反馈',
    tags: '朋友圈,好评,案例',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function GET(request) {
  try {
    const materials = await prisma.material.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Merge high quality mocks and real materials, filtering out simple old mocks
    const dbMaterials = materials.filter(m => m.content.length > 50);
    return NextResponse.json([...MOCK_MATERIALS, ...dbMaterials]);
  } catch (error) {
    console.error('Error fetching materials:', error);
    // Fallback to mock data on DB error
    return NextResponse.json(MOCK_MATERIALS);
  }
}
