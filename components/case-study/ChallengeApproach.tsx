'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface ColumnContent {
  tag: string;
  title: string;
  paragraph: string;
  stats?: { label: string; value: string }[];
}

interface ChallengeApproachProps {
  challenge: ColumnContent;
  approach: ColumnContent;
}

export default function ChallengeApproach({
  challenge,
  approach,
}: ChallengeApproachProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 py-8">
        {/* Thin vertical separator line (desktop only) */}
        <div
          className="hidden md:block absolute left-1/2 top-2 bottom-2 w-[1px] bg-gradient-to-b from-transparent via-white/15 to-transparent -translate-x-1/2"
          aria-hidden="true"
        />

        {/* Left Column: The Challenge */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col space-y-4 md:pr-4"
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff2d4a]" />
            <span className="text-[11px] sm:text-[12px] font-semibold tracking-[0.2em] uppercase text-[#ff2d4a]">
              {challenge.tag}
            </span>
          </div>

          <h3 className="text-xl sm:text-[28px] font-bold text-white tracking-tight leading-snug">
            {challenge.title}
          </h3>

          <p className="text-[12px] sm:text-[13px] text-[#b8bcc2] leading-[1.75] font-normal">
            {challenge.paragraph}
          </p>

          {challenge.stats && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              {challenge.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="p-3 rounded-xl bg-[#141b20]/60 border border-white/5"
                >
                  <div className="text-lg sm:text-xl font-bold font-mono text-white">
                    {stat.value}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-[#b8bcc2]/80 uppercase tracking-wider mt-0.5">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Right Column: Our Approach */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col space-y-4 md:pl-4 border-t border-white/10 md:border-t-0 pt-8 md:pt-0"
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#11b5c4]" />
            <span className="text-[11px] sm:text-[12px] font-semibold tracking-[0.2em] uppercase text-[#ff2d4a]">
              {approach.tag}
            </span>
          </div>

          <h3 className="text-xl sm:text-[28px] font-bold text-white tracking-tight leading-snug">
            {approach.title}
          </h3>

          <p className="text-[12px] sm:text-[13px] text-[#b8bcc2] leading-[1.75] font-normal">
            {approach.paragraph}
          </p>

          {approach.stats && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              {approach.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="p-3 rounded-xl bg-[#141b20]/60 border border-white/5"
                >
                  <div className="text-lg sm:text-xl font-bold font-mono text-[#11b5c4]">
                    {stat.value}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-[#b8bcc2]/80 uppercase tracking-wider mt-0.5">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
