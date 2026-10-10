// ─── TicketCard Component ───
// A card shaped like a ticket with semi-circle notches and a dashed tear line.
// Pure CSS/SVG, no images.

import * as React from "react";
import { cn } from "../../lib/format";

export interface TicketCardProps extends React.HTMLAttributes<HTMLDivElement> {
  highlighted?: boolean;
  children: React.ReactNode;
}

export const TicketCard = React.forwardRef<HTMLDivElement, TicketCardProps>(
  ({ className, highlighted, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative w-full rounded-ticket border-2 bg-paper text-ink transition-all",
          highlighted
            ? "border-vermilion shadow-stamp-vermilion"
            : "border-ink shadow-stamp hover:-translate-y-0.5 hover:shadow-stamp-sm",
          className
        )}
        {...props}
      >
        {/* The notches are created using absolute positioned pseudo-elements via tailwind classes in the children or a wrapper. 
            For a simple implementation, we assume the content is split into top/bottom with a dashed line separator. */}
        {children}
      </div>
    );
  }
);
TicketCard.displayName = "TicketCard";

export const TicketCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5", className)} {...props} />
));
TicketCardHeader.displayName = "TicketCardHeader";

export const TicketCardTearLine = () => (
  <div className="relative flex items-center w-full my-1">
    {/* Left Notch */}
    <div className="absolute -left-[2px] h-4 w-4 -translate-x-1/2 rounded-full border-2 border-ink border-l-transparent bg-paper-deep" />
    {/* Dashed Line */}
    <div className="w-full border-t-2 border-dashed border-ink/40" />
    {/* Right Notch */}
    <div className="absolute -right-[2px] h-4 w-4 translate-x-1/2 rounded-full border-2 border-ink border-r-transparent bg-paper-deep" />
  </div>
);

export const TicketCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 bg-ink/5 rounded-b-[4px]", className)} {...props} />
));
TicketCardFooter.displayName = "TicketCardFooter";
