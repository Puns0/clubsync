import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "../../lib/format";

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, value, onClear, onChange, ...props }, ref) => {
    return (
      <div className={cn("relative flex items-center w-full", className)}>
        <Search className="absolute left-3 h-5 w-5 text-ink-faint" />
        <input
          ref={ref}
          value={value}
          onChange={onChange}
          className="h-11 w-full rounded-ticket border-2 border-ink bg-paper pl-10 pr-10 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-vermilion"
          {...props}
        />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 rounded-full p-0.5 text-ink-faint hover:text-ink focus:outline-none focus:ring-2 focus:ring-vermilion"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
SearchBar.displayName = "SearchBar";
