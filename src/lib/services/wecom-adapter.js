/**
 * 企业微信消息通道适配器
 */
export async function sendWeComMessage(wechatId, content, msgType = 'text') {
  console.log(`\n================ WECOM ADAPTER =================`);
  console.log(`[发送通道]: WeCom External Contact API`);
  console.log(`[目标客户]: ${wechatId}`);
  console.log(`[消息类型]: ${msgType}`);
  console.log(`[内容载荷]:\n${content}`);
  console.log(`================================================\n`);
  
  // Simulate network
  await new Promise(r => setTimeout(r, 800));
  
  // Return success
  return {
    success: true,
    externalMsgId: `wx-msg-${Date.now()}`
  };
}
