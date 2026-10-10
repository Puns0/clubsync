import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

export async function takeStudentLock(prisma: any, userId: string): Promise<void> {
  // We need a stable bigint for pg_advisory_xact_lock.
  // hashtextextended is available in Postgres, but we can also just use a hash in JS.
  // Wait, the prompt explicitly says: SELECT pg_advisory_xact_lock(hashtextextended(userId, 0)) (or an equivalent stable bigint key)
  
  // To avoid issues with missing functions, let's just generate a 64-bit int from the UUID
  const hash = crypto.createHash('md5').update(userId).digest('hex').substring(0, 15);
  const lockId = BigInt('0x' + hash) % 9223372036854775807n;
  
  await prisma.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${lockId.toString()})`);
}
