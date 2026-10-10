// ─── My Schedule Page ───
// Timeline view of the user's registered events grouped by day.

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import { TopBar } from "../../design-system/components/TopBar";
import { BottomNav } from "../../design-system/components/BottomNav";
import { NotificationBell } from "../../design-system/components/NotificationBell";
import { Timeline, TimelineItem } from "../../design-system/components/Timeline";
import { Tag } from "../../design-system/components/Tag";
import { Skeleton } from "../../design-system/components/Skeleton";
import { EmptyState } from "../../design-system/components/EmptyState";
import { Button } from "../../design-system/components/Button";

import { useMyRegistrations } from "../../api/hooks/useRegistrations";
import { useEvents } from "../../api/hooks/useEvents";
import { formatDateLabel, formatTimeRange, hasClash } from "../../lib/time";
import { cn } from "../../lib/format";
import { staggerParent, staggerChild } from "../../design-system/motion";

import { CalendarOff, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { ClubEvent, Registration } from "../../api/types";

interface ScheduleEntry {
  registration: Registration;
  event: ClubEvent;
  hasClash: boolean;
}

export function SchedulePage() {
  const { data: registrations, isLoading: regsLoading } = useMyRegistrations();
  const { data: allEvents, isLoading: eventsLoading } = useEvents();

  const isLoading = regsLoading || eventsLoading;

  // Build schedule entries with clash detection
  const scheduleEntries = useMemo(() => {
    if (!registrations || !allEvents) return [];

    const activeRegs = registrations.filter(
      (r) => r.status === "confirmed" || r.status === "waitlisted" || r.status === "promoted_pending"
    );

    const entries: ScheduleEntry[] = activeRegs
      .map((reg) => {
        const event = allEvents.find((e) => e.id === reg.eventId);
        if (!event) return null;
        return { registration: reg, event, hasClash: false };
      })
      .filter((e): e is ScheduleEntry => e !== null);

    // Sort by start time
    entries.sort(
      (a, b) =>
        new Date(a.event.startsAt).getTime() -
        new Date(b.event.startsAt).getTime()
    );

    // Mark clashes: for each confirmed entry, check if it clashes with any other confirmed entry
    const confirmed = entries.filter((e) => e.registration.status === "confirmed" || e.registration.status === "promoted_pending");
    for (let i = 0; i < confirmed.length; i++) {
      for (let j = i + 1; j < confirmed.length; j++) {
        if (
          hasClash(
            confirmed[i].event.startsAt,
            confirmed[i].event.endsAt,
            confirmed[j].event.startsAt,
            confirmed[j].event.endsAt
          )
        ) {
          confirmed[i].hasClash = true;
          confirmed[j].hasClash = true;
        }
      }
    }

    return entries;
  }, [registrations, allEvents]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, ScheduleEntry[]>();
    scheduleEntries.forEach((entry) => {
      const label = formatDateLabel(entry.event.startsAt);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(entry);
    });
    return groups;
  }, [scheduleEntries]);

  const statusTag = (status: Registration["status"]) => {
    switch (status) {
      case "confirmed":
        return <Tag>Confirmed</Tag>;
      case "waitlisted":
        return <Tag variant="outline">Waitlisted</Tag>;
      case "promoted_pending":
        return <Tag variant="vermilion">Action Needed</Tag>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-paper pb-24">
      <TopBar
        title="My Schedule"
        action={<NotificationBell unreadCount={0} />}
      />

      <main className="px-4 pt-6 max-w-2xl mx-auto">
        {isLoading && (
          <div className="space-y-6">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        )}

        {!isLoading && scheduleEntries.length === 0 && (
          <EmptyState
            icon={<CalendarOff className="h-6 w-6" />}
            title="No events scheduled"
            description="Register for events to build your schedule."
            action={
              <Link to="/">
                <Button variant="secondary">Browse Events</Button>
              </Link>
            }
          />
        )}

        {!isLoading && scheduleEntries.length > 0 && (
          <motion.div
            variants={staggerParent}
            initial="initial"
            animate="animate"
            className="space-y-8"
          >
            {Array.from(groupedByDate.entries()).map(([dateLabel, entries]) => (
              <motion.section key={dateLabel} variants={staggerChild}>
                <h2 className="text-lg font-display font-bold text-ink mb-4">
                  {dateLabel}
                </h2>
                <Timeline>
                  {entries.map((entry) => (
                    <TimelineItem
                      key={entry.registration.id}
                      status={entry.registration.status}
                      isClash={entry.hasClash}
                    >
                      <Link
                        to={`/event/${entry.event.id}`}
                        className="group block"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-ink group-hover:text-vermilion transition-colors line-clamp-1">
                              {entry.event.title}
                            </p>
                            <p className="text-xs text-ink-soft mt-0.5">
                              {entry.event.clubName} •{" "}
                              {formatTimeRange(
                                entry.event.startsAt,
                                entry.event.endsAt
                              )}
                            </p>
                            <p className="text-xs text-ink-faint mt-0.5">
                              {entry.event.venue}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {entry.hasClash && (
                              <Tag variant="vermilion" className="text-[10px]">
                                Clash
                              </Tag>
                            )}
                            {statusTag(entry.registration.status)}
                            <ChevronRight className="h-4 w-4 text-ink-faint" />
                          </div>
                        </div>
                      </Link>
                    </TimelineItem>
                  ))}
                </Timeline>
              </motion.section>
            ))}
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
