// ─── SeatMeter Component ───
// Compact bar for cards showing capacity vs taken.

import * as React from "react";
import { motion } from "framer-motion";
import { AnimatedNumber } from "./AnimatedNumber";
import { cn } from "../../lib/format";

interface SeatMeterProps {
  taken: number;
  capacity: number;
  className?: string;
}

export function SeatMeter({ taken, capacity, className }: SeatMeterProps) {
  const percentage = Math.min(100, Math.max(0, (taken / capacity) * 100));
  const isFull = taken >= capacity;

  return (
    <div className={cn("flex flex-col gap-1.5 w-full", className)}>
      <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider">
        <span className={cn(isFull ? "text-vermilion" : "text-ink-soft")}>
          {isFull ? "Full" : "Filling fast"}
        </span>
        <span className="text-ink">
          <AnimatedNumber value={taken} /> / {capacity}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-ink/10 overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", isFull ? "bg-vermilion" : "bg-ink")}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        />
      </div>
    </div>
  );
}
