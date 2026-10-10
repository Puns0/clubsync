// ─── Simulator Drawer ───
// Dev-only panel to emit mock socket events.

import { useState } from "react";
import { mockSocket } from "../api/mock/socket";
import { state } from "../api/mock/state";
import { Button } from "../design-system/components/Button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../design-system/primitives/Sheet";
import { Settings, Users, Ticket, Bell, RotateCcw } from "lucide-react";
import type { ClubEvent, Registration } from "../api/types";

export function SimulatorDrawer() {
  const [open, setOpen] = useState(false);

  // Helper to find the first upcoming event that user is NOT registered for
  const getDemoEvent = (): ClubEvent | undefined => {
    return state.events.find(
      (e) => e.status !== "ended" && !state.getUserRegistrations(state.currentUser.id).some(r => r.eventId === e.id)
    );
  };

  const getDemoWaitlistReg = (): Registration | undefined => {
    return state.getUserRegistrations(state.currentUser.id).find(r => r.status === "waitlisted");
  };

  const handleFillSeat = () => {
    const event = state.events.find(e => e.status !== "ended" && e.taken < e.capacity);
    if (event) {
      event.taken += 1;
      mockSocket.serverEmit("seat:updated", {
        eventId: event.id,
        taken: event.taken,
        capacity: event.capacity
      });
    }
  };

  const handleWaitlistMove = () => {
    const reg = getDemoWaitlistReg();
    if (reg && reg.waitlistPosition && reg.waitlistPosition > 1) {
      reg.waitlistPosition -= 1;
      const list = state.getWaitlist(reg.eventId);
      const entry = list.find(l => l.registrationId === reg.id);
      if (entry) entry.position = reg.waitlistPosition;

      mockSocket.serverEmit("waitlist:moved", {
        eventId: reg.eventId,
        registrationId: reg.id,
        position: reg.waitlistPosition,
      });
    }
  };

  const handleOfferPromotion = () => {
    const reg = getDemoWaitlistReg();
    if (reg) {
      state.updateRegistrationStatus(reg.id, "promoted_pending");
      const expires = new Date(Date.now() + 60000).toISOString();
      reg.promotedAt = new Date().toISOString();
      reg.expiresAt = expires;
      
      mockSocket.serverEmit("promotion:offered", {
        registrationId: reg.id,
        eventId: reg.eventId,
        promotedAt: reg.promotedAt,
        expiresAt: expires,
      });
    }
  };

  const handleReset = () => {
    state.reset();
    window.location.reload();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="fixed bottom-24 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-paper shadow-stamp"
          aria-label="Dev Simulator"
        >
          <Settings className="h-6 w-6" />
        </button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-vermilion" />
            Dev Simulator
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <Button variant="secondary" className="w-full justify-start" onClick={handleFillSeat}>
            <Users className="h-4 w-4 mr-2" /> Fill random seat
          </Button>
          <Button variant="secondary" className="w-full justify-start" onClick={handleWaitlistMove}>
            <Ticket className="h-4 w-4 mr-2" /> Advance waitlist
          </Button>
          <Button variant="secondary" className="w-full justify-start" onClick={handleOfferPromotion}>
            <Bell className="h-4 w-4 mr-2" /> Offer promotion
          </Button>
          <div className="pt-4 border-t-2 border-dashed border-ink/20">
            <Button variant="destructive" className="w-full" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" /> Reset State
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
