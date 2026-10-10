import React from 'react';
import { cn } from './utils.js';
import { Link } from 'react-router-dom';

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-1.5 select-none', className)}>
      <div className="w-8 h-8 rounded-md bg-ink text-paper flex items-center justify-center font-bold text-xl shadow-[2px_2px_0_0_#D63A2B] transform -rotate-3 transition-transform hover:rotate-0">
        C
      </div>
      <span className="font-bold text-2xl tracking-tight text-ink">
        Club<span className="text-accent">Sync</span>
      </span>
    </Link>
  );
}
