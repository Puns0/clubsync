// ─── NotificationBell Component ───
// Bell icon with a badge for unread count.

import * as React from "react";
import { Bell } from "lucide-react";
import { IconButton } from "./IconButton";
import { cn } from "../../lib/format";
import { AnimatedNumber } from "./AnimatedNumber";
import { motion, AnimatePresence } from "framer-motion";
import { popVariants } from "../motion";

export interface NotificationBellProps
  extends React.ComponentPropsWithoutRef<typeof IconButton> {
  unreadCount?: number;
}

export const NotificationBell = React.forwardRef<
  HTMLButtonElement,
  NotificationBellProps
>(({ unreadCount = 0, className, ...props }, ref) => {
  return (
    <div className="relative inline-block">
      <IconButton ref={ref} variant="ghost" className={className} {...props}>
        <Bell className="h-6 w-6" />
      </IconButton>
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.div
            variants={popVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="pointer-events-none absolute right-1.5 top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-vermilion px-1 text-[10px] font-bold text-paper border border-paper"
          >
            <AnimatedNumber value={unreadCount} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
NotificationBell.displayName = "NotificationBell";
