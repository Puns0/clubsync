// ─── Chip Component ───
// For club filtering. Horizontal scrollable lists.

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/format";
import { motion } from "framer-motion";

const chipVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermilion disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      selected: {
        true: "bg-vermilion text-paper border-2 border-vermilion",
        false: "bg-paper text-ink border-2 border-ink hover:bg-ink/5",
      },
    },
    defaultVariants: {
      selected: false,
    },
  }
);

export interface ChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof chipVariants> {
  selected?: boolean;
}

export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, selected, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(chipVariants({ selected, className }))}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Chip.displayName = "Chip";

export const MotionChip = motion.create(Chip);
