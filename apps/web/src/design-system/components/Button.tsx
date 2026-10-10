// ─── Button Component ───
// Core interactive element. Includes variants for primary (vermilion), secondary (ink), 
// ghost, and destructive. Uses hover stamp effects.

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/format";
import { motion, HTMLMotionProps } from "framer-motion";

export const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-ticket text-sm font-display font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermilion disabled:pointer-events-none disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
  {
    variants: {
      variant: {
        primary: "bg-vermilion text-paper border-2 border-ink shadow-stamp hover:bg-vermilion-80",
        secondary: "bg-paper text-ink border-2 border-ink shadow-stamp hover:bg-paper-deep",
        ghost: "hover:bg-ink/5 text-ink",
        destructive: "bg-ink text-paper border-2 border-ink shadow-stamp hover:bg-ink-soft",
        outline: "border-2 border-ink text-ink bg-transparent hover:bg-ink/5 shadow-stamp",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4",
        lg: "h-14 px-8 text-base",
        icon: "h-11 w-11",
      },
      isLoading: {
        true: "text-transparent relative pointer-events-none",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
      isLoading: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, isLoading, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {children}
        {isLoading && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <svg
              className="animate-spin h-5 w-5 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

// Framer Motion enhanced button for layout animations
export const MotionButton = motion.create(Button);
