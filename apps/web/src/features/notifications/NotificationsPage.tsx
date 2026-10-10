// ─── Notifications Page ───
// Shows all notifications with mark-all-read functionality.

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

import { TopBar } from "../../design-system/components/TopBar";
import { BottomNav } from "../../design-system/components/BottomNav";
import { Button } from "../../design-system/components/Button";
import { Skeleton } from "../../design-system/components/Skeleton";
import { EmptyState } from "../../design-system/components/EmptyState";
import { slideUpVariants, staggerParent, staggerChild } from "../../design-system/motion";
import { mockRequest } from "../../api/mock/adapter";
import { endpoints } from "../../api/endpoints";
import { cn } from "../../lib/format";
import { formatDateLabel, formatTime } from "../../lib/time";
import type { Notification } from "../../api/types";

import { Bell, BellOff, CheckCheck, Ticket, Clock, ChevronRight } from "lucide-react";

const notifKeys = {
  all: ["notifications"] as const,
};

function useNotifications() {
  return useQuery({
    queryKey: notifKeys.all,
    queryFn: async () => {
      const res = await mockRequest<{ data: { notifications: Notification[] } }>(
        endpoints.notifications
      );
      return res.data.notifications;
    },
  });
}

function getNotifIcon(type: Notification["type"]) {
  switch (type) {
    case "promotion_offered":
      return <Ticket className="h-5 w-5 text-vermilion" />;
    case "promotion_expired":
      return <Clock className="h-5 w-5 text-ink-soft" />;
    case "registration_confirmed":
      return <CheckCheck className="h-5 w-5 text-ink" />;
    case "event_reminder":
      return <Bell className="h-5 w-5 text-vermilion" />;
    default:
      return <Bell className="h-5 w-5 text-ink-soft" />;
  }
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: notifications, isLoading } = useNotifications();

  const unreadCount = useMemo(
    () => notifications?.filter((n) => !n.readAt).length || 0,
    [notifications]
  );

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await mockRequest(endpoints.readAllNotifications, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notifKeys.all });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await mockRequest(endpoints.readNotification(id), { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notifKeys.all });
    },
  });

  const handleNotifClick = (notif: Notification) => {
    if (!notif.readAt) {
      markReadMutation.mutate(notif.id);
    }
    if (notif.eventId) {
      navigate(`/event/${notif.eventId}`);
    }
  };

  return (
    <div className="min-h-screen bg-paper pb-24">
      <TopBar
        showBack
        title="Notifications"
        action={
          unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-1" /> Read all
            </Button>
          ) : undefined
        }
      />

      <main className="px-4 pt-4 max-w-2xl mx-auto">
        {isLoading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        )}

        {!isLoading && (!notifications || notifications.length === 0) && (
          <EmptyState
            icon={<BellOff className="h-6 w-6" />}
            title="No notifications yet"
            description="You'll see updates about your registrations and events here."
          />
        )}

        {!isLoading && notifications && notifications.length > 0 && (
          <motion.div
            variants={staggerParent}
            initial="initial"
            animate="animate"
            className="space-y-2"
          >
            <AnimatePresence>
              {notifications.map((notif) => (
                <motion.button
                  key={notif.id}
                  variants={staggerChild}
                  layout
                  onClick={() => handleNotifClick(notif)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors",
                    notif.readAt
                      ? "border-transparent bg-paper hover:bg-paper-deep"
                      : "border-ink/10 bg-paper-deep hover:bg-paper-deep/80"
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {getNotifIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        notif.readAt ? "font-medium text-ink-soft" : "font-bold text-ink"
                      )}
                    >
                      {notif.title}
                    </p>
                    <p className="text-xs text-ink-faint mt-0.5 line-clamp-2">
                      {notif.body}
                    </p>
                    <p className="text-[10px] text-ink-faint mt-1 uppercase tracking-wider">
                      {formatDateLabel(notif.createdAt)} •{" "}
                      {formatTime(notif.createdAt)}
                    </p>
                  </div>
                  {!notif.readAt && (
                    <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-vermilion" />
                  )}
                  {notif.eventId && (
                    <ChevronRight className="h-4 w-4 text-ink-faint mt-1 shrink-0" />
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
