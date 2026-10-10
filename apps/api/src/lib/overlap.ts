export function checkOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  // startA < endB AND endA > startB
  // Back-to-back is NOT a clash.
  return startA < endB && endA > startB;
}

export function hasClash(
  targetStart: Date,
  targetEnd: Date,
  registrations: Array<{ event: { startsAt: Date; endsAt: Date } }>
): boolean {
  return registrations.some(reg => checkOverlap(targetStart, targetEnd, reg.event.startsAt, reg.event.endsAt));
}
