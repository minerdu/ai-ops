import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TZ = 'Asia/Shanghai';
const KEYWORD_POOL = [
  '预约',
  '价格',
  '活动',
  '体验',
  '优惠券',
  '会员',
  '套餐',
  '水光',
  '抗衰',
  '护理',
  '补水',
  '修复',
  '团购',
  '到店',
  '效果',
  '项目',
  '疗程',
  '皮肤',
];
const RESPONSE_SLA_SECONDS = 60;

function getNowYmdInShanghai() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function parseYmd(ymd) {
  const [year, month, day] = ymd.split('-').map(Number);
  return { year, month, day };
}

function ymdToUtcDate(ymd) {
  const { year, month, day } = parseYmd(ymd);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function utcDateToYmd(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(ymd, days) {
  const date = ymdToUtcDate(ymd);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateToYmd(date);
}

function getWeekStartYmd(ymd) {
  const date = ymdToUtcDate(ymd);
  const weekday = (date.getUTCDay() + 6) % 7;
  return addDays(ymd, -weekday);
}

function getMonthStartYmd(ymd) {
  const { year, month } = parseYmd(ymd);
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function getMonthEndYmd(ymd) {
  const { year, month } = parseYmd(ymd);
  const nextMonthDate = new Date(Date.UTC(year, month, 1, 12));
  nextMonthDate.setUTCDate(nextMonthDate.getUTCDate() - 1);
  return utcDateToYmd(nextMonthDate);
}

function getShanghaiDateParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value),
    hour: Number(parts.find((part) => part.type === 'hour')?.value),
    minute: Number(parts.find((part) => part.type === 'minute')?.value),
    weekday: parts.find((part) => part.type === 'weekday')?.value || '',
  };
}

function formatCnDate(ymd) {
  const { month, day } = parseYmd(ymd);
  return `${month}月${day}日`;
}

function createDateRange(dateParam, viewMode) {
  const anchorYmd = dateParam || getNowYmdInShanghai();

  if (viewMode === 'week') {
    const startYmd = getWeekStartYmd(anchorYmd);
    const endExclusiveYmd = addDays(startYmd, 7);
    const endYmd = addDays(endExclusiveYmd, -1);
    return {
      anchorYmd,
      startYmd,
      endExclusiveYmd,
      reportDate: `${formatCnDate(startYmd)} - ${formatCnDate(endYmd)}`,
    };
  }

  if (viewMode === 'month') {
    const startYmd = getMonthStartYmd(anchorYmd);
    const endYmd = getMonthEndYmd(anchorYmd);
    const endExclusiveYmd = addDays(endYmd, 1);
    const { year, month } = parseYmd(anchorYmd);
    return {
      anchorYmd,
      startYmd,
      endExclusiveYmd,
      reportDate: `${year}年${month}月`,
    };
  }

  return {
    anchorYmd,
    startYmd: anchorYmd,
    endExclusiveYmd: addDays(anchorYmd, 1),
    reportDate: formatCnDate(anchorYmd),
  };
}

function getRangeDates(range) {
  return {
    startAt: new Date(`${range.startYmd}T00:00:00+08:00`),
    endAt: new Date(`${range.endExclusiveYmd}T00:00:00+08:00`),
  };
}

function buildTrendBuckets(range, viewMode) {
  if (viewMode === 'week') {
    const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    return labels.map((label, index) => ({
      key: addDays(range.startYmd, index),
      time: label,
      messages: 0,
      aiReplies: 0,
    }));
  }

  if (viewMode === 'month') {
    const { year, month } = parseYmd(range.anchorYmd);
    const monthEndYmd = getMonthEndYmd(range.anchorYmd);
    const totalDays = parseYmd(monthEndYmd).day;
    const weekRanges = [];
    let cursor = 1;
    let weekIndex = 1;

    while (cursor <= totalDays) {
      const endDay = Math.min(cursor + 6, totalDays);
      weekRanges.push({
        key: `${year}-${String(month).padStart(2, '0')}-${String(cursor).padStart(2, '0')}`,
        time: `第${weekIndex}周`,
        startDay: cursor,
        endDay,
        messages: 0,
        aiReplies: 0,
      });
      cursor = endDay + 1;
      weekIndex += 1;
    }

    return weekRanges;
  }

  return [
    { key: '00-06', time: '凌晨', minHour: 0, maxHour: 6, messages: 0, aiReplies: 0 },
    { key: '06-10', time: '上午', minHour: 6, maxHour: 10, messages: 0, aiReplies: 0 },
    { key: '10-14', time: '中午', minHour: 10, maxHour: 14, messages: 0, aiReplies: 0 },
    { key: '14-18', time: '下午', minHour: 14, maxHour: 18, messages: 0, aiReplies: 0 },
    { key: '18-22', time: '傍晚', minHour: 18, maxHour: 22, messages: 0, aiReplies: 0 },
    { key: '22-24', time: '夜间', minHour: 22, maxHour: 24, messages: 0, aiReplies: 0 },
  ];
}

function populateTrendData(messages, range, viewMode) {
  const buckets = buildTrendBuckets(range, viewMode);

  for (const message of messages) {
    const parts = getShanghaiDateParts(message.createdAt);

    if (viewMode === 'day') {
      const bucket = buckets.find((item) => parts.hour >= item.minHour && parts.hour < item.maxHour);
      if (bucket) {
        bucket.messages += 1;
        if (message.direction === 'outbound' && message.senderType === 'ai') {
          bucket.aiReplies += 1;
        }
      }
      continue;
    }

    if (viewMode === 'week') {
      const bucket = buckets.find((item) => item.key === `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`);
      if (bucket) {
        bucket.messages += 1;
        if (message.direction === 'outbound' && message.senderType === 'ai') {
          bucket.aiReplies += 1;
        }
      }
      continue;
    }

    const bucket = buckets.find((item) => parts.day >= item.startDay && parts.day <= item.endDay);
    if (bucket) {
      bucket.messages += 1;
      if (message.direction === 'outbound' && message.senderType === 'ai') {
        bucket.aiReplies += 1;
      }
    }
  }

  return buckets.map(({ time, messages: count, aiReplies }) => ({
    time,
    messages: count,
    aiReplies,
  }));
}

function extractHighFreqKeywords(messages) {
  const counts = new Map();

  for (const message of messages) {
    const content = message.content || '';
    for (const keyword of KEYWORD_POOL) {
      if (content.includes(keyword)) {
        counts.set(keyword, (counts.get(keyword) || 0) + 1);
      }
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([keyword]) => keyword);
}

function buildCustomerAction(customer) {
  if ((customer.intentScore || 0) >= 4) {
    return {
      reason: '高意向客户仍在犹豫期',
      action: '推送权益',
    };
  }

  if ((customer.silentDays || 0) >= 30 && (customer.totalSpent || 0) > 0) {
    return {
      reason: `已沉默${customer.silentDays}天`,
      action: '发送关怀',
    };
  }

  if ((customer.valueScore || 0) >= 4) {
    return {
      reason: '高价值客户值得重点维护',
      action: '安排回访',
    };
  }

  return {
    reason: '近期有互动可继续跟进',
    action: '继续跟进',
  };
}

function calculateResponseWithin60Rate(messages) {
  const grouped = new Map();

  for (const message of messages) {
    const list = grouped.get(message.conversationId) || [];
    list.push(message);
    grouped.set(message.conversationId, list);
  }

  let totalInboundCount = 0;
  let respondedWithin60Count = 0;

  for (const list of grouped.values()) {
    const sorted = [...list].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    for (let i = 0; i < sorted.length; i += 1) {
      const current = sorted[i];
      if (current.direction !== 'inbound') continue;
      totalInboundCount += 1;

      const nextInboundIndex = sorted.findIndex((message, index) => index > i && message.direction === 'inbound');
      const searchEndIndex = nextInboundIndex === -1 ? sorted.length : nextInboundIndex;
      const reply = sorted.slice(i + 1, searchEndIndex).find((message) => message.direction === 'outbound');
      if (!reply) continue;

      const diffSeconds = Math.round((reply.createdAt.getTime() - current.createdAt.getTime()) / 1000);
      if (diffSeconds >= 0 && diffSeconds <= RESPONSE_SLA_SECONDS) {
        respondedWithin60Count += 1;
      }
    }
  }

  if (totalInboundCount === 0) return 0;
  return Math.round((respondedWithin60Count / totalInboundCount) * 100);
}

function buildAiSummary({ viewMode, totalMessages, aiReplies, sentMessages, newCustomers, pendingTaskApprovals, topKeyword }) {
  const periodText = viewMode === 'day' ? '今日' : viewMode === 'week' ? '本周' : '本月';
  const outboundTotal = aiReplies + sentMessages;
  const automationRate = outboundTotal > 0 ? Math.round((aiReplies / outboundTotal) * 100) : 0;
  const keywordText = topKeyword ? `高频关注集中在“${topKeyword}”` : '暂无明显高频咨询主题';

  return `${periodText}新增客户 ${newCustomers} 人，收到消息 ${totalMessages} 条，AI参与回复 ${aiReplies} 条，自动处理占比约 ${automationRate}%。${keywordText}，当前仍有 ${pendingTaskApprovals} 条待审批任务需要处理。`;
}

function buildAiSuggestions({ highIntentCount, silentCount, pendingTaskApprovals, topKeyword }) {
  const suggestions = [];

  if (highIntentCount > 0) {
    suggestions.push({
      title: '优先推进高意向客户',
      desc: `当前有 ${highIntentCount} 位高意向客户，建议优先触发到店或权益跟进任务`,
      link: '去处理',
    });
  }

  if (silentCount > 0) {
    suggestions.push({
      title: '安排沉默客户唤醒',
      desc: `${silentCount} 位客户沉默超过 30 天，建议低频关怀或激活`,
      link: '去执行',
    });
  }

  if (pendingTaskApprovals > 0) {
    suggestions.push({
      title: '清理待审批任务',
      desc: `当前有 ${pendingTaskApprovals} 条任务待审批，建议优先审核避免执行延迟`,
      link: '去审批',
    });
  }

  if (topKeyword) {
    suggestions.push({
      title: '补充高频话术素材',
      desc: `围绕“${topKeyword}”补齐素材和 SOP，可提升应答效率与转化`,
      link: '去配置',
    });
  }

  return suggestions.slice(0, 3);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const viewMode = searchParams.get('viewMode') || 'day';
    const range = createDateRange(dateParam, viewMode);
    const { startAt, endAt } = getRangeDates(range);

    const [
      totalCustomers,
      newCustomers,
      totalMessages,
      sentMessages,
      aiReplies,
      pendingTagApprovals,
      pendingTaskApprovals,
      highIntentCount,
      silentCount,
      newLeadCount,
      engagedCount,
      convertedCount,
      allMessagesInRange,
      inboundMessagesForKeywords,
      keyCustomerCandidates,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({
        where: {
          createdAt: {
            gte: startAt,
            lt: endAt,
          },
        },
      }),
      prisma.message.count({
        where: {
          direction: 'inbound',
          createdAt: {
            gte: startAt,
            lt: endAt,
          },
        },
      }),
      prisma.message.count({
        where: {
          direction: 'outbound',
          senderType: 'human',
          createdAt: {
            gte: startAt,
            lt: endAt,
          },
        },
      }),
      prisma.message.count({
        where: {
          direction: 'outbound',
          senderType: 'ai',
          createdAt: {
            gte: startAt,
            lt: endAt,
          },
        },
      }),
      prisma.task.count({
        where: {
          approvalStatus: 'pending',
          OR: [
            { title: { contains: '标签' } },
            { triggerReason: { contains: '标签' } },
            { content: { contains: '标签' } },
          ],
        },
      }),
      prisma.task.count({
        where: {
          approvalStatus: 'pending',
        },
      }),
      prisma.customer.count({
        where: {
          intentScore: { gte: 4 },
          OR: [
            {
              lastInteractionAt: {
                gte: startAt,
                lt: endAt,
              },
            },
            {
              createdAt: {
                gte: startAt,
                lt: endAt,
              },
            },
            {
              conversations: {
                some: {
                  messages: {
                    some: {
                      createdAt: {
                        gte: startAt,
                        lt: endAt,
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      }),
      prisma.customer.count({
        where: {
          silentDays: { gte: 30 },
        },
      }),
      prisma.customer.count({
        where: {
          createdAt: {
            gte: startAt,
            lt: endAt,
          },
        },
      }),
      prisma.customer.count({
        where: {
          conversations: {
            some: {
              messages: {
                some: {
                  direction: 'outbound',
                  createdAt: {
                    gte: startAt,
                    lt: endAt,
                  },
                },
              },
            },
          },
        },
      }),
      prisma.customer.count({
        where: {
          OR: [
            {
              totalSpent: { gt: 0 },
              lastOrderAt: {
                gte: startAt,
                lt: endAt,
              },
            },
            {
              lifecycleStatus: 'closed',
              lastInteractionAt: {
                gte: startAt,
                lt: endAt,
              },
            },
          ],
        },
      }),
      prisma.message.findMany({
        where: {
          createdAt: {
            gte: startAt,
            lt: endAt,
          },
        },
        select: {
          conversationId: true,
          direction: true,
          senderType: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      prisma.message.findMany({
        where: {
          direction: 'inbound',
          createdAt: {
            gte: startAt,
            lt: endAt,
          },
        },
        select: {
          content: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1000,
      }),
      prisma.customer.findMany({
        where: {
          OR: [
            { intentScore: { gte: 4 } },
            { silentDays: { gte: 30 } },
            { valueScore: { gte: 4 } },
          ],
        },
        select: {
          name: true,
          intentScore: true,
          silentDays: true,
          valueScore: true,
          totalSpent: true,
          lastInteractionAt: true,
        },
        orderBy: [
          { intentScore: 'desc' },
          { valueScore: 'desc' },
          { silentDays: 'desc' },
          { lastInteractionAt: 'asc' },
        ],
        take: 5,
      }),
    ]);

    const responseWithin60Rate = calculateResponseWithin60Rate(allMessagesInRange);
    const highFreqKeywords = extractHighFreqKeywords(inboundMessagesForKeywords);
    const keyCustomers = keyCustomerCandidates.slice(0, 3).map((customer) => {
      const { reason, action } = buildCustomerAction(customer);
      return {
        name: customer.name,
        reason,
        action,
      };
    });

    const trendData = populateTrendData(allMessagesInRange, range, viewMode);
    const funnelData = [
      { name: '新客户', value: newLeadCount },
      { name: '已破冰', value: engagedCount },
      { name: '高意向', value: highIntentCount },
      { name: '已转化', value: convertedCount },
    ];

    const topKeyword = highFreqKeywords[0];
    const report = {
      reportDate: range.reportDate,
      totalCustomers,
      newCustomers,
      totalMessages,
      sentMessages,
      aiReplies,
      responseWithin60Rate,
      highFreqKeywords,
      keyCustomers,
      trendData,
      funnelData,
      pendingTagApprovals,
      pendingTaskApprovals,
      aiSummary: buildAiSummary({
        viewMode,
        totalMessages,
        aiReplies,
        sentMessages,
        newCustomers,
        pendingTaskApprovals,
        topKeyword,
      }),
      aiSuggestions: buildAiSuggestions({
        highIntentCount,
        silentCount,
        pendingTaskApprovals,
        topKeyword,
      }),
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error fetching daily report:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
