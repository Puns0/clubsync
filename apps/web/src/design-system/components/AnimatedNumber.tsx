// ─── AnimatedNumber Component ───
// Rolls/ticks smoothly to the new number value using framer-motion.
// Uses tabular numerals to prevent layout shifts.

import * as React from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { cn } from "../../lib/format";

interface AnimatedNumberProps {
  value: number;
  className?: string;
}

export function AnimatedNumber({ value, className }: AnimatedNumberProps) {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => Math.round(current).toLocaleString());

  React.useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return (
    <motion.span className={cn("font-tabular", className)}>
      {display}
    </motion.span>
  );
}
