'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export type CubeVariant = 'yellow' | 'green' | 'red';

interface CubeProps {
  color?: CubeVariant;
  size?: number;
  delay?: number;
  label?: string;
  sublabel?: string;
  floatDuration?: number;
}

export default function Cube({
  color = 'yellow',
  size = 110,
  delay = 0,
  label = 'DATA_LAYER',
  sublabel = 'ISOMETRIC',
  floatDuration = 5,
}: CubeProps) {
  const shouldReduceMotion = useReducedMotion();

  // Color schemes for isometric facet fills, borders, and ambient glow
  const colorSchemes = {
    yellow: {
      accent: '#f59e0b',
      topFill: '#fef08a',
      topFillAlpha: 'rgba(251, 191, 36, 0.45)',
      leftFillAlpha: 'rgba(217, 119, 6, 0.55)',
      rightFillAlpha: 'rgba(180, 83, 9, 0.75)',
      stroke: '#fbbf24',
      glow: 'rgba(245, 158, 11, 0.35)',
      badgeBg: 'bg-amber-950/70',
      badgeText: 'text-amber-300',
      badgeBorder: 'border-amber-700/60',
    },
    green: {
      accent: '#10b981',
      topFill: '#a7f3d0',
      topFillAlpha: 'rgba(52, 211, 153, 0.45)',
      leftFillAlpha: 'rgba(16, 185, 129, 0.55)',
      rightFillAlpha: 'rgba(4, 120, 87, 0.75)',
      stroke: '#34d399',
      glow: 'rgba(16, 185, 129, 0.35)',
      badgeBg: 'bg-emerald-950/70',
      badgeText: 'text-emerald-300',
      badgeBorder: 'border-emerald-700/60',
    },
    red: {
      accent: '#ff2d4a',
      topFill: '#fecdd3',
      topFillAlpha: 'rgba(255, 45, 74, 0.45)',
      leftFillAlpha: 'rgba(225, 29, 72, 0.55)',
      rightFillAlpha: 'rgba(159, 18, 57, 0.75)',
      stroke: '#ff4d6d',
      glow: 'rgba(255, 45, 74, 0.4)',
      badgeBg: 'bg-rose-950/70',
      badgeText: 'text-rose-300',
      badgeBorder: 'border-rose-700/60',
    },
  };

  const scheme = colorSchemes[color];

  return (
    <div className="flex flex-col items-center justify-center p-3 relative select-none">
      {/* Ambient background glow */}
      <div
        className="absolute w-24 h-24 rounded-full blur-xl pointer-events-none opacity-40"
        style={{ backgroundColor: scheme.accent }}
        aria-hidden="true"
      />

      {/* Floating 3D Cube Container */}
      <motion.div
        initial={shouldReduceMotion ? { y: 0 } : { y: -8 }}
        animate={shouldReduceMotion ? { y: 0 } : { y: [8, -8, 8] }}
        transition={{
          duration: floatDuration,
          repeat: Infinity,
          ease: 'easeInOut',
          delay,
        }}
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          {/* Layer 1 (Bottom Layer) with subtle exploded downward translation */}
          <motion.g
            animate={shouldReduceMotion ? {} : { y: [4, -2, 4] }}
            transition={{
              duration: floatDuration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: delay + 0.2,
            }}
          >
            {/* Bottom Layer Left Face */}
            <path
              d="M20 70 L60 90 L60 102 L20 82 Z"
              fill={scheme.leftFillAlpha}
              stroke={scheme.stroke}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Bottom Layer Right Face */}
            <path
              d="M60 90 L100 70 L100 82 L60 102 Z"
              fill={scheme.rightFillAlpha}
              stroke={scheme.stroke}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </motion.g>

          {/* Layer 2 (Middle Layer) */}
          <g>
            {/* Middle Layer Left Face */}
            <path
              d="M20 52 L60 72 L60 84 L20 64 Z"
              fill={scheme.leftFillAlpha}
              stroke={scheme.stroke}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Middle Layer Right Face */}
            <path
              d="M60 72 L100 52 L100 64 L60 84 Z"
              fill={scheme.rightFillAlpha}
              stroke={scheme.stroke}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Middle Layer Top Ring Glow */}
            <path
              d="M20 52 L60 32 L100 52 L60 72 Z"
              fill="rgba(255,255,255,0.06)"
              stroke={scheme.stroke}
              strokeWidth="0.8"
              strokeDasharray="2 2"
            />
          </g>

          {/* Layer 3 (Top Layer) with subtle exploded upward elevation */}
          <motion.g
            animate={shouldReduceMotion ? {} : { y: [-6, 2, -6] }}
            transition={{
              duration: floatDuration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay,
            }}
          >
            {/* Top Layer Top Face */}
            <path
              d="M20 34 L60 14 L100 34 L60 54 Z"
              fill={scheme.topFillAlpha}
              stroke={scheme.stroke}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

            {/* Inner Top Geometry Detailing */}
            <path
              d="M40 34 L60 24 L80 34 L60 44 Z"
              fill="none"
              stroke="white"
              strokeWidth="1"
              strokeOpacity="0.7"
              strokeDasharray="3 3"
            />

            {/* Top Layer Left Face */}
            <path
              d="M20 34 L60 54 L60 66 L20 46 Z"
              fill={scheme.leftFillAlpha}
              stroke={scheme.stroke}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />

            {/* Top Layer Right Face */}
            <path
              d="M60 54 L100 34 L100 46 L60 66 Z"
              fill={scheme.rightFillAlpha}
              stroke={scheme.stroke}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </motion.g>

          {/* Center Vertical Axis Beam (Connecting exploded layers) */}
          <line
            x1="60"
            y1="24"
            x2="60"
            y2="94"
            stroke={scheme.stroke}
            strokeWidth="0.8"
            strokeDasharray="2 3"
            strokeOpacity="0.6"
          />
        </svg>
      </motion.div>

      {/* Micro Status Label */}
      <div className="mt-2 text-center">
        <span
          className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase border shadow-sm ${scheme.badgeBg} ${scheme.badgeText} ${scheme.badgeBorder}`}
        >
          {label}
        </span>
        {sublabel && (
          <div className="text-[8px] font-mono text-slate-400 tracking-wider mt-0.5 uppercase">
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}
