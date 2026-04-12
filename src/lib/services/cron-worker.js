/**
 * Cron Worker — 进程内定时执行调度器
 *
 * 在 Next.js Server 进程中以 setInterval 方式轮询 `/api/cron/engine`，
 * 自动执行已审批+已排期的任务。
 *
 * 设计原则：
 * - 单例模式：避免多次 import 导致重复启动
 * - 优雅重入保护：上一次轮询未结束时跳过
 * - 失败静默：不因 cron 异常影响主进程
 */

let _started = false;
let _running = false;
let _intervalId = null;

const POLL_INTERVAL_MS = 60_000; // 60 秒轮询一次

/**
 * 获取本地服务 URL（在 Next.js 内部调用自身 API）
 */
function getBaseUrl() {
  // 在 Server-side Next.js 中，直接使用 localhost
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}`;
}

/**
 * 执行一次轮询
 */
async function tick() {
  if (_running) {
    console.log('[CronWorker] Previous tick still running, skipping.');
    return;
  }
  _running = true;

  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/cron/engine`, {
      method: 'GET',
      headers: { 'x-cron-secret': 'internal' },
      signal: AbortSignal.timeout(30_000), // 30 秒超时
    });

    if (!res.ok) {
      console.warn(`[CronWorker] Engine returned status ${res.status}`);
      return;
    }

    const data = await res.json();

    if (data.status === 'idle') {
      // 无任务，静默
      return;
    }

    console.log(
      `[CronWorker] Engine run: ${data.executed || 0} executed, ${data.failed || 0} failed, ${data.skipped || 0} skipped`
    );
  } catch (err) {
    // 启动初期服务可能尚未就绪，静默处理
    if (!err.message?.includes('ECONNREFUSED')) {
      console.warn('[CronWorker] Tick error:', err.message);
    }
  } finally {
    _running = false;
  }
}

/**
 * 启动 Cron Worker（单例）
 *
 * 调用方式：在服务端入口处（如 Server Component 或 instrumentation.js）调用一次即可。
 */
export function startCronWorker() {
  if (_started) return;
  _started = true;

  console.log(`[CronWorker] Starting with ${POLL_INTERVAL_MS / 1000}s interval`);

  // 首次延迟 10 秒执行（等待服务完全启动）
  setTimeout(() => {
    tick();
    _intervalId = setInterval(tick, POLL_INTERVAL_MS);
  }, 10_000);
}

/**
 * 停止 Cron Worker（用于测试或 graceful shutdown）
 */
export function stopCronWorker() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
  _started = false;
  _running = false;
  console.log('[CronWorker] Stopped.');
}

/**
 * 获取 Worker 状态
 */
export function getCronWorkerStatus() {
  return {
    started: _started,
    running: _running,
    intervalMs: POLL_INTERVAL_MS,
  };
}

export default { startCronWorker, stopCronWorker, getCronWorkerStatus };
