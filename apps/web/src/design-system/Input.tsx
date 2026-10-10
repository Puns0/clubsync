import React from 'react';
import { cn } from './utils.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    const id = React.useId();
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={id} className="text-sm font-bold text-ink">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={cn(
            'flex h-12 w-full rounded-md border-2 border-outline bg-surface px-4 py-2 text-base text-ink placeholder:text-muted transition-colors',
            'focus-visible:outline-none focus-visible:border-ink focus-visible:ring-1 focus-visible:ring-ink',
            'disabled:cursor-not-allowed disabled:bg-paper disabled:opacity-50',
            error && 'border-accent focus-visible:border-accent focus-visible:ring-accent',
            className
          )}
          {...props}
        />
        {(error || helperText) && (
          <p className={cn('text-sm font-medium', error ? 'text-accent' : 'text-muted')}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
