// ─── CountdownRing Component ───
// Circular SVG progress ring driven by expiresAt.
// Smoothly depletes via requestAnimationFrame without setInterval drift.

import * as React from "react";
import { cn } from "../../lib/format";
import { getRemainingSeconds } from "../../lib/time";
import { AnimatedNumber } from "./AnimatedNumber";

interface CountdownRingProps {
  expiresAt: string;
  durationSeconds: number; // Total duration to calculate percentage
  onExpire?: () => void;
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export function CountdownRing({
  expiresAt,
  durationSeconds,
  onExpire,
  className,
  size = 64,
  strokeWidth = 6,
}: CountdownRingProps) {
  const [remaining, setRemaining] = React.useState(() => getRemainingSeconds(expiresAt));
  
  // Track previous to trigger onExpire precisely once
  const prevRemainingRef = React.useRef(remaining);

  React.useEffect(() => {
    let frameId: number;

    const tick = () => {
      const current = getRemainingSeconds(expiresAt);
      
      if (current !== prevRemainingRef.current) {
         setRemaining(current);
         
         if (current <= 0 && prevRemainingRef.current > 0) {
            onExpire?.();
         }
         prevRemainingRef.current = current;
      }

      if (current > 0) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [expiresAt, onExpire]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(100, Math.max(0, (remaining / durationSeconds) * 100));
  const dashoffset = circumference - (progress / 100) * circumference;
  
  const isUrgent = remaining <= Math.min(15, durationSeconds * 0.2); // <= 15s or 20%

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg className="-rotate-90 transform" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background Track */}
        <circle
          className="text-ink/10 transition-colors"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress Ring */}
        <circle
          className={cn(
            "transition-all duration-1000 ease-linear",
            isUrgent ? "text-vermilion" : "text-ink"
          )}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className={cn(
        "absolute inset-0 flex flex-col items-center justify-center font-display font-bold leading-none tracking-tighter",
        isUrgent ? "text-vermilion animate-pulse-soft" : "text-ink"
      )}>
        <AnimatedNumber value={remaining} className="text-xl" />
        <span className="text-[10px] uppercase opacity-70">sec</span>
      </div>
    </div>
  );
}
