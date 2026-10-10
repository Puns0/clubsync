// ─── EmptyState Component ───
// Standardized empty state with icon, message, and optional action.

import * as React from "react";
import { cn } from "../../lib/format";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[200px] w-full flex-col items-center justify-center rounded-ticket border-2 border-dashed border-ink/20 p-8 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink/5 text-ink-soft">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-display font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-ink-soft max-w-[250px]">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
