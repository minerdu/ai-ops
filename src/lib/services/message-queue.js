/**
 * 消息延迟发送队列管理器
 * 
 * 模拟真人的多条短消息 + 打字延时，支持智能跳过（新消息中断原队列）。
 * 基于内存队列实现，Next.js 服务端进程内有效。
 */

// 内存队列：conversationId → { messages[], timer, cancelled }
const queues = new Map();

/**
 * 计算拟人化打字延迟（基于文本长度）
 * @param {string} text - 消息文本
 * @returns {number} 延迟毫秒数
 */
function calculateTypingDelay(text) {
  const baseDelay = text.length * 50; // 每个字 50ms
  const randomJitter = Math.floor(Math.random() * 1000) + 500; // 500-1500ms 随机抖动
  return Math.min(baseDelay + randomJitter, 5000); // 最长不超过5秒
}

/**
 * 将多条消息加入延迟发送队列
 * @param {string} conversationId - 会话ID
 * @param {Array<{text: string, delay_ms?: number}>} messages - 待发送消息列表
 * @param {Function} sendCallback - 发送回调: async (conversationId, text, index) => void
 * @returns {Promise<boolean>} 是否全部发送完成
 */
export async function enqueue(conversationId, messages, sendCallback) {
  // 如果该会话有正在排队的消息，先取消
  cancel(conversationId);

  const queueState = {
    messages,
    cancelled: false,
    completedCount: 0,
  };
  queues.set(conversationId, queueState);

  console.log(`[MessageQueue] Enqueued ${messages.length} messages for conv ${conversationId}`);

  for (let i = 0; i < messages.length; i++) {
    // 检查是否已被取消（新消息到达时会触发取消）
    if (queueState.cancelled) {
      console.log(`[MessageQueue] Queue cancelled for conv ${conversationId} at message ${i + 1}/${messages.length}`);
      return false;
    }

    const msg = messages[i];
    const delay = msg.delay_ms || calculateTypingDelay(msg.text);

    // 等待延迟（模拟打字时间）
    await new Promise(resolve => {
      queueState.timer = setTimeout(resolve, delay);
    });

    // 再次检查取消状态（delay 期间可能被取消）
    if (queueState.cancelled) {
      console.log(`[MessageQueue] Queue cancelled during delay for conv ${conversationId}`);
      return false;
    }

    // 执行发送
    try {
      await sendCallback(conversationId, msg.text, i);
      queueState.completedCount++;
      console.log(`[MessageQueue] Sent message ${i + 1}/${messages.length} for conv ${conversationId}`);
    } catch (err) {
      console.error(`[MessageQueue] Failed to send message ${i + 1} for conv ${conversationId}:`, err);
    }
  }

  // 发送完成，清理队列
  queues.delete(conversationId);
  return true;
}

/**
 * 取消指定会话的待发送消息队列
 * @param {string} conversationId - 会话ID
 */
export function cancel(conversationId) {
  const queue = queues.get(conversationId);
  if (queue) {
    queue.cancelled = true;
    if (queue.timer) {
      clearTimeout(queue.timer);
    }
    queues.delete(conversationId);
    console.log(`[MessageQueue] Cancelled queue for conv ${conversationId}`);
  }
}

/**
 * 检查指定会话是否有待发送的消息
 * @param {string} conversationId - 会话ID
 * @returns {boolean}
 */
export function hasQueuedMessages(conversationId) {
  return queues.has(conversationId);
}

/**
 * 获取队列状态摘要
 * @param {string} conversationId - 会话ID
 * @returns {object|null}
 */
export function getQueueStatus(conversationId) {
  const queue = queues.get(conversationId);
  if (!queue) return null;
  return {
    totalMessages: queue.messages.length,
    completedCount: queue.completedCount,
    cancelled: queue.cancelled,
  };
}

/**
 * 获取所有活跃队列的摘要（调试用）
 * @returns {Array}
 */
export function getAllActiveQueues() {
  const result = [];
  for (const [convId, queue] of queues.entries()) {
    result.push({
      conversationId: convId,
      totalMessages: queue.messages.length,
      completedCount: queue.completedCount,
    });
  }
  return result;
}

export default {
  enqueue,
  cancel,
  hasQueuedMessages,
  getQueueStatus,
  getAllActiveQueues,
  calculateTypingDelay,
};
