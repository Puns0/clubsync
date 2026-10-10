// ─── BottomNav Component ───
// Main mobile navigation wrapper positioned at the bottom.

import * as React from "react";
import { NavLink } from "react-router-dom";
import { Home, CalendarDays, Ticket, User } from "lucide-react";
import { cn } from "../../lib/format";
import { motion } from "framer-motion";

const tabs = [
  { name: "Home", path: "/", icon: Home },
  { name: "Schedule", path: "/schedule", icon: CalendarDays },
  { name: "Passes", path: "/passes", icon: Ticket },
  { name: "Profile", path: "/profile", icon: User },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 w-full border-t-2 border-ink bg-paper pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16 w-full items-center justify-around px-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              cn(
                "relative flex h-full w-full flex-col items-center justify-center space-y-1 text-xs font-semibold transition-colors",
                isActive ? "text-vermilion" : "text-ink-soft hover:text-ink"
              )
            }
          >
            {({ isActive }) => (
              <>
                <tab.icon
                  className={cn("h-6 w-6", isActive ? "stroke-[2.5px]" : "")}
                />
                <span className="opacity-0 lg:opacity-100 hidden lg:block">
                  {tab.name}
                </span>
                
                {/* Active Indicator (pill) */}
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute top-1 -z-10 h-10 w-16 rounded-full bg-vermilion/10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
