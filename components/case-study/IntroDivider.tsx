'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface IntroDividerProps {
  text: string;
  dividerWidth?: string;
}

export default function IntroDivider({ text }: IntroDividerProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto px-4">
      {/* Short Red Divider Line with scaleX: 0 -> 1 */}
      <motion.div
        initial={shouldReduceMotion ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-12 sm:w-16 h-[2px] bg-[#ff2d4a] origin-center rounded-full shadow-[0_0_12px_rgba(255,45,74,0.6)]"
      />

      {/* Centered Intro Paragraph (3 lines on desktop) */}
      <motion.p
        initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="text-[12px] sm:text-[13px] leading-[1.8] text-[#b8bcc2] tracking-normal font-normal text-balance"
      >
        {text}
      </motion.p>
    </div>
  );
}
