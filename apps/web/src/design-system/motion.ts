// ─── Framer Motion presets ───
// Shared across all components. Respect prefers-reduced-motion via the
// useReducedMotion() hook — callers should pass `immediate` variants when needed.

import type { Transition, Variants } from "framer-motion";

// ─── Transitions ───

/** Snappy spring for seats, buttons, physical interactions */
export const springSnappy: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
  mass: 0.8,
};

/** Soft spring for layout shifts, queue repositioning */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 25,
  mass: 1,
};

/** Quick ease for fades and opacity changes */
export const fadeTransition: Transition = {
  duration: 0.2,
  ease: "easeOut",
};

/** Stagger container: use with `staggerChildren` in variants */
export const staggerContainer = (stagger = 0.04): Transition => ({
  staggerChildren: stagger,
});

// ─── Variants ───

/** Fade in/out */
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: fadeTransition },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/** Fade + slide up (for list items, cards) */
export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { ...springSoft, opacity: fadeTransition },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

/** Scale pop (for buttons, badges, seat fills) */
export const popVariants: Variants = {
  initial: { scale: 0.85, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: springSnappy,
  },
  exit: { scale: 0.85, opacity: 0, transition: { duration: 0.12 } },
};

/** Stagger children container */
export const staggerParent: Variants = {
  initial: {},
  animate: {
    transition: staggerContainer(0.04),
  },
};

/** Stagger child (combine with other enter animations) */
export const staggerChild: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: springSoft,
  },
};

// ─── Reduced motion fallbacks ───

/** Instant transition for reduced-motion users */
export const instantTransition: Transition = {
  duration: 0,
};

/** No-animation variants */
export const noMotionVariants: Variants = {
  initial: {},
  animate: {},
  exit: {},
};
