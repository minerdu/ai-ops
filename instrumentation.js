import { startCronWorker } from '@/lib/services/cron-worker';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    startCronWorker();
    console.log('[Instrumentation] Cron worker registered.');
  }
}
