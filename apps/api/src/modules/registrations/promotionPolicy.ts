import { checkEligibility } from '../../lib/eligibility.js';
import { checkOverlap } from '../../lib/overlap.js';

export type PromotionPolicyInput = {
  user: {
    year: number;
    department: string;
    emailVerifiedAt: Date | null;
    disabledAt: Date | null;
  };
  event: {
    startsAt: Date;
    endsAt: Date;
    eligibleYears: number[];
    eligibleDepartments: string[];
  };
  activeRegistrations: Array<{
    id: string;
    status: 'CONFIRMED' | 'WAITLISTED' | 'PROMOTED_PENDING' | 'ATTENDED' | 'NO_SHOW' | 'CANCELLED';
    event: { id: string; startsAt: Date; endsAt: Date };
  }>;
};

export type PromotionPolicyResult =
  | { action: 'SKIP'; reason: string }
  | { action: 'PROMOTE'; requiresChoice: false }
  | { action: 'PROMOTE_WITH_CHOICE'; conflicts: any[] };

export function isPromotable(input: PromotionPolicyInput): PromotionPolicyResult {
  const { user, event, activeRegistrations } = input;

  // 1. Check eligibility and verification
  if (user.disabledAt || !user.emailVerifiedAt) {
    return { action: 'SKIP', reason: 'User is unverified or deleted' };
  }

  const eligibility = checkEligibility(user.year, user.department, event.eligibleYears, event.eligibleDepartments);
  if (!eligibility.eligible) {
    return { action: 'SKIP', reason: 'User is no longer eligible' };
  }

  // Find all overlapping registrations
  const overlaps = activeRegistrations.filter(reg => {
    return checkOverlap(event.startsAt, event.endsAt, reg.event.startsAt, reg.event.endsAt);
  });

  const conflictsToStore = [];

  for (const overlap of overlaps) {
    if (overlap.status === 'ATTENDED' || overlap.status === 'NO_SHOW') {
      return { action: 'SKIP', reason: 'Overlapping seat already checked in' };
    }
    
    // If the overlapping event has already started, it cannot be released
    const now = new Date();
    if (overlap.event.startsAt <= now) {
      return { action: 'SKIP', reason: 'Overlapping event has already started' };
    }

    if (overlap.status === 'PROMOTED_PENDING') {
      return { action: 'SKIP', reason: 'User already has another open promotion offer' };
    }

    if (overlap.status === 'CONFIRMED') {
      // It's releasable (event hasn't started, not attended)
      conflictsToStore.push({
        registrationId: overlap.id,
        eventId: overlap.event.id,
      });
    }
  }

  if (conflictsToStore.length > 0) {
    return { action: 'PROMOTE_WITH_CHOICE', conflicts: conflictsToStore };
  }

  return { action: 'PROMOTE', requiresChoice: false };
}
