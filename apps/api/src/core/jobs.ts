import cron from 'node-cron';
import type { Logger } from './logger.js';

export interface JobDef {
  name: string;
  cron: string;
  run: () => Promise<void>;
}

export interface JobScheduler {
  register(job: JobDef): void;
  startAll(): void;
  stopAll(): void;
}

export function createJobScheduler(logger: Logger): JobScheduler {
  const tasks: cron.ScheduledTask[] = [];

  return {
    register(job) {
      const task = cron.schedule(
        job.cron,
        async () => {
          try {
            logger.debug({ job: job.name }, 'Running scheduled job');
            await job.run();
          } catch (err) {
            logger.error({ err, job: job.name }, 'Scheduled job failed');
          }
        },
        { scheduled: false },
      );
      tasks.push(task);
      logger.info({ job: job.name, cron: job.cron }, 'Registered scheduled job');
    },

    startAll() {
      for (const task of tasks) {
        task.start();
      }
      logger.info(`Started ${tasks.length} scheduled job(s)`);
    },

    stopAll() {
      for (const task of tasks) {
        task.stop();
      }
    },
  };
}
