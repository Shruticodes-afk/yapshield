'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from 'framer-motion';
import Gauge from './Gauge';
import Cube from './Cube';
import { caseStudyContent } from '../../lib/caseStudyContent';

export default function HeroDashboard() {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Mouse tilt physics for 3D stage
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for high-end organic motion feel
  const springX = useSpring(mouseX, { stiffness: 120, damping: 18 });
  const springY = useSpring(mouseY, { stiffness: 120, damping: 18 });

  // Map mouse positions to subtle 3D rotational angles
  const rotateX = useTransform(springY, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-8, 8]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(xPct);
    mouseY.set(yPct);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Live typing / flickering terminal feed
  const [typedLines, setTypedLines] = useState<string[]>([]);
  const fullLines = caseStudyContent.hero.telemetryLines;

  useEffect(() => {
    let currentLineIdx = 0;
    setTypedLines([fullLines[0]]);

    const interval = setInterval(() => {
      currentLineIdx = (currentLineIdx + 1) % fullLines.length;
      setTypedLines((prev) => {
        const next = [...prev, fullLines[currentLineIdx]];
        if (next.length > 5) next.shift();
        return next;
      });
    }, 2400);

    return () => clearInterval(interval);
  }, [fullLines]);

  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-6 select-none">
      {/* Outer Shell with Cyber Frame & Ambient Cyan / Red Glow */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative rounded-3xl bg-gradient-to-b from-[#0b1a20] via-[#09151b] to-[#060e12] border border-[#11b5c4]/35 p-3 sm:p-6 shadow-[0_25px_90px_rgba(11,59,68,0.5)] overflow-hidden transition-all duration-300"
        style={{ perspective: 1200 }}
      >
        {/* Soft Background Radial Ambient Glows */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 bg-[#11b5c4]/15 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#ff2d4a]/12 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[#0b3b44]/20 rounded-full blur-[100px] pointer-events-none"
          aria-hidden="true"
        />

        {/* Windows / Desktop App Top Titlebar */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ff2d4a]/80 inline-block shadow-[0_0_8px_#ff2d4a]" />
            <span className="w-3 h-3 rounded-full bg-[#f59e0b]/80 inline-block shadow-[0_0_8px_#f59e0b]" />
            <span className="w-3 h-3 rounded-full bg-[#10b981]/80 inline-block shadow-[0_0_8px_#10b981]" />
            <span className="ml-3 hidden sm:inline text-[11px] text-slate-300 font-semibold tracking-wider">
              YAPSHIELD SOC ENTERPRISE • DESKTOP CONSOLE
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]" />
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-[#10b981] tracking-widest uppercase">
              {caseStudyContent.hero.systemStatus}
            </span>
          </div>
        </div>

        {/* 3D Tilted Isometric Grid Container */}
        <motion.div
          style={
            shouldReduceMotion
              ? {}
              : {
                  rotateX,
                  rotateY,
                  transformStyle: 'preserve-3d',
                }
          }
          className="relative transition-transform duration-100 ease-out py-2"
        >
          {/* Top Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="p-3 rounded-xl bg-[#08151b]/80 border border-[#11b5c4]/20">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Threats Blocked
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-white mt-0.5">
                {caseStudyContent.hero.threatsBlocked}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#08151b]/80 border border-[#11b5c4]/20">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Network Latency
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-[#11b5c4] mt-0.5">
                {caseStudyContent.hero.networkLatency}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#08151b]/80 border border-[#11b5c4]/20">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Active Memory
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-slate-200 mt-0.5">
                {caseStudyContent.hero.memoryLoad}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#1d0e14]/80 border border-[#ff2d4a]/40 shadow-[0_0_15px_rgba(255,45,74,0.15)]">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#ff2d4a] flex items-center justify-between">
                <span>Active Incidents</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff2d4a] animate-ping" />
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-[#ff2d4a] mt-0.5">
                {caseStudyContent.hero.activeIncidents} Flagged
              </div>
            </div>
          </div>

          {/* Isometric Angled Stage: Rotated (~-28deg to -30deg) */}
          <div className="relative rounded-2xl bg-[#051116]/95 border border-[#11b5c4]/25 p-4 sm:p-6 shadow-2xl overflow-hidden">
            {/* Background Grid Lines & Coordinates */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #11b5c4 1px, transparent 1px), linear-gradient(to bottom, #11b5c4 1px, transparent 1px)',
                backgroundSize: '36px 36px',
              }}
              aria-hidden="true"
            />

            {/* Rotated Isometric Presentation Wrapper */}
            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Left Column: Radial Gauge & Health Telemetry (4 cols) */}
              <motion.div
                initial={
                  shouldReduceMotion
                    ? { opacity: 1, x: 0 }
                    : { opacity: 0, x: -60, y: 60 }
                }
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-4 flex flex-col justify-between space-y-4"
              >
                <Gauge
                  score={caseStudyContent.hero.gauge.score}
                  label={caseStudyContent.hero.gauge.label}
                  sublabel={caseStudyContent.hero.gauge.sublabel}
                  status={caseStudyContent.hero.gauge.status}
                />

                {/* Micro Node Matrix */}
                <div className="p-3.5 rounded-xl bg-[#07161c]/80 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>SECURITY CLUSTER</span>
                    <span className="text-[#10b981]">SYNCED</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="flex-1 h-1.5 rounded-full bg-[#11b5c4]/40 overflow-hidden"
                      >
                        <div
                          className="h-full bg-[#11b5c4] rounded-full"
                          style={{ width: `${80 + (i * 3) % 20}%` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Center Column: 3D Isometric Floating Cubes & Incident Alert (4 cols) */}
              <motion.div
                initial={
                  shouldReduceMotion
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 60 }
                }
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-4 flex flex-col justify-between space-y-4"
              >
                {/* Critical Incident Alert Banner with soft pulsing glow */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#200b10] to-[#150a0e] border border-[#ff2d4a]/50 shadow-[0_0_24px_rgba(255,45,74,0.25)] flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-[#ff2d4a]/20 text-[#ff2d4a] border border-[#ff2d4a]/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ff2d4a] animate-ping" />
                      CRITICAL ALERT
                    </span>
                    <div className="text-xs font-bold text-white tracking-wide">
                      SANDBOX QUARANTINE
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      14 Suspicious payloads isolated
                    </div>
                  </div>

                  {/* Prominent Ticket Counter "14" */}
                  <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-[#2a0e14] border border-[#ff2d4a]/60 shadow-[0_0_15px_rgba(255,45,74,0.4)]">
                    <span className="text-2xl font-extrabold font-mono text-[#ff2d4a] leading-none">
                      {caseStudyContent.hero.activeIncidents}
                    </span>
                    <span className="text-[8px] font-mono text-[#ff2d4a]/80 uppercase mt-0.5">
                      VECTORS
                    </span>
                  </div>
                </div>

                {/* Isometric Cubes Showcase Area */}
                <div className="p-4 rounded-2xl bg-[#07161c]/80 border border-[#11b5c4]/20 relative overflow-hidden flex flex-col items-center justify-center">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2">
                    EXPLODED DATA LAYERS
                  </div>

                  <div className="flex items-center justify-center gap-2 sm:gap-4 py-2">
                    <Cube
                      color="yellow"
                      size={80}
                      delay={0}
                      label="HEURISTIC"
                      sublabel="LAYER 01"
                      floatDuration={4.5}
                    />
                    <Cube
                      color="green"
                      size={92}
                      delay={0.4}
                      label="AES-256"
                      sublabel="LAYER 02"
                      floatDuration={5.2}
                    />
                    <Cube
                      color="red"
                      size={80}
                      delay={0.8}
                      label="BREACH"
                      sublabel="LAYER 03"
                      floatDuration={4.8}
                    />
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 mt-1">
                    Kinetic multi-surface telemetry isolation
                  </div>
                </div>
              </motion.div>

              {/* Right Column: Live Monospace Terminal Feed (4 cols) */}
              <motion.div
                initial={
                  shouldReduceMotion
                    ? { opacity: 1, x: 0 }
                    : { opacity: 0, x: 60, y: 60 }
                }
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-4 flex flex-col justify-between space-y-4"
              >
                {/* Live Monospace Terminal Window */}
                <div className="h-full flex flex-col justify-between p-4 rounded-2xl bg-[#040c10]/95 border border-[#11b5c4]/30 shadow-inner font-mono text-[10px] sm:text-[11px] leading-relaxed">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3 text-slate-400">
                    <div className="flex items-center gap-1.5 text-[#11b5c4]">
                      <span className="w-2 h-2 rounded-full bg-[#11b5c4] animate-pulse" />
                      <span>LIVE TELEMETRY STREAM</span>
                    </div>
                    <span className="text-[9px] text-slate-500">TTY: /dev/sec0</span>
                  </div>

                  {/* Animated typing / streaming lines */}
                  <div className="space-y-2 text-slate-300 min-h-[160px] flex flex-col justify-end">
                    {typedLines.map((line, idx) => (
                      <motion.div
                        key={`${line}-${idx}`}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex items-start gap-1.5 font-mono text-[10px]"
                      >
                        <span className="text-[#11b5c4] select-none">{'>'}</span>
                        <span
                          className={
                            line.includes('14 threat') || line.includes('QUARANTINE')
                              ? 'text-[#ff2d4a]'
                              : line.includes('SHA-256') || line.includes('SAFE')
                              ? 'text-[#34d399]'
                              : 'text-slate-300'
                          }
                        >
                          {line}
                        </span>
                      </motion.div>
                    ))}

                    <div className="flex items-center gap-1 text-[#11b5c4] pt-1">
                      <span className="animate-pulse">_</span>
                      <span className="text-[9px] text-slate-500">
                        Listening for ingress packets...
                      </span>
                    </div>
                  </div>

                  {/* Bottom System Bar */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[9px] text-slate-400 mt-2">
                    <span>HASH_CHAIN: 0x9F4C...B81A</span>
                    <span className="text-[#10b981] font-bold">SHA-256 VALID</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
