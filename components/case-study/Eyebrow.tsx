'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface EyebrowProps {
  text: string;
}

export default function Eyebrow({ text }: EyebrowProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center justify-center gap-2.5"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff2d4a] opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff2d4a]" />
      </span>
      <span className="text-[11px] sm:text-[12px] font-semibold tracking-[0.22em] uppercase text-[#ff2d4a] select-none text-center">
        {text}
      </span>
    </motion.div>
  );
}
