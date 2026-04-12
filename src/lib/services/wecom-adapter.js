/**
 * 企业微信消息通道适配器 (Real OpenAPI Integration)
 */

const WECOM_GATEWAY = process.env.WECOM_GATEWAY || 'https://gateway.bilinl.com';
const OPENAPI_CLIENT_ID = process.env.OPENAPI_CLIENT_ID || '';
const OPENAPI_CLIENT_SECRET = process.env.OPENAPI_CLIENT_SECRET || '';
const OPENAPI_BRIDGE_WX_ID = process.env.OPENAPI_BRIDGE_WX_ID || ''; 
const WECOM_WX_TYPE = process.env.WECOM_WX_TYPE ? parseInt(process.env.WECOM_WX_TYPE) : 2;

// Token Cache
let tokenCache = {
  value: '',
  expiresAt: 0
};

async function getAccessToken() {
  if (!OPENAPI_CLIENT_ID || !OPENAPI_CLIENT_SECRET) {
    throw new Error("Missing OPENAPI_CLIENT_ID or OPENAPI_CLIENT_SECRET in .env");
  }

  const now = Date.now();
  if (tokenCache.value && now < tokenCache.expiresAt) {
    return tokenCache.value;
  }

  const url = `${WECOM_GATEWAY}/thirdparty/user/login/client`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: OPENAPI_CLIENT_ID,
      clientSecret: OPENAPI_CLIENT_SECRET
    })
  });

  const json = await res.json();
  if (json.code !== 0) {
    throw new Error(`OpenAPI login failed: [${json.code}] ${json.message}`);
  }

  const data = json.data || {};
  tokenCache.value = data.value;
  tokenCache.expiresAt = data.expiredTime ? Number(data.expiredTime) - 60000 : now + 1800000;

  return tokenCache.value;
}

export async function sendWeComMessage(wechatId, content, msgType = 'text') {
  console.log(`\n================ WECOM ADAPTER =================`);
  console.log(`[发送通道]: WeCom OpenAPI (Direct)`);
  console.log(`[目标客户]: ${wechatId}`);
  console.log(`[发送主账号]: ${OPENAPI_BRIDGE_WX_ID}`);
  console.log(`[消息内容]:\n${content}`);
  
  if (!OPENAPI_CLIENT_ID) {
    console.warn(`[WARNING]: OPENAPI_CLIENT_ID not set! Using dry-run mode.`);
    await new Promise(r => setTimeout(r, 800));
    return { success: true, externalMsgId: `wx-msg-dry-${Date.now()}` };
  }

  try {
    const token = await getAccessToken();
    const endpoint = '/thirdparty/personal/privateMessage';
    
    // Mapping msgType to OpenAPI type codes
    // 2001: Text, 2010: File/Image
    let apiMsgType = 2001; 
    let msgContent = content;

    if (msgType === 'image' || msgType === 'file') {
      apiMsgType = 2010;
      // For files, content should be the file URL, we'll prefix it if needed
      // Note: the supplier API expects vcHref for files
    }

    const payload = {
      freWxId: wechatId,
      wxId: OPENAPI_BRIDGE_WX_ID,
      wxType: WECOM_WX_TYPE,
      data: [
        {
          msgContent: msgContent,
          msgType: apiMsgType,
          msgNum: 1,
          vcHref: (apiMsgType === 2010) ? msgContent : undefined
        }
      ]
    };

    const res = await fetch(`${WECOM_GATEWAY}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    console.log(`[供应商响应]:`, JSON.stringify(json));
    
    if (json.code !== 0) {
      throw new Error(`Send message failed: code=${json.code} message=${json.message}`);
    }

    if (json.data && json.data.resultCode !== 0 && json.data.resultCode !== "0") {
      throw new Error(`Business failed: resultCode=${json.data.resultCode} resultMsg=${json.data.resultMsg}`);
    }

    console.log(`================================================\n`);
    
    return {
      success: true,
      externalMsgId: `openapi-${Date.now()}`
    };

  } catch (err) {
    console.error(`[WECOM ADAPTER ERROR]:`, err.message);
    throw err;
  }
}
