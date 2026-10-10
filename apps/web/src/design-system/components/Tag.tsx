// ─── Tag Component ───
// Small badge for statuses or attributes.

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/format";

const tagVariants = cva(
  "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-wider",
  {
    variants: {
      variant: {
        default: "bg-ink text-paper",
        vermilion: "bg-vermilion text-paper",
        muted: "bg-ink-faint/20 text-ink-soft",
        outline: "border border-ink text-ink bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface TagProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof tagVariants> {}

export function Tag({ className, variant, ...props }: TagProps) {
  return (
    <span className={cn(tagVariants({ variant }), className)} {...props} />
  );
}
