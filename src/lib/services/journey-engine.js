import prisma from '@/lib/prisma';
import { batchReview } from '@/lib/services/auto-review';

const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';
const HOUR_MS = 60 * 60 * 1000;
const ACTIVE_SCAN_INTERVAL_MS = HOUR_MS;
const OFF_HOURS_SCAN_INTERVAL_MS = 6 * HOUR_MS;
const RECENT_TASK_LOOKBACK_DAYS = 45;
const DEFAULT_DAILY_LIMIT = 120;

function pad(value) {
  return String(value).padStart(2, '0');
}

function getShanghaiParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function toShanghaiDate(parts) {
  return new Date(`${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second ?? 0)}+08:00`);
}

function getShanghaiDayRange(date = new Date()) {
  const parts = getShanghaiParts(date);
  return {
    start: new Date(`${parts.year}-${pad(parts.month)}-${pad(parts.day)}T00:00:00+08:00`),
    end: new Date(`${parts.year}-${pad(parts.month)}-${pad(parts.day)}T23:59:59.999+08:00`),
    key: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
  };
}

function getShanghaiHourStart(date = new Date()) {
  const parts = getShanghaiParts(date);
  return new Date(`${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:00:00+08:00`);
}

function getShanghaiBusinessStart(date = new Date(), hour = 8) {
  const parts = getShanghaiParts(date);
  return new Date(`${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(hour)}:00:00+08:00`);
}

function isActiveScanHour(hour) {
  return hour >= 8 && hour < 22;
}

function hoursSince(date) {
  if (!date) {
    return Number.POSITIVE_INFINITY;
  }
  return (Date.now() - new Date(date).getTime()) / HOUR_MS;
}

function daysSince(date) {
  return hoursSince(date) / 24;
}

function getLookbackStart(days) {
  return new Date(Date.now() - days * 24 * HOUR_MS);
}

function getJourneyLabelFromReason(reason = '') {
  return JOURNEY_DEFINITIONS.find((item) => reason.includes(item.label))?.label || null;
}

function isRecognizedJourneyTask(task) {
  return Boolean(getJourneyLabelFromReason(task?.triggerReason || ''));
}

function hasTag(customer, keyword) {
  return customer.tags?.some((item) => item.tag?.name?.includes(keyword));
}

function hasOpenTask(tasks) {
  return tasks.some((task) => (
    task.approvalStatus === 'pending' ||
    task.executeStatus === 'draft' ||
    task.executeStatus === 'scheduled'
  ));
}

function hasRecentAnyTask(tasks, hours) {
  return tasks.some((task) => hoursSince(task.createdAt) < hours);
}

function getLastJourneyTask(tasks, label) {
  return tasks
    .filter((task) => task.triggerSource === 'journey' && (task.triggerReason || '').includes(label))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;
}

function buildScheduledAt(delayMinutes) {
  const now = new Date();
  const parts = getShanghaiParts(now);

  if (parts.hour < 9) {
    return new Date(`${parts.year}-${pad(parts.month)}-${pad(parts.day)}T09:${pad(Math.min(delayMinutes, 50))}:00+08:00`);
  }

  if (parts.hour >= 21) {
    const nextDay = new Date(`${parts.year}-${pad(parts.month)}-${pad(parts.day)}T09:00:00+08:00`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    nextDay.setUTCMinutes(nextDay.getUTCMinutes() + delayMinutes);
    return nextDay;
  }

  return new Date(Date.now() + delayMinutes * 60 * 1000);
}

function buildCustomerContext(customer, recentTasks) {
  const lastInteractionAt = customer.lastInteractionAt ? new Date(customer.lastInteractionAt) : null;
  const lastOrderAt = customer.lastOrderAt ? new Date(customer.lastOrderAt) : null;

  return {
    recentTasks,
    hasOpenTask: hasOpenTask(recentTasks),
    hasRecentTouch: hasRecentAnyTask(recentTasks, 24),
    daysSinceLastInteraction: daysSince(lastInteractionAt),
    daysSinceLastOrder: daysSince(lastOrderAt),
    lastInteractionAt,
    lastOrderAt,
  };
}

async function loadDailyLimit() {
  try {
    const rule = await prisma.safetyRule.findFirst({
      where: {
        ruleType: 'daily_limit',
        isActive: true,
      },
      select: {
        value: true,
      },
    });

    const value = Number(rule?.value);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  } catch (error) {
    console.warn('[JourneyEngine] Failed to load daily limit:', error.message);
  }

  return DEFAULT_DAILY_LIMIT;
}

async function shouldRunScheduledScan() {
  const lastScan = await prisma.auditLog.findFirst({
    where: {
      entityType: 'journey_engine',
      entityId: 'ops-hourly-scan',
      action: 'scan_success',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!lastScan) {
    return true;
  }

  const now = new Date();
  const nowParts = getShanghaiParts(now);
  const lastScanAt = new Date(lastScan.createdAt);

  if (!isActiveScanHour(nowParts.hour)) {
    return now.getTime() - lastScanAt.getTime() >= OFF_HOURS_SCAN_INTERVAL_MS;
  }

  const currentHourStart = getShanghaiHourStart(now);
  if (lastScanAt < currentHourStart) {
    return true;
  }

  const businessStart = getShanghaiBusinessStart(now, 8);
  if (lastScanAt < businessStart && now >= businessStart) {
    return true;
  }

  return now.getTime() - lastScanAt.getTime() >= ACTIVE_SCAN_INTERVAL_MS;
}

const JOURNEY_DEFINITIONS = [
  {
    key: 'convert',
    label: '客户转化',
    title: '高意向客户限时转化推进',
    priority: 100,
    scheduleDelayMinutes: 12,
    cooldownHours: 96,
    minGapHours: 24,
    maxCreatePerScan: 8,
    match(customer, context) {
      return customer.orderCount === 0 &&
        customer.intentScore >= 4.3 &&
        customer.silentDays >= 2 &&
        customer.silentDays <= 10 &&
        context.daysSinceLastInteraction <= 7;
    },
    score(customer) {
      return customer.intentScore * 20 + customer.silentDays;
    },
    content(customer) {
      return `${customer.name}，我把您之前咨询的项目方案又重新整理了一下。考虑到您目前正处在决策阶段，这边可以先为您保留一张200元限时体验券和本周优先预约名额，您回复我一个方便的时间，我直接帮您安排。`;
    },
    reason(customer) {
      return `旅程自动运营·客户转化｜${customer.name} 处于高意向犹豫期，适合通过限时权益推进成交。`;
    },
  },
  {
    key: 'visit',
    label: '到店体验',
    title: '到店体验预约推进',
    priority: 95,
    scheduleDelayMinutes: 16,
    cooldownHours: 72,
    minGapHours: 24,
    maxCreatePerScan: 10,
    match(customer, context) {
      return customer.orderCount === 0 &&
        customer.intentScore >= 3.8 &&
        customer.silentDays <= 4 &&
        context.daysSinceLastInteraction <= 5;
    },
    score(customer) {
      return customer.intentScore * 18 + Math.max(0, 6 - customer.silentDays);
    },
    content(customer) {
      return `${customer.name}，这两天门店给体验客户预留了更适合沟通肤质和项目方案的时段，我先帮您锁一个优先名额。您回复我一个方便的时间，我来帮您把到店流程安排顺。`;
    },
    reason(customer) {
      return `旅程自动运营·到店体验｜${customer.name} 已到预约推进阶段，适合尽快引导到店。`;
    },
  },
  {
    key: 'followup',
    label: '跟进提醒',
    title: '高意向客户跟进提醒',
    priority: 88,
    scheduleDelayMinutes: 10,
    cooldownHours: 96,
    minGapHours: 24,
    maxCreatePerScan: 12,
    match(customer) {
      return customer.orderCount === 0 &&
        customer.intentScore >= 3 &&
        customer.silentDays >= 4 &&
        customer.silentDays < 14;
    },
    score(customer) {
      return customer.intentScore * 16 + customer.silentDays;
    },
    content(customer) {
      return `${customer.name}，前两天和您沟通的护理方案我这边还为您留着。最近店里时段排得比较快，如果您还在评估，我可以根据您的顾虑再帮您细化一次，让您判断起来更轻松。`;
    },
    reason(customer) {
      return `旅程自动运营·跟进提醒｜${customer.name} 短期沉默但意向仍在，需要低频持续推进。`;
    },
  },
  {
    key: 'reactivate',
    label: '沉默激活',
    title: '沉默客户重新激活',
    priority: 82,
    scheduleDelayMinutes: 18,
    cooldownHours: 120,
    minGapHours: 48,
    maxCreatePerScan: 8,
    match(customer) {
      return customer.lifecycleStatus === 'silent' || customer.silentDays >= 14;
    },
    score(customer) {
      return customer.silentDays + customer.valueScore * 8;
    },
    content(customer) {
      return `${customer.name}，好久没有和您联系了。最近门店在做一轮老客户护理复盘，我先根据您之前的体验记录整理了一份重新开始会更轻松的建议，如果您愿意，我可以先发给您参考。`;
    },
    reason(customer) {
      return `旅程自动运营·沉默激活｜${customer.name} 已沉默较久，按低频唤醒节奏重新激活。`;
    },
  },
  {
    key: 'upsell',
    label: '升单复购',
    title: '高价值客户升单复购推进',
    priority: 76,
    scheduleDelayMinutes: 22,
    cooldownHours: 336,
    minGapHours: 72,
    maxCreatePerScan: 6,
    match(customer, context) {
      return (customer.orderCount >= 2 || customer.totalSpent >= 2000 || hasTag(customer, 'VIP')) &&
        context.daysSinceLastOrder >= 14 &&
        context.daysSinceLastOrder <= 45 &&
        customer.satisfactionScore >= 4;
    },
    score(customer) {
      return customer.totalSpent / 100 + customer.orderCount * 10 + customer.satisfactionScore * 8;
    },
    content(customer) {
      return `${customer.name}，结合您最近几次护理项目的体验反馈，我帮您整理了一套更适合当前阶段的升级方案。若您愿意，我可以安排一次更系统的复购规划沟通，让后续效果更连续。`;
    },
    reason(customer) {
      return `旅程自动运营·升单复购｜${customer.name} 具备复购与升单潜力，适合阶段性经营。`;
    },
  },
  {
    key: 'aftercare',
    label: '客户关怀',
    title: '到店后客户关怀回访',
    priority: 70,
    scheduleDelayMinutes: 26,
    cooldownHours: 168,
    minGapHours: 48,
    maxCreatePerScan: 8,
    match(customer, context) {
      return customer.orderCount >= 1 &&
        context.daysSinceLastOrder <= 14 &&
        customer.satisfactionScore >= 4 &&
        customer.silentDays >= 3;
    },
    score(customer) {
      return customer.satisfactionScore * 20 + Math.max(0, 14 - customer.silentDays);
    },
    content(customer) {
      return `${customer.name}，想跟进一下您最近这次体验后的感受。如果这几天在护理、修复或者居家保养上有任何问题，随时告诉我，我可以继续给您补充更针对的建议。`;
    },
    reason(customer) {
      return `旅程自动运营·客户关怀｜${customer.name} 近期已有消费，需要进行节奏化回访。`;
    },
  },
  {
    key: 'order',
    label: '下单购买',
    title: '疗程续购与订单确认提醒',
    priority: 64,
    scheduleDelayMinutes: 20,
    cooldownHours: 120,
    minGapHours: 48,
    maxCreatePerScan: 6,
    match(customer, context) {
      return customer.orderCount === 1 &&
        context.daysSinceLastOrder >= 7 &&
        context.daysSinceLastOrder <= 30 &&
        customer.satisfactionScore >= 3.5;
    },
    score(customer) {
      return customer.satisfactionScore * 18 + customer.valueScore * 10;
    },
    content(customer) {
      return `${customer.name}，上次体验后的护理记录我已经帮您整理好了。为了让效果更稳定，我建议把下一阶段的护理节奏一起安排上，您确认后我这边可以直接帮您保留合适的时段。`;
    },
    reason(customer) {
      return `旅程自动运营·下单购买｜${customer.name} 已完成首单体验，适合推进续购或疗程确认。`;
    },
  },
  {
    key: 'intent_chat',
    label: '需求沟通',
    title: '需求确认与方案沟通',
    priority: 58,
    scheduleDelayMinutes: 8,
    cooldownHours: 72,
    minGapHours: 24,
    maxCreatePerScan: 10,
    match(customer, context) {
      return customer.orderCount === 0 &&
        customer.intentScore >= 2.5 &&
        customer.intentScore < 4.3 &&
        customer.silentDays >= 1 &&
        customer.silentDays <= 5 &&
        context.daysSinceLastInteraction <= 10;
    },
    score(customer) {
      return customer.intentScore * 14 + Math.max(0, 6 - customer.silentDays);
    },
    content(customer) {
      return `${customer.name}，您上次提到比较关注效果、预算和到店安排，我把更适合您当前阶段的两套方案重新梳理了一下。如果您愿意，我可以继续帮您把重点差异讲清楚。`;
    },
    reason(customer) {
      return `旅程自动运营·需求沟通｜${customer.name} 已进入需求确认阶段，需要继续补充方案沟通。`;
    },
  },
  {
    key: 'new_ice',
    label: '新客破冰',
    title: '新客破冰欢迎触达',
    priority: 52,
    scheduleDelayMinutes: 6,
    cooldownHours: 72,
    minGapHours: 24,
    maxCreatePerScan: 10,
    match(customer) {
      return customer.orderCount === 0 &&
        (customer.lifecycleStatus === 'new' || customer.silentDays <= 2) &&
        customer.intentScore < 3.2;
    },
    score(customer) {
      return Math.max(0, 3.2 - customer.intentScore) * 10 + Math.max(0, 3 - customer.silentDays);
    },
    content(customer) {
      return `${customer.name}，欢迎来到门店社群，我是您的专属运营顾问。先为您准备了一份新客体验指南和到店建议，您如果方便，也可以告诉我当前最想改善的问题，我帮您先做个简单判断。`;
    },
    reason(customer) {
      return `旅程自动运营·新客破冰｜${customer.name} 处于新客阶段，需要低压力完成首触达。`;
    },
  },
];

function buildJourneyCandidate(customer, definition, context) {
  const lastSameJourneyTask = getLastJourneyTask(context.recentTasks, definition.label);
  if (lastSameJourneyTask && hoursSince(lastSameJourneyTask.createdAt) < definition.cooldownHours) {
    return null;
  }

  if (context.hasOpenTask || hasRecentAnyTask(context.recentTasks, definition.minGapHours)) {
    return null;
  }

  if (!definition.match(customer, context)) {
    return null;
  }

  return {
    customer,
    definition,
    score: definition.score(customer, context),
  };
}

async function loadCustomerTaskMap(customerIds) {
  const recentTasks = await prisma.task.findMany({
    where: {
      customerId: {
        in: customerIds,
      },
      OR: [
        {
          createdAt: {
            gte: getLookbackStart(RECENT_TASK_LOOKBACK_DAYS),
          },
        },
        {
          approvalStatus: 'pending',
        },
        {
          executeStatus: {
            in: ['draft', 'scheduled'],
          },
        },
      ],
    },
    select: {
      id: true,
      customerId: true,
      createdAt: true,
      approvalStatus: true,
      executeStatus: true,
      triggerSource: true,
      triggerReason: true,
    },
  });

  return recentTasks.reduce((map, task) => {
    if (!map.has(task.customerId)) {
      map.set(task.customerId, []);
    }
    map.get(task.customerId).push(task);
    return map;
  }, new Map());
}

export async function generateJourneyTasks() {
  const shouldRun = await shouldRunScheduledScan();
  if (!shouldRun) {
    return { scanned: false, created: 0, approved: 0, pending: 0, createdByJourney: {} };
  }

  const customers = await prisma.customer.findMany({
    where: {
      isGroup: false,
      wechatId: {
        not: null,
      },
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  const customerTaskMap = await loadCustomerTaskMap(customers.map((customer) => customer.id));
  const { start: dayStart, end: dayEnd } = getShanghaiDayRange();
  const dailyLimit = await loadDailyLimit();
  const createdToday = await prisma.task.count({
    where: {
      triggerSource: 'journey',
      createdAt: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
  });

  const createdByJourney = Object.fromEntries(JOURNEY_DEFINITIONS.map((item) => [item.label, 0]));
  const candidates = [];

  for (const customer of customers) {
    const recentTasks = customerTaskMap.get(customer.id) || [];
    const context = buildCustomerContext(customer, recentTasks);
    const matchedCandidate = JOURNEY_DEFINITIONS
      .map((definition) => buildJourneyCandidate(customer, definition, context))
      .find(Boolean);

    if (matchedCandidate) {
      candidates.push(matchedCandidate);
    }
  }

  candidates.sort((a, b) => {
    if (b.definition.priority !== a.definition.priority) {
      return b.definition.priority - a.definition.priority;
    }
    return b.score - a.score;
  });

  const createdTaskIds = [];
  let createdCount = createdToday;

  for (const candidate of candidates) {
    if (createdCount >= dailyLimit) {
      break;
    }

    if (createdByJourney[candidate.definition.label] >= candidate.definition.maxCreatePerScan) {
      continue;
    }

    const task = await prisma.task.create({
      data: {
        customerId: candidate.customer.id,
        title: candidate.definition.title,
        taskType: 'text',
        content: candidate.definition.content(candidate.customer),
        triggerSource: 'journey',
        triggerReason: candidate.definition.reason(candidate.customer),
        approvalStatus: 'pending',
        executeStatus: 'draft',
        scheduledAt: buildScheduledAt(candidate.definition.scheduleDelayMinutes),
      },
    });

    createdTaskIds.push(task.id);
    createdByJourney[candidate.definition.label] += 1;
    createdCount += 1;
  }

  let approved = [];
  let pending = [];
  if (createdTaskIds.length > 0) {
    const reviewResult = await batchReview(createdTaskIds);
    approved = reviewResult.approved;
    pending = reviewResult.pending;
  }

  await prisma.auditLog.create({
    data: {
      entityType: 'journey_engine',
      entityId: 'ops-hourly-scan',
      action: 'scan_success',
      operator: 'system',
      reason: `完成运营旅程扫描，生成 ${createdTaskIds.length} 条任务`,
      metadata: JSON.stringify({
        customerCount: customers.length,
        createdTaskIds,
        createdByJourney,
        approvedCount: approved.length,
        pendingCount: pending.length,
        dailyLimit,
      }),
    },
  });

  return {
    scanned: true,
    created: createdTaskIds.length,
    approved: approved.length,
    pending: pending.length,
    createdByJourney,
  };
}

export async function getJourneySummary() {
  const journeyTasks = await prisma.task.findMany({
    where: {
      triggerSource: 'journey',
    },
    select: {
      triggerReason: true,
      executeStatus: true,
      scheduledAt: true,
      createdAt: true,
    },
  });

  const todayRange = getShanghaiDayRange();
  const stageCounts = Object.fromEntries(JOURNEY_DEFINITIONS.map((item) => [item.label, 0]));
  const recognizedJourneyTasks = journeyTasks.filter(isRecognizedJourneyTask);
  const legacyJourneyCount = Math.max(0, journeyTasks.length - recognizedJourneyTasks.length);

  for (const task of recognizedJourneyTasks) {
    const label = getJourneyLabelFromReason(task.triggerReason);
    if (label) {
      stageCounts[label] += 1;
    }
  }

  const lastScan = await prisma.auditLog.findFirst({
    where: {
      entityType: 'journey_engine',
      entityId: 'ops-hourly-scan',
      action: 'scan_success',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return {
    totalJourney: recognizedJourneyTasks.length,
    todayCount: recognizedJourneyTasks.filter((task) => {
      const current = new Date(task.scheduledAt || task.createdAt);
      return current >= todayRange.start && current <= todayRange.end;
    }).length,
    executedRate: recognizedJourneyTasks.length > 0
      ? Math.round((recognizedJourneyTasks.filter((task) => task.executeStatus === 'success').length / recognizedJourneyTasks.length) * 100)
      : 0,
    stages: JOURNEY_DEFINITIONS.map((item) => ({
      key: item.key,
      label: item.label,
      count: stageCounts[item.label] || 0,
    })),
    legacyJourneyCount,
    lastScanAt: lastScan?.createdAt?.toISOString() || null,
  };
}

export const JOURNEY_LABELS = JOURNEY_DEFINITIONS.map((item) => item.label);
