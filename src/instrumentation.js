/**
 * Next.js Instrumentation Hook
 *
 * This file is automatically loaded by Next.js on server startup.
 * We use it to start the Cron Worker for autonomous task execution.
 *
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the Node.js server runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startCronWorker } = await import('@/lib/services/cron-worker');
    startCronWorker();
    console.log('[Instrumentation] Cron worker registered.');
  }
}
