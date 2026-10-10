// ─── Sheet Primitive ───
// Radix Dialog customized as a sliding sheet (bottom on mobile, side on desktop).

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/format";
import { IconButton } from "../components/IconButton";
import { fadeVariants, springSnappy } from "../motion";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;

export const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay asChild>
    {/* @ts-ignore: Radix and Framer Motion DOM props clash */}
    <motion.div
      variants={fadeVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn(
        "fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  </DialogPrimitive.Overlay>
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const sheetVariants = {
  initial: { y: "100%" },
  animate: { y: 0, transition: springSnappy },
  exit: { y: "100%", transition: { duration: 0.2, ease: "easeIn" } },
};

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    hideClose?: boolean;
  }
>(({ className, children, hideClose, ...props }, ref) => (
  <SheetPortal forceMount>
    <SheetOverlay />
    <DialogPrimitive.Content asChild>
      {/* @ts-ignore */}
      <motion.div
        variants={sheetVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto max-h-[85vh] flex-col rounded-t-3xl border-t-2 border-x-2 border-ink bg-paper shadow-stamp-vermilion outline-none sm:right-0 sm:top-0 sm:mt-0 sm:h-full sm:w-3/4 sm:max-w-sm sm:rounded-l-3xl sm:rounded-tr-none sm:border-b-2 sm:border-r-0",
          className
        )}
        ref={ref}
        {...props}
      >
        <div className="mx-auto mt-4 h-1.5 w-[60px] shrink-0 rounded-full bg-ink/20 sm:hidden" />
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {!hideClose && (
          <DialogPrimitive.Close asChild>
            <IconButton
              variant="ghost"
              className="absolute right-4 top-4"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </IconButton>
          </DialogPrimitive.Close>
        )}
      </motion.div>
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = DialogPrimitive.Content.displayName;

export const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left pb-4",
      className
    )}
    {...props}
  />
);
SheetHeader.displayName = "SheetHeader";

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-xl font-display tracking-tight text-ink", className)}
    {...props}
  />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;
