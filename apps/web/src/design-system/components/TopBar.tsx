// ─── TopBar Component ───
// App header with optional back button, title, and right action slot.

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { IconButton } from "./IconButton";
import { cn } from "../../lib/format";

export interface TopBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  action?: React.ReactNode;
  transparent?: boolean;
}

export function TopBar({
  title,
  showBack = false,
  onBack,
  action,
  transparent = false,
  className,
  ...props
}: TopBarProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-16 w-full items-center justify-between px-4 transition-colors",
        transparent
          ? "bg-transparent"
          : "border-b-2 border-ink bg-paper shadow-sm",
        className
      )}
      {...props}
    >
      <div className="flex w-12 shrink-0 items-center justify-start">
        {showBack && (
          <IconButton
            variant="ghost"
            onClick={handleBack}
            aria-label="Go back"
            className={transparent ? "bg-paper/50 backdrop-blur-sm" : ""}
          >
            <ArrowLeft className="h-6 w-6" />
          </IconButton>
        )}
      </div>

      <div className="flex flex-1 items-center justify-center truncate px-2">
        {title && (
          <h1 className="truncate text-lg font-display font-bold text-ink">
            {title}
          </h1>
        )}
      </div>

      <div className="flex w-12 shrink-0 items-center justify-end">
        {action}
      </div>
    </header>
  );
}
