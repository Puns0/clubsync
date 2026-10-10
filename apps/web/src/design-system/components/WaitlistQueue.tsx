// ─── WaitlistQueue Component ───
// Animated list of waitlist positions with user highlighting and anonymized names.

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatOrdinal } from "../../lib/format";

interface WaitlistEntryData {
  userId: string;
  position: number;
}

interface WaitlistQueueProps {
  entries: WaitlistEntryData[];
  currentUserId: string;
  className?: string;
}

export function WaitlistQueue({ entries, currentUserId, className }: WaitlistQueueProps) {
  // Sort by position just in case
  const sorted = [...entries].sort((a, b) => a.position - b.position);

  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      <AnimatePresence mode="popLayout">
        {sorted.map((entry) => {
          const isUser = entry.userId === currentUserId;
          return (
            <motion.div
              layout
              key={entry.userId}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={cn(
                "flex items-center justify-between rounded-lg border-2 p-3",
                isUser
                  ? "border-vermilion bg-vermilion/5 shadow-stamp-sm"
                  : "border-ink/10 bg-paper-deep"
              )}
            >
              <div className="flex items-center space-x-3">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold font-tabular",
                    isUser ? "bg-vermilion text-paper" : "bg-ink text-paper"
                  )}
                >
                  {entry.position}
                </span>
                <span className={cn("font-semibold", isUser ? "text-ink" : "text-ink-soft")}>
                  {isUser ? "You" : `Student #${entry.position}`}
                </span>
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                {formatOrdinal(entry.position)} in line
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      
      {sorted.length === 0 && (
        <div className="py-4 text-center text-sm font-medium text-ink-soft border-2 border-dashed border-ink/20 rounded-lg">
          Waitlist is currently empty.
        </div>
      )}
    </div>
  );
}
