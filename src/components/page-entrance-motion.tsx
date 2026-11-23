"use client";

import { MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";

const smoothEase = [0.22, 1, 0.36, 1] as const;

export function HeaderEntrance({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: smoothEase }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}

export function IntroEntrance({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.42, ease: smoothEase }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}

export function ToolCardEntrance({
  children,
  index,
}: {
  children: ReactNode;
  index: number;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="min-w-0"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: 0.72 + index * 0.065, ease: smoothEase }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
