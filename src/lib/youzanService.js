/**
 * 有赞 CRM API 服务层
 * 
 * 封装有赞开放平台 API 调用，包括：
 * - Token 获取与自动刷新
 * - 客户搜索 & 详情查询
 * - 全量/增量同步客户数据到本地数据库
 * 
 * 有赞免签模式 API 格式：
 * https://open.youzanyun.com/api/{接口名}/{版本号}?access_token={token}
 */

import prisma from '@/lib/prisma';

const YOUZAN_TOKEN_URL = 'https://open.youzanyun.com/auth/token';
const YOUZAN_API_BASE = 'https://open.youzanyun.com/api';

// ─────────────────────────────────────────────
//  Token 管理
// ─────────────────────────────────────────────

/**
 * 获取有效的 access_token
 * 如果 token 已过期或不存在，自动从有赞 API 获取新 token
 */
export async function getAccessToken() {
  const config = await prisma.youzanConfig.findUnique({ where: { id: 'default' } });
  
  if (!config || !config.appId || !config.appSecret) {
    throw new Error('有赞 CRM 配置不完整，请先配置 App ID 和 App Secret');
  }

  // 检查缓存的 token 是否仍然有效（提前 5 分钟过期）
  if (config.accessToken && config.tokenExpiry) {
    const now = new Date();
    const expiry = new Date(config.tokenExpiry);
    const buffer = 5 * 60 * 1000; // 5 minutes
    if (now.getTime() < expiry.getTime() - buffer) {
      return config.accessToken;
    }
  }

  // Token 过期或不存在，重新获取
  const newToken = await refreshToken(config.appId, config.appSecret);
  return newToken;
}

/**
 * 从有赞 API 获取新的 access_token
 */
async function refreshToken(appId, appSecret) {
  const body = {
    authorize_type: 'silent',
    client_id: appId,
    client_secret: appSecret,
    grant_type: 'silent',
  };

  const res = await fetch(YOUZAN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`获取有赞 Token 失败: HTTP ${res.status} - ${text}`);
  }

  const data = await res.json();

  if (!data.data || !data.data.access_token) {
    throw new Error(`获取有赞 Token 失败: ${JSON.stringify(data)}`);
  }

  const accessToken = data.data.access_token;
  const expiresIn = data.data.expires || 86400; // 默认 24 小时
  const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

  // 将 token 缓存到数据库
  await prisma.youzanConfig.update({
    where: { id: 'default' },
    data: { accessToken, tokenExpiry },
  });

  return accessToken;
}

// ─────────────────────────────────────────────
//  通用 API 调用
// ─────────────────────────────────────────────

/**
 * 调用有赞开放平台 API（免签模式）
 * @param {string} apiName - 接口名称，如 'youzan.scrm.customer.search'
 * @param {string} version - 接口版本，如 '3.0.0'
 * @param {object} params - 请求参数
 * @returns {object} API 返回数据
 */
export async function callApi(apiName, version, params = {}) {
  const token = await getAccessToken();
  const url = `${YOUZAN_API_BASE}/${apiName}/${version}?access_token=${token}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`有赞 API 调用失败 [${apiName}]: HTTP ${res.status} - ${text}`);
  }

  const result = await res.json();

  // 有赞 API 错误码检查
  if (result.error_response) {
    const err = result.error_response;
    throw new Error(`有赞 API 错误 [${apiName}]: ${err.code} - ${err.msg}`);
  }

  return result.response || result.data || result;
}

// ─────────────────────────────────────────────
//  客户数据接口
// ─────────────────────────────────────────────

/**
 * 搜索有赞 CRM 客户列表
 * @param {number} page - 页码（从 1 开始）
 * @param {number} pageSize - 每页条数（最大 50）
 * @param {object} filters - 可选过滤条件
 */
export async function searchCustomers(page = 1, pageSize = 50, filters = {}) {
  const params = {
    page,
    page_size: pageSize,
    ...filters,
  };

  return await callApi('youzan.scrm.customer.search', '3.0.0', params);
}

/**
 * 获取单个客户详情
 * @param {string} accountId - 有赞客户 account_id
 */
export async function getCustomerDetail(accountId) {
  return await callApi('youzan.scrm.customer.detail.get', '3.0.0', {
    account_id: accountId,
  });
}

/**
 * 获取客户积分信息
 * @param {string} mobile - 手机号
 */
export async function getCustomerPoints(mobile) {
  return await callApi('youzan.crm.customer.points.get', '4.0.0', {
    mobile,
  });
}

// ─────────────────────────────────────────────
//  同步逻辑
// ─────────────────────────────────────────────

/**
 * 从有赞 CRM 全量同步客户数据到本地数据库
 * @returns {object} 同步结果摘要
 */
export async function syncAllCustomers() {
  const startTime = Date.now();
  let totalFetched = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let page = 1;
  const pageSize = 50;
  let hasMore = true;
  const errors = [];

  while (hasMore) {
    try {
      const result = await searchCustomers(page, pageSize);
      
      // 有赞返回的客户列表
      const customers = result.record_list || result.items || result.list || [];
      const totalResults = result.total_results || result.total || 0;

      if (customers.length === 0) {
        hasMore = false;
        break;
      }

      for (const yzCustomer of customers) {
        try {
          const syncResult = await upsertCustomerFromYouzan(yzCustomer);
          totalFetched++;
          if (syncResult === 'created') totalCreated++;
          else if (syncResult === 'updated') totalUpdated++;
          else totalSkipped++;
        } catch (e) {
          errors.push({ customer: yzCustomer.name || yzCustomer.nick, error: e.message });
          totalSkipped++;
        }
      }

      // 检查是否还有更多页
      if (page * pageSize >= totalResults || customers.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }

      // 避免过快请求，限流保护
      await sleep(200);

    } catch (e) {
      errors.push({ page, error: e.message });
      hasMore = false; // 遇到 API 错误时停止
    }
  }

  // 更新最后同步时间
  await prisma.youzanConfig.update({
    where: { id: 'default' },
    data: { lastSyncAt: new Date() },
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  return {
    success: errors.length === 0,
    duration: `${duration}s`,
    totalFetched,
    totalCreated,
    totalUpdated,
    totalSkipped,
    errors,
  };
}

/**
 * 将单个有赞客户数据 upsert 到本地数据库
 * @param {object} yzCustomer - 有赞返回的客户对象
 * @returns {'created'|'updated'|'skipped'}
 */
async function upsertCustomerFromYouzan(yzCustomer) {
  // 提取有赞客户的核心字段
  const youzanId = String(yzCustomer.account_id || yzCustomer.user_id || yzCustomer.yz_open_id || '');
  const name = yzCustomer.name || yzCustomer.nick || yzCustomer.real_name || '未知客户';
  const phone = yzCustomer.mobile || yzCustomer.telephone || null;
  const avatar = yzCustomer.avatar || null;
  const memberLevel = yzCustomer.level_name || yzCustomer.member_level || null;
  const totalSpent = parseFloat(yzCustomer.trade_money || yzCustomer.total_trade_amount || 0) / 100; // 有赞金额单位为分
  const orderCount = parseInt(yzCustomer.trade_count || yzCustomer.total_trade_count || 0);
  const lastOrderAt = yzCustomer.last_trade_time ? new Date(yzCustomer.last_trade_time) : null;
  const fansId = yzCustomer.fans_id ? String(yzCustomer.fans_id) : null;

  if (!youzanId) {
    return 'skipped';
  }

  // 先查找是否已存在
  const existing = await prisma.customer.findFirst({
    where: {
      OR: [
        { youzanId },
        ...(phone ? [{ phone }] : []),
      ],
    },
  });

  const customerData = {
    name,
    phone,
    avatar,
    youzanId,
    youzanFansId: fansId,
    memberLevel,
    totalSpent,
    orderCount,
    lastOrderAt,
    syncedAt: new Date(),
    source: 'youzan',
  };

  if (existing) {
    // 更新已有客户
    await prisma.customer.update({
      where: { id: existing.id },
      data: customerData,
    });
    return 'updated';
  } else {
    // 创建新客户
    await prisma.customer.create({
      data: {
        ...customerData,
        lifecycleStatus: 'new',
        intentScore: 0,
        valueScore: 0,
        satisfactionScore: 0,
        conversations: {
          create: {
            status: 'active',
            aiMode: true,
          },
        },
      },
    });
    return 'created';
  }
}

// ─────────────────────────────────────────────
//  测试连接
// ─────────────────────────────────────────────

/**
 * 测试有赞 API 连接是否正常
 * @returns {object} { success, message, shopInfo }
 */
export async function testConnection() {
  try {
    const token = await getAccessToken();
    
    // 尝试调用一个轻量 API 来验证连接
    // 先尝试获取店铺信息
    try {
      const shopInfo = await callApi('youzan.shop.get', '3.0.0', {});
      return {
        success: true,
        message: `连接成功！店铺: ${shopInfo.name || '已连接'}`,
        tokenValid: true,
        shopInfo,
      };
    } catch (shopErr) {
      // 店铺 API 可能没权限，但 token 获取成功说明凭证有效
      return {
        success: true,
        message: `Token 获取成功，API 连接正常`,
        tokenValid: true,
        tokenPreview: token.substring(0, 8) + '...',
      };
    }
  } catch (e) {
    return {
      success: false,
      message: e.message,
      tokenValid: false,
    };
  }
}

// ─────────────────────────────────────────────
//  工具函数
// ─────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
