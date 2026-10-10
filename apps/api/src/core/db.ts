import { PrismaClient } from '@prisma/client';
import type { Logger } from './logger.js';

let prisma: PrismaClient | null = null;

export function createPrismaClient(logger: Logger): PrismaClient {
  if (prisma) return prisma;

  prisma = new PrismaClient({
    log: [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

  prisma.$on('error' as never, (e: { message: string }) => {
    logger.error({ err: e.message }, 'Prisma error');
  });

  prisma.$on('warn' as never, (e: { message: string }) => {
    logger.warn({ msg: e.message }, 'Prisma warning');
  });

  return prisma;
}

export { PrismaClient };
