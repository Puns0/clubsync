// ─── SeatGrid Component ───
// Animated grid of seats representing event capacity.
// Shows individual seats for small events (<=40) and dot grid for large.

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/format";
import { staggerContainer, popVariants } from "../motion";

interface SeatGridProps {
  capacity: number;
  taken: number;
  userStatus?: "none" | "confirmed" | "waitlisted" | "promoted_pending";
  className?: string;
}

export function SeatGrid({ capacity, taken, userStatus, className }: SeatGridProps) {
  const isLarge = capacity > 40;
  // If user is confirmed, ensure they get a specific seat highlighted.
  // For simplicity, we just color one of the taken seats differently.

  const seats = Array.from({ length: capacity }, (_, i) => {
    let status: "empty" | "taken" | "user" = "empty";
    if (i < taken) {
      status = "taken";
    }
    // Highlight the last taken seat as the user's if they are confirmed
    if (userStatus === "confirmed" && i === taken - 1) {
      status = "user";
    }
    return status;
  });

  return (
    <motion.div
      variants={{ initial: {}, animate: { transition: { staggerChildren: 0.01 } } }}
      initial="initial"
      animate="animate"
      className={cn(
        "grid w-full gap-2",
        isLarge
          ? "grid-cols-[repeat(auto-fit,minmax(8px,1fr))] gap-1"
          : "grid-cols-[repeat(auto-fit,minmax(24px,1fr))]",
        className
      )}
    >
      {seats.map((status, idx) => (
        <Seat key={idx} status={status} isLarge={isLarge} />
      ))}
    </motion.div>
  );
}

function Seat({ status, isLarge }: { status: "empty" | "taken" | "user", isLarge: boolean }) {
  if (isLarge) {
    return (
      <motion.div
        variants={popVariants}
        className={cn(
          "aspect-square rounded-full",
          status === "empty" ? "bg-ink/10" : status === "user" ? "bg-vermilion" : "bg-ink"
        )}
      />
    );
  }

  return (
    <motion.div
      variants={popVariants}
      className={cn(
        "relative flex aspect-square flex-col items-center justify-end rounded-t-lg rounded-b-sm border-2 p-[2px]",
        status === "empty"
          ? "border-ink/20 bg-transparent"
          : status === "user"
          ? "border-vermilion bg-vermilion/20"
          : "border-ink bg-ink/10"
      )}
    >
      {/* Seat back/armrest illusion */}
      <div
        className={cn(
          "h-1/2 w-full rounded-sm",
          status === "empty"
            ? "bg-ink/20"
            : status === "user"
            ? "bg-vermilion"
            : "bg-ink"
        )}
      />
    </motion.div>
  );
}
