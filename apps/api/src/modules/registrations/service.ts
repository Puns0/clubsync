import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../../core/errors.js';
import { ModuleContext } from '../../core/module.js';
import { takeStudentLock } from '../../lib/locks.js';
import { assertEligibility } from '../../lib/eligibility.js';
import { hasClash, checkOverlap } from '../../lib/overlap.js';
import { isPromotable } from './promotionPolicy.js';
import { issueQrPass } from '../../integrations/qr.js';

export class RegistrationsService {
  constructor(private ctx: ModuleContext) {}

  async registerTransaction(eventId: string, userId: string, preferred: boolean) {
    return this.ctx.prisma.$transaction(async (tx) => {
      // 1. Lock the event row
      const [event] = await tx.$queryRaw<any[]>`
        SELECT * FROM "events"
        WHERE "id" = ${eventId}
        FOR UPDATE
      `;
      if (!event) throw new AppError('NOT_FOUND', 'Event not found');
      if (event.status !== 'SCHEDULED') throw new AppError('EVENT_CLOSED', 'Event is not scheduled');
      if (event.startsAt <= new Date()) throw new AppError('EVENT_CLOSED', 'Registration is closed (event started)');

      // 2. Take student advisory lock
      await takeStudentLock(tx, userId);

      // 3. User & Eligibility
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError('NOT_FOUND', 'User not found');
      if (!user.emailVerifiedAt) throw new AppError('FORBIDDEN', 'Email not verified');
      
      const existingReg = await tx.registration.findFirst({
        where: { eventId, userId, status: { in: ['CONFIRMED', 'WAITLISTED', 'PROMOTED_PENDING', 'ATTENDED', 'NO_SHOW'] } }
      });
      if (existingReg) {
        return { status: 'ALREADY_REGISTERED', registration: existingReg };
      }

      assertEligibility(user.year, user.department, event.eligibleYears || [], event.eligibleDepartments || []);

      // 4. Clashes
      const activeRegs = await tx.registration.findMany({
        where: { userId, status: { in: ['CONFIRMED', 'PROMOTED_PENDING', 'ATTENDED', 'NO_SHOW'] } },
        include: { event: true }
      });
      
      const clashingRegs = activeRegs.filter(r => checkOverlap(event.startsAt, event.endsAt, r.event.startsAt, r.event.endsAt));
      
      const seatsTaken = await tx.registration.count({
        where: { eventId, status: { in: ['CONFIRMED', 'PROMOTED_PENDING', 'ATTENDED', 'NO_SHOW'] } }
      });
      const isFull = seatsTaken >= event.capacity;

      if (clashingRegs.length > 0) {
        if (!isFull) {
          throw new AppError('CLASH', 'You have a time conflict', {
            conflicts: clashingRegs.map(r => ({
              registrationId: r.id, eventId: r.event.id, title: r.event.title, startsAt: r.event.startsAt, endsAt: r.event.endsAt
            })),
            options: { type: 'swap', releaseRegistrationId: clashingRegs[0].id }
          });
        } else if (!preferred) {
          throw new AppError('CLASH', 'Time conflict. You can join the preferred waitlist.', {
            options: { type: 'join_waitlist_preferred' }
          });
        }
      }

      // 5. Run promotion first to settle queue (in case there's an empty seat but a queue)
      // Actually, if we just run promoteNext, it will fill the seat if there are waiters.
      // But we haven't created our registration yet.
      // Let's create it.
      let finalStatus: 'CONFIRMED' | 'WAITLISTED' = 'WAITLISTED';
      let waitlistPos = null;

      const waitlistCount = await tx.registration.count({
        where: { eventId, status: 'WAITLISTED' }
      });

      if (!isFull && waitlistCount === 0) {
        finalStatus = 'CONFIRMED';
      } else {
        waitlistPos = waitlistCount + 1;
      }

      const newReg = await tx.registration.create({
        data: {
          eventId,
          userId,
          status: finalStatus,
          waitlistPosition: waitlistPos,
          waitlistedAt: finalStatus === 'WAITLISTED' ? new Date() : null,
          isPreferred: preferred,
          qrTokenHash: finalStatus === 'CONFIRMED' ? await issueQrPass('temp') : null,
        }
      });

      if (finalStatus === 'CONFIRMED') {
        // Need to update QR token hash properly with correct ID
        const qrHash = await issueQrPass(newReg.id);
        await tx.registration.update({ where: { id: newReg.id }, data: { qrTokenHash: qrHash } });
      }

      // After commit, we need to emit socket events
      // So we return the created reg to do it outside transaction or via hooks
      return { status: finalStatus, registration: newReg };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 5000, timeout: 10000 });
  async promoteNext(eventId: string, tx: Prisma.TransactionClient) {
    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event) return;

    const seatsTaken = await tx.registration.count({
      where: { eventId, status: { in: ['CONFIRMED', 'PROMOTED_PENDING', 'ATTENDED', 'NO_SHOW'] } }
    });
    const freeSeats = event.capacity - seatsTaken;
    if (freeSeats <= 0) return;

    const waitlist = await tx.registration.findMany({
      where: { eventId, status: 'WAITLISTED' },
      orderBy: { waitlistPosition: 'asc' }
    });

    for (let i = 0; i < Math.min(freeSeats, waitlist.length); i++) {
      const candidate = waitlist[i];
      const user = await tx.user.findUnique({ where: { id: candidate.userId } });
      if (!user) continue;

      const activeRegs = await tx.registration.findMany({
        where: { userId: candidate.userId, status: { in: ['CONFIRMED', 'PROMOTED_PENDING', 'ATTENDED', 'NO_SHOW'] } },
        include: { event: true }
      });

      const policyInput = {
        user,
        event: { startsAt: event.startsAt, endsAt: event.endsAt, eligibleYears: event.eligibleYears, eligibleDepartments: event.eligibleDepartments },
        activeRegistrations: activeRegs
      };

      const policyResult = isPromotable(policyInput);

      if (policyResult.action === 'SKIP') {
        continue;
      }

      // We promote!
      const windowSeconds = Number(process.env.DEMO_CONFIRM_WINDOW_SECONDS || process.env.CONFIRM_WINDOW_SECONDS || 1800);
      const expiresAt = new Date(Date.now() + windowSeconds * 1000);

      await tx.registration.update({
        where: { id: candidate.id },
        data: {
          status: 'PROMOTED_PENDING',
          promotedAt: new Date(),
          expiresAt,
          waitlistPosition: null,
          conflictsWith: policyResult.action === 'PROMOTE_WITH_CHOICE' ? policyResult.conflicts : null
        }
      });
    }

    // Renumber waitlist
    await this.renumberWaitlist(eventId, tx);
  }

  async renumberWaitlist(eventId: string, tx: Prisma.TransactionClient) {
    const remaining = await tx.registration.findMany({
      where: { eventId, status: 'WAITLISTED' },
      orderBy: { waitlistedAt: 'asc' } // Actually should be waitlistPosition or created_at
    });
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].waitlistPosition !== i + 1) {
        await tx.registration.update({
          where: { id: remaining[i].id },
          data: { waitlistPosition: i + 1 }
        });
      }
    }
  }

  async cancelAndRelease(registrationId: string, reason: any) {
    return this.ctx.prisma.$transaction(async (tx) => {
      const reg = await tx.registration.findUnique({ where: { id: registrationId }, include: { event: true } });
      if (!reg) throw new AppError('NOT_FOUND', 'Registration not found');
      if (reg.event.startsAt <= new Date()) throw new AppError('EVENT_CLOSED', 'Event has already started');

      await takeStudentLock(tx, reg.userId);
      // Lock event
      await tx.$executeRawUnsafe(`SELECT * FROM "events" WHERE "id" = '${reg.eventId}' FOR UPDATE`);

      await tx.registration.update({
        where: { id: registrationId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason, waitlistPosition: null, expiresAt: null }
      });

      if (['CONFIRMED', 'PROMOTED_PENDING'].includes(reg.status)) {
        await this.promoteNext(reg.eventId, tx);
      } else if (reg.status === 'WAITLISTED') {
        await this.renumberWaitlist(reg.eventId, tx);
      }

      return reg;
    });
  }
}
