// ─── ErrorState Component ───
// Standardized error display with retry action.

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "./Button";
import { cn } from "../../lib/format";

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this content. Please try again.",
  onRetry,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[200px] w-full flex-col items-center justify-center rounded-ticket border-2 border-dashed border-vermilion/30 bg-vermilion/5 p-8 text-center",
        className
      )}
      {...props}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-vermilion/10 text-vermilion">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-display font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm text-ink-soft max-w-[250px]">{message}</p>
      {onRetry && (
        <div className="mt-6">
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
