// ─── Event Detail Page ───
// Full event view with registration actions, seat grid, and waitlist queue.

import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

import { TopBar } from "../../design-system/components/TopBar";
import { BottomNav } from "../../design-system/components/BottomNav";
import { Button } from "../../design-system/components/Button";
import { Tag } from "../../design-system/components/Tag";
import { SeatMeter } from "../../design-system/components/SeatMeter";
import { SeatGrid } from "../../design-system/components/SeatGrid";
import { WaitlistQueue } from "../../design-system/components/WaitlistQueue";
import { Skeleton } from "../../design-system/components/Skeleton";
import { ErrorState } from "../../design-system/components/ErrorState";
import { CountdownRing } from "../../design-system/components/CountdownRing";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../design-system/primitives/Dialog";

import { useEvent } from "../../api/hooks/useEvents";
import { useMyRegistrations } from "../../api/hooks/useRegistrations";
import { useAuth } from "../../api/hooks/useAuth";
import { mockRequest } from "../../api/mock/adapter";
import { endpoints } from "../../api/endpoints";
import { registrationKeys } from "../../api/hooks/useRegistrations";
import { eventKeys } from "../../api/hooks/useEvents";
import { formatDateLabel, formatTimeRange } from "../../lib/time";
import { cn } from "../../lib/format";
import { slideUpVariants } from "../../design-system/motion";

import {
  MapPin,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Hourglass,
  Shield,
} from "lucide-react";

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: event, isLoading: eventLoading, isError } = useEvent(id || "");
  const { data: registrations } = useMyRegistrations();

  const [showClashDialog, setShowClashDialog] = useState(false);
  const [clashError, setClashError] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Find the user's registration for this event
  const userReg = useMemo(() => {
    if (!registrations || !id) return undefined;
    return registrations.find(
      (r) => r.eventId === id && r.status !== "cancelled"
    );
  }, [registrations, id]);

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await mockRequest<any>(endpoints.register(id!), {
        method: "POST",
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: registrationKeys.my() });
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id!) });
    },
    onError: (err: any) => {
      if (err?.error?.code === "CLASH") {
        setClashError(err.error.message);
        setShowClashDialog(true);
      }
    },
  });

  // Waitlist mutation
  const waitlistMutation = useMutation({
    mutationFn: async () => {
      const res = await mockRequest<any>(endpoints.joinWaitlist(id!), {
        method: "POST",
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: registrationKeys.my() });
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id!) });
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await mockRequest<any>(endpoints.cancelRegistration(id!), {
        method: "DELETE",
      });
      return res;
    },
    onSuccess: () => {
      setShowCancelDialog(false);
      queryClient.invalidateQueries({ queryKey: registrationKeys.my() });
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id!) });
    },
  });

  // Promotion confirmation
  const confirmPromotionMutation = useMutation({
    mutationFn: async () => {
      const res = await mockRequest<any>(
        endpoints.confirmPromotion(userReg!.id),
        { method: "POST" }
      );
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: registrationKeys.my() });
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id!) });
    },
  });

  // Determine CTA state
  const getCtaState = () => {
    if (!event) return { label: "", action: () => {}, disabled: true, variant: "primary" as const };

    if (userReg) {
      switch (userReg.status) {
        case "confirmed":
          return {
            label: "Seat Confirmed ✓",
            action: () => {},
            disabled: true,
            variant: "secondary" as const,
            showCancel: true,
          };
        case "waitlisted":
          return {
            label: "On Waitlist",
            action: () => {},
            disabled: true,
            variant: "outline" as const,
            showCancel: true,
          };
        case "promoted_pending":
          return {
            label: "Accept Seat",
            action: () => confirmPromotionMutation.mutate(),
            disabled: false,
            variant: "primary" as const,
            showCancel: true,
            isPromotion: true,
          };
        default:
          break;
      }
    }

    const isFull = event.taken >= event.capacity;

    if (isFull) {
      return {
        label: "Join Waitlist",
        action: () => waitlistMutation.mutate(),
        disabled: false,
        variant: "outline" as const,
      };
    }

    return {
      label: "Register Now",
      action: () => registerMutation.mutate(),
      disabled: false,
      variant: "primary" as const,
    };
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-paper">
        <TopBar showBack title="" />
        <div className="p-4 space-y-4 max-w-2xl mx-auto">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full rounded-ticket" />
          <Skeleton className="h-24 w-full rounded-ticket" />
        </div>
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="min-h-screen bg-paper">
        <TopBar showBack title="Error" />
        <div className="p-4">
          <ErrorState onRetry={() => navigate(0)} />
        </div>
      </div>
    );
  }

  const cta = getCtaState();
  const isFull = event.taken >= event.capacity;

  return (
    <div className="min-h-screen bg-paper pb-40">
      <TopBar showBack title={event.clubName} />

      <motion.main
        variants={slideUpVariants}
        initial="initial"
        animate="animate"
        className="px-4 pt-4 max-w-2xl mx-auto space-y-6"
      >
        {/* Title & Status */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-2xl font-display font-bold text-ink leading-tight">
              {event.title}
            </h1>
            {event.status === "live" && (
              <Tag variant="vermilion" className="shrink-0 mt-1 animate-pulse-soft">
                Live
              </Tag>
            )}
          </div>
          <p className="mt-1 text-sm font-semibold text-ink-soft">
            {event.clubName}
          </p>
        </div>

        {/* Meta Info */}
        <div className="space-y-3 rounded-ticket border-2 border-ink/10 bg-paper-deep p-4">
          <div className="flex items-center space-x-3 text-sm">
            <Clock className="h-4 w-4 text-ink-soft shrink-0" />
            <span>
              {formatDateLabel(event.startsAt)} •{" "}
              {formatTimeRange(event.startsAt, event.endsAt)}
            </span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <MapPin className="h-4 w-4 text-ink-soft shrink-0" />
            <span>{event.venue}</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <Users className="h-4 w-4 text-ink-soft shrink-0" />
            <span>
              {event.taken}/{event.capacity} seats taken
            </span>
          </div>
          {event.eligibleDepartments && (
            <div className="flex items-center space-x-3 text-sm">
              <Shield className="h-4 w-4 text-vermilion shrink-0" />
              <span className="text-vermilion font-semibold">
                {event.eligibleDepartments.join(", ")} only
              </span>
            </div>
          )}
          {event.eligibleYears && (
            <div className="flex items-center space-x-3 text-sm">
              <Shield className="h-4 w-4 text-vermilion shrink-0" />
              <span className="text-vermilion font-semibold">
                Year {event.eligibleYears.join(", ")} only
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-soft mb-2">
            About
          </h2>
          <p className="text-sm leading-relaxed text-ink">
            {event.description}
          </p>
        </div>

        {/* Promotion Banner */}
        {userReg?.status === "promoted_pending" && userReg.expiresAt && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 rounded-ticket border-2 border-vermilion bg-vermilion/5 p-4 shadow-stamp-vermilion"
          >
            <CountdownRing
              expiresAt={userReg.expiresAt}
              durationSeconds={120}
              size={56}
            />
            <div className="flex-1">
              <p className="text-sm font-bold text-ink">
                A seat opened up for you!
              </p>
              <p className="text-xs text-ink-soft">
                Accept before the timer runs out, or it passes to the next
                person.
              </p>
            </div>
          </motion.div>
        )}

        {/* Seat Capacity */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-soft mb-3">
            Seats
          </h2>
          <SeatMeter taken={event.taken} capacity={event.capacity} />
          <div className="mt-4">
            <SeatGrid
              capacity={event.capacity}
              taken={event.taken}
              userStatus={
                userReg?.status === "confirmed"
                  ? "confirmed"
                  : userReg?.status === "waitlisted"
                  ? "waitlisted"
                  : "none"
              }
            />
          </div>
        </div>

        {/* User Status Banner */}
        {userReg && (
          <div
            className={cn(
              "flex items-center gap-3 rounded-ticket border-2 p-4",
              userReg.status === "confirmed"
                ? "border-ink bg-ink/5"
                : userReg.status === "waitlisted"
                ? "border-ink/30 bg-paper-deep"
                : "border-vermilion bg-vermilion/5"
            )}
          >
            {userReg.status === "confirmed" && (
              <CheckCircle2 className="h-5 w-5 text-ink shrink-0" />
            )}
            {userReg.status === "waitlisted" && (
              <Hourglass className="h-5 w-5 text-ink-soft shrink-0" />
            )}
            <div className="flex-1">
              <p className="text-sm font-bold">
                {userReg.status === "confirmed"
                  ? "You're registered!"
                  : userReg.status === "waitlisted"
                  ? "You're on the waitlist"
                  : "Action required"}
              </p>
              <p className="text-xs text-ink-soft">
                {userReg.status === "confirmed"
                  ? "Your seat is confirmed. Check your passes."
                  : userReg.status === "waitlisted"
                  ? "We'll notify you when a seat opens up."
                  : "A seat opened up — decide quickly!"}
              </p>
            </div>
          </div>
        )}
      </motion.main>

      {/* Sticky CTA */}
      <div className="fixed bottom-16 left-0 right-0 z-30 border-t-2 border-ink bg-paper p-4 sm:pb-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button
            className="flex-1 h-12"
            variant={cta.variant}
            disabled={cta.disabled}
            isLoading={
              registerMutation.isPending ||
              waitlistMutation.isPending ||
              confirmPromotionMutation.isPending
            }
            onClick={cta.action}
          >
            {cta.label}
          </Button>
          {"showCancel" in cta && cta.showCancel && (
            <Button
              variant="ghost"
              className="h-12 text-ink-soft"
              onClick={() => setShowCancelDialog(true)}
            >
              <XCircle className="h-5 w-5 mr-1" /> Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Clash Dialog */}
      <Dialog open={showClashDialog} onOpenChange={setShowClashDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-vermilion" />
              Schedule Clash
            </DialogTitle>
            <DialogDescription>
              {clashError ||
                "This event overlaps with one of your confirmed registrations."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="secondary"
              onClick={() => setShowClashDialog(false)}
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Registration?</DialogTitle>
            <DialogDescription>
              {userReg?.status === "confirmed"
                ? "Your seat will be released and the next person on the waitlist will be offered it."
                : "You will be removed from the waitlist."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowCancelDialog(false)}
            >
              Keep
            </Button>
            <Button
              variant="destructive"
              isLoading={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              Cancel Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
