import React from 'react';
import { cn } from './utils.js';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-md font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-50 active:scale-95';

    const variants = {
      primary: 'bg-accent text-white shadow-[0_3px_0_0_#1C1917] hover:shadow-[0_4px_0_0_#1C1917] hover:-translate-y-px active:shadow-none active:translate-y-[3px]',
      secondary: 'bg-ink text-paper shadow-[0_3px_0_0_#D63A2B] hover:shadow-[0_4px_0_0_#D63A2B] hover:-translate-y-px active:shadow-none active:translate-y-[3px]',
      outline: 'border-2 border-ink bg-transparent text-ink hover:bg-ink/5',
      ghost: 'bg-transparent text-ink hover:bg-ink/10',
      danger: 'bg-red-600 text-white shadow-[0_3px_0_0_#1C1917] hover:shadow-[0_4px_0_0_#1C1917] hover:-translate-y-px active:shadow-none active:translate-y-[3px]',
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-11 px-6 text-base tracking-wide',
      lg: 'h-14 px-8 text-lg tracking-wide',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
