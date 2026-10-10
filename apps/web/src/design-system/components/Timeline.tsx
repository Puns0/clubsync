// ─── Timeline Primitives ───
// For My Schedule page and Clash Block screen.

import * as React from "react";
import { cn } from "../../lib/format";
import { RegistrationStatus } from "../../api/types";

export const Timeline = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("relative flex flex-col pl-4 sm:pl-6 space-y-6 before:absolute before:left-[11px] sm:before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-ink/15", className)} {...props} />
  )
);
Timeline.displayName = "Timeline";

interface TimelineItemProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: RegistrationStatus | "past";
  isClash?: boolean;
}

export const TimelineItem = React.forwardRef<HTMLDivElement, TimelineItemProps>(
  ({ className, status = "confirmed", isClash, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("relative z-10", className)} {...props}>
        {/* Status Dot */}
        <div 
          className={cn(
            "absolute -left-[30px] sm:-left-[38px] top-1 h-3 w-3 rounded-full border-2",
            status === "confirmed" ? "bg-ink border-ink" :
            status === "promoted_pending" ? "bg-vermilion border-vermilion" :
            status === "waitlisted" ? "bg-paper border-ink border-dashed" :
            "bg-ink/20 border-transparent" // past
          )}
        />
        {/* Clash overlap indicator band */}
        {isClash && (
           <div className="absolute -left-[16px] sm:-left-[24px] top-0 bottom-0 w-1 bg-vermilion/50 rounded-full" />
        )}
        <div className="pl-4">
          {children}
        </div>
      </div>
    );
  }
);
TimelineItem.displayName = "TimelineItem";
