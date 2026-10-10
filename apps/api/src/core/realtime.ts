/** RealtimeHub — abstraction for live event pushing via Socket.io.
 * Default is a no-op. Part 2's realtime module swaps in the Socket.io implementation. */

export interface RealtimeHub {
  toUser(userId: string, event: string, payload: unknown): void;
  toEvent(eventId: string, event: string, payload: unknown): void;
  toClub(clubId: string, event: string, payload: unknown): void;
}

export class NoopRealtimeHub implements RealtimeHub {
  toUser(): void {}
  toEvent(): void {}
  toClub(): void {}
}
