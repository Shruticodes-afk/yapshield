'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface TagBarProps {
  items: string[];
}

export default function TagBar({ items }: TagBarProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="flex justify-center w-full px-4"
    >
      <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-[#162025]/80 border border-white/10 shadow-lg shadow-black/40 backdrop-blur-md text-[11px] sm:text-[12px] font-medium text-slate-300">
        {items.map((item, index) => (
          <React.Fragment key={item}>
            <span className="hover:text-white transition-colors cursor-default whitespace-nowrap">
              {item}
            </span>
            {index < items.length - 1 && (
              <span className="text-[#ff2d4a]/80 font-bold select-none text-[10px]">
                •
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    </motion.div>
  );
}
