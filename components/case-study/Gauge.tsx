'use client';

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface GaugeProps {
  score?: number;
  label?: string;
  sublabel?: string;
  status?: string;
}

export default function Gauge({
  score = 98.4,
  label = 'DEFENSE INTEGRITY',
  sublabel = 'Perimeter Armor Index',
  status = 'HIGH RESILIENCE',
}: GaugeProps) {
  const shouldReduceMotion = useReducedMotion();
  const [needleJitter, setNeedleJitter] = useState(0);

  // Micro-jitter effect simulating live high-frequency telemetry sensors
  useEffect(() => {
    if (shouldReduceMotion) return;

    const interval = setInterval(() => {
      // Subtle pseudo-random float between -1.8 and +1.8 degrees
      const jitter = (Math.random() - 0.5) * 3.6;
      setNeedleJitter(jitter);
    }, 180);

    return () => clearInterval(interval);
  }, [shouldReduceMotion]);

  // Radius and circumference calculations
  const size = 180;
  const strokeWidth = 8;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  // Arc range: 240 degrees (from 150 deg to 390 deg)
  const arcLength = circumference * (240 / 360);
  const greenDashoffset = arcLength * (1 - score / 100);
  const orangeDashoffset = arcLength * (1 - (score * 0.72) / 100);

  // Needle angle: -120 deg (min) to +120 deg (max)
  const baseAngle = -120 + (score / 100) * 240;
  const currentAngle = baseAngle + (shouldReduceMotion ? 0 : needleJitter);

  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#09171c]/90 border border-[#11b5c4]/30 shadow-[0_0_30px_rgba(17,181,196,0.12)] backdrop-blur-md relative overflow-hidden group">
      {/* Subtle ambient cyber glow */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32 bg-[#11b5c4]/15 rounded-full blur-2xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-10 -left-10 w-28 h-28 bg-[#ff2d4a]/10 rounded-full blur-2xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Header labels */}
      <div className="w-full flex items-center justify-between text-[10px] font-mono tracking-wider text-slate-400 mb-2">
        <span className="flex items-center gap-1.5 text-[#11b5c4]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#11b5c4] animate-pulse" />
          RADAR 01
        </span>
        <span className="text-[#34d399] font-bold">{status}</span>
      </div>

      {/* SVG Radial Gauge */}
      <div className="relative w-[180px] h-[180px] flex items-center justify-center">
        {/* Continuous rotating tick marks ring */}
        <motion.div
          animate={shouldReduceMotion ? {} : { rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40"
        >
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius + 6}
              fill="none"
              stroke="#11b5c4"
              strokeWidth="1"
              strokeDasharray="2 6"
            />
          </svg>
        </motion.div>

        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[150deg]">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#0b2c34"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />

          {/* Orange Concentric Ring (Inner/Secondary Threshold) */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius - 7}
            fill="none"
            stroke="#f97316"
            strokeWidth={3}
            strokeDasharray={`${arcLength} ${circumference}`}
            initial={{ strokeDashoffset: arcLength }}
            animate={{ strokeDashoffset: orangeDashoffset }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            strokeLinecap="round"
            className="opacity-70"
          />

          {/* Green Active Ring (Primary Perimeter Score) */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#10b981"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            initial={{ strokeDashoffset: arcLength }}
            animate={{ strokeDashoffset: greenDashoffset }}
            transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
            strokeLinecap="round"
            style={{
              filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.5))',
            }}
          />
        </svg>

        {/* Dynamic Needle */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            style={{ rotate: currentAngle }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-full h-full flex items-center justify-center"
          >
            {/* Needle line projecting upward */}
            <div className="w-[2px] h-[58px] bg-gradient-to-t from-[#11b5c4] via-white to-transparent rounded-full -translate-y-[28px] shadow-[0_0_8px_#11b5c4]" />
          </motion.div>

          {/* Needle Center Hub */}
          <div className="w-5 h-5 rounded-full bg-[#0a1f26] border-2 border-[#11b5c4] flex items-center justify-center shadow-[0_0_10px_#11b5c4]">
            <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
          </div>
        </div>

        {/* Central Readout Value */}
        <div className="absolute bottom-4 flex flex-col items-center">
          <span className="text-xl font-bold font-mono text-white tracking-tight">
            {score.toFixed(1)}%
          </span>
          <span className="text-[9px] font-mono uppercase tracking-widest text-[#11b5c4]">
            THROUGHPUT
          </span>
        </div>
      </div>

      {/* Footer labels */}
      <div className="text-center mt-1">
        <div className="text-[11px] font-bold tracking-wider text-slate-200 uppercase">
          {label}
        </div>
        <div className="text-[10px] text-[#b8bcc2]/80 mt-0.5">
          {sublabel}
        </div>
      </div>
    </div>
  );
}
