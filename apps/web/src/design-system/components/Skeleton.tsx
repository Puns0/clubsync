// ─── Skeleton Component ───
// Paper-tone pulsing opacity (NO gradient).

import * as React from "react";
import { cn } from "../../lib/format";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse-soft rounded-md bg-paper-deep/70", className)}
      {...props}
    />
  );
}
