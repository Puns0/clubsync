// ─── IconButton Component ───
// Icon-only button with a 44px min touch target.

import * as React from "react";
import { Button, type ButtonProps } from "./Button";
import { cn } from "../../lib/format";

export const IconButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        size="icon"
        className={cn("shrink-0", className)}
        {...props}
      />
    );
  }
);
IconButton.displayName = "IconButton";
