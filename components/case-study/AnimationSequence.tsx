'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { caseStudyContent, KeyframeScreen } from '../../lib/caseStudyContent';

export default function AnimationSequence() {
  const shouldReduceMotion = useReducedMotion();
  const screens = caseStudyContent.animationSequence.screens;
  const [activeScreenIndex, setActiveScreenIndex] = useState(0);
  const activeScreen = screens[activeScreenIndex];
  const filmstripRef = useRef<HTMLDivElement | null>(null);

  const handleSelectScreen = (idx: number) => {
    setActiveScreenIndex(idx);
    if (filmstripRef.current) {
      const activeEl = filmstripRef.current.children[idx] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: shouldReduceMotion ? 'auto' : 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    }
  };

  const handleNext = () => {
    handleSelectScreen((activeScreenIndex + 1) % screens.length);
  };

  const handlePrev = () => {
    handleSelectScreen((activeScreenIndex - 1 + screens.length) % screens.length);
  };

  // Helper to render distinctive SVG keyframe illustration for each stage
  const renderKeyframeVisual = (screen: KeyframeScreen) => {
    switch (screen.id) {
      case 'kf-01':
        // Boot & Node Discovery wireframe
        return (
          <svg className="w-full h-full" viewBox="0 0 320 180" fill="none">
            <rect width="320" height="180" fill="#040e12" />
            <path
              d="M30 140 L160 40 L290 140 L160 170 Z"
              stroke="#11b5c4"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              fill="rgba(17,181,196,0.06)"
            />
            <circle cx="160" cy="40" r="4" fill="#11b5c4" />
            <circle cx="30" cy="140" r="3" fill="#11b5c4" />
            <circle cx="290" cy="140" r="3" fill="#11b5c4" />
            <circle cx="160" cy="100" r="6" fill="#34d399" />
            <line x1="160" y1="40" x2="160" y2="100" stroke="#11b5c4" strokeWidth="1" />
            <line x1="30" y1="140" x2="160" y2="100" stroke="#11b5c4" strokeWidth="1" />
            <line x1="290" y1="140" x2="160" y2="100" stroke="#11b5c4" strokeWidth="1" />
            <text x="160" y="155" textAnchor="middle" fill="#11b5c4" fontSize="10" fontFamily="monospace">
              BOOTSTRAP_GRID_30DEG
            </text>
          </svg>
        );
      case 'kf-02':
        // Threat Radar & Ingress Scan
        return (
          <svg className="w-full h-full" viewBox="0 0 320 180" fill="none">
            <rect width="320" height="180" fill="#040e12" />
            <circle cx="160" cy="90" r="70" stroke="#0e3a44" strokeWidth="1.5" />
            <circle cx="160" cy="90" r="50" stroke="#10b981" strokeWidth="1.5" strokeDasharray="6 4" />
            <circle cx="160" cy="90" r="30" stroke="#11b5c4" strokeWidth="1" />
            <line x1="160" y1="90" x2="220" y2="40" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
            <circle cx="200" cy="55" r="3.5" fill="#f59e0b" />
            <circle cx="120" cy="75" r="3" fill="#10b981" />
            <circle cx="160" cy="90" r="4" fill="#11b5c4" />
            <text x="160" y="165" textAnchor="middle" fill="#10b981" fontSize="10" fontFamily="monospace">
              RADAR_INGRESS: 1.2ms
            </text>
          </svg>
        );
      case 'kf-03':
        // Exploded 3D Cube Layers
        return (
          <svg className="w-full h-full" viewBox="0 0 320 180" fill="none">
            <rect width="320" height="180" fill="#040e12" />
            {/* Top slice */}
            <path d="M120 40 L160 20 L200 40 L160 60 Z" fill="rgba(251,191,36,0.35)" stroke="#fbbf24" strokeWidth="1.5" />
            {/* Middle slice */}
            <path d="M120 70 L160 50 L200 70 L160 90 Z" fill="rgba(52,211,153,0.35)" stroke="#34d399" strokeWidth="1.5" />
            {/* Bottom slice */}
            <path d="M120 100 L160 80 L200 100 L160 120 Z" fill="rgba(255,45,74,0.35)" stroke="#ff2d4a" strokeWidth="1.5" />
            <line x1="160" y1="20" x2="160" y2="120" stroke="#11b5c4" strokeWidth="1" strokeDasharray="3 3" />
            <text x="160" y="160" textAnchor="middle" fill="#fbbf24" fontSize="10" fontFamily="monospace">
              EXPLODED_ISOMETRIC_VIEW
            </text>
          </svg>
        );
      case 'kf-04':
        // Critical Incident Containment & Lockdown
        return (
          <svg className="w-full h-full" viewBox="0 0 320 180" fill="none">
            <rect width="320" height="180" fill="#120609" />
            <rect x="70" y="30" width="180" height="120" rx="12" fill="#200b10" stroke="#ff2d4a" strokeWidth="2" />
            <circle cx="160" cy="75" r="24" stroke="#ff2d4a" strokeWidth="2" strokeDasharray="4 3" />
            <circle cx="160" cy="75" r="12" fill="#ff2d4a" />
            <text x="160" y="125" textAnchor="middle" fill="#ff2d4a" fontSize="12" fontWeight="bold" fontFamily="monospace">
              QUARANTINE ARMED (14)
            </text>
            <text x="160" y="142" textAnchor="middle" fill="#fca5a5" fontSize="9" fontFamily="monospace">
              PERIMETER ISOLATED
            </text>
          </svg>
        );
      case 'kf-05':
        // Policy Enforcement & Hash Chain Re-Anchor
        return (
          <svg className="w-full h-full" viewBox="0 0 320 180" fill="none">
            <rect width="320" height="180" fill="#040e12" />
            <rect x="50" y="60" width="60" height="50" rx="8" fill="#071a22" stroke="#11b5c4" strokeWidth="1.5" />
            <text x="80" y="88" textAnchor="middle" fill="#11b5c4" fontSize="9" fontFamily="monospace">GENESIS</text>
            <line x1="110" y1="85" x2="135" y2="85" stroke="#34d399" strokeWidth="2" />
            <rect x="135" y="60" width="60" height="50" rx="8" fill="#071a22" stroke="#10b981" strokeWidth="2" />
            <text x="165" y="88" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold" fontFamily="monospace">BLOCK_N</text>
            <line x1="195" y1="85" x2="220" y2="85" stroke="#34d399" strokeWidth="2" />
            <rect x="220" y="60" width="60" height="50" rx="8" fill="#071a22" stroke="#11b5c4" strokeWidth="1.5" />
            <text x="250" y="88" textAnchor="middle" fill="#11b5c4" fontSize="9" fontFamily="monospace">RESTORE</text>
            <text x="160" y="150" textAnchor="middle" fill="#34d399" fontSize="10" fontFamily="monospace">
              SHA-256 LEDGER VERIFIED
            </text>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
      {/* 1. Header & Red Eyebrow Label */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ff2d4a]" />
          <span className="text-[11px] sm:text-[12px] font-semibold tracking-[0.22em] uppercase text-[#ff2d4a]">
            {caseStudyContent.animationSequence.label}
          </span>
        </div>

        <h3 className="text-xl sm:text-[28px] font-bold text-white tracking-tight leading-snug">
          {caseStudyContent.animationSequence.title}
        </h3>

        <p className="text-[12px] sm:text-[13px] text-[#b8bcc2] leading-[1.75] font-normal">
          {caseStudyContent.animationSequence.description}
        </p>
      </div>

      {/* 2. Filmstrip Timeline Scrubber Buttons / Stepper */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-4">
        {/* Step Indicators */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
          {screens.map((screen, idx) => {
            const isActive = idx === activeScreenIndex;
            return (
              <button
                key={screen.id}
                type="button"
                onClick={() => handleSelectScreen(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 border ${
                  isActive
                    ? 'bg-[#11b5c4]/15 border-[#11b5c4] text-[#11b5c4] shadow-[0_0_12px_rgba(17,181,196,0.3)] font-bold'
                    : 'bg-[#0a151a]/60 border-white/5 text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                <span className="text-[10px] opacity-75">{screen.step}</span>
                <span className="hidden sm:inline">•</span>
                <span className="text-[10px] font-mono">{screen.timecode}</span>
              </button>
            );
          })}
        </div>

        {/* Previous / Next Navigation Buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            className="w-8 h-8 rounded-lg bg-[#0b1a20] border border-white/10 hover:border-[#11b5c4] text-slate-300 hover:text-white flex items-center justify-center transition-colors text-xs"
            aria-label="Previous sequence frame"
          >
            ←
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="w-8 h-8 rounded-lg bg-[#0b1a20] border border-white/10 hover:border-[#11b5c4] text-slate-300 hover:text-white flex items-center justify-center transition-colors text-xs"
            aria-label="Next sequence frame"
          >
            →
          </button>
        </div>
      </div>

      {/* 3. Featured Active Screen Showcase Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeScreen.id}
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -16 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl bg-gradient-to-b from-[#09171d] via-[#071317] to-[#040c0f] border border-[#11b5c4]/40 p-5 sm:p-8 shadow-[0_20px_70px_rgba(11,59,68,0.35)] relative overflow-hidden"
        >
          {/* Subtle Ambient Stage Glow */}
          <div
            className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
            style={{ backgroundColor: activeScreen.badgeColor }}
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Visual Viewport / Screen Preview (7 cols) */}
            <div className="lg:col-span-7 rounded-2xl bg-[#03090c] border border-white/10 overflow-hidden shadow-2xl relative aspect-[16/9] flex items-center justify-center">
              {renderKeyframeVisual(activeScreen)}

              {/* Top Glassy Overlay Bar */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-slate-400 bg-[#061217]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: activeScreen.badgeColor }}
                  />
                  <span>{activeScreen.subtitle}</span>
                </span>
                <span className="text-white font-bold">{activeScreen.timecode}</span>
              </div>
            </div>

            {/* Content Details (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border"
                    style={{
                      color: activeScreen.badgeColor,
                      borderColor: `${activeScreen.badgeColor}60`,
                      backgroundColor: `${activeScreen.badgeColor}15`,
                    }}
                  >
                    {activeScreen.step}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {activeScreen.metric}
                  </span>
                </div>

                <h4 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {activeScreen.title}
                </h4>

                <p className="text-[12px] sm:text-[13px] text-[#b8bcc2] leading-[1.75]">
                  {activeScreen.description}
                </p>
              </div>

              {/* Technical Breakdown Details */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
                  Motion & Kinetic Specs:
                </span>
                <ul className="space-y-1.5">
                  {activeScreen.details.map((detail) => (
                    <li
                      key={detail}
                      className="flex items-start gap-2 text-xs text-slate-300"
                    >
                      <span className="text-[#11b5c4] font-bold mt-0.5">›</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 4. Horizontal Filmstrip Carousel of all screens */}
      <div
        ref={filmstripRef}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4"
      >
        {screens.map((screen, idx) => {
          const isActive = idx === activeScreenIndex;
          return (
            <button
              key={screen.id}
              type="button"
              onClick={() => handleSelectScreen(idx)}
              className={`p-3 rounded-2xl text-left transition-all flex flex-col justify-between space-y-3 border ${
                isActive
                  ? 'bg-[#0a1e26] border-[#11b5c4] shadow-[0_0_20px_rgba(17,181,196,0.3)] ring-1 ring-[#11b5c4]'
                  : 'bg-[#081318]/70 border-white/5 hover:border-white/20 hover:bg-[#0b1a20]'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className={isActive ? 'text-[#11b5c4] font-bold' : ''}>
                  {screen.step}
                </span>
                <span>{screen.timecode}</span>
              </div>

              <div className="aspect-[16/9] w-full rounded-lg bg-[#03080a] border border-white/10 overflow-hidden flex items-center justify-center p-1">
                {renderKeyframeVisual(screen)}
              </div>

              <div className="text-[11px] font-semibold text-slate-200 line-clamp-1">
                {screen.title}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
