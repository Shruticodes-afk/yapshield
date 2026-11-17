'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface PacketInspectorProps {
  className?: string;
}

export default function PacketInspector({ className = '' }: PacketInspectorProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isInView, setIsInView] = useState(true);
  const [isDocHidden, setIsDocHidden] = useState(false);
  const [replayKey, setReplayKey] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Pause when off-screen via IntersectionObserver
  useEffect(() => {
    if (!containerRef.current || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsInView(entry?.isIntersecting ?? true);
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Pause when document is hidden
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      setIsDocHidden(document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const shouldPause = isPaused || !isInView || isDocHidden;

  // Reduced motion: static frame with four packets frozen in before/after states and legend
  if (isReducedMotion) {
    return (
      <div
        ref={containerRef}
        className={`w-full flex flex-col ${className}`}
        aria-label="Packet Inspection Gate Simulation"
      >
        <div className="sr-only">
          Static view of YapShield packet inspection gate: clean prompts pass directly to the AI model, sensitive prompts have private data tokenized before dispatch, and prompt injections or secret keys are blocked at the gate.
        </div>

        {/* Panel Container */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] grid-bg relative overflow-hidden h-[300px] sm:h-[360px] w-full p-4 flex flex-col justify-between select-none">
          {/* Top Bar */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] font-semibold">
                Packet Inspection Gate
              </span>
            </div>
            <span className="text-[10px] font-mono text-[var(--text-dim)]">Static View</span>
          </div>

          {/* Static Lanes & Packets */}
          <div className="relative flex-1 w-full my-2">
            {/* 3 Lane Guides */}
            <div className="absolute top-[20%] left-0 right-0 h-[1px] border-b border-dashed border-[var(--border)] opacity-20" />
            <div className="absolute top-[50%] left-0 right-0 h-[1px] border-b border-dashed border-[var(--border)] opacity-20" />
            <div className="absolute top-[80%] left-0 right-0 h-[1px] border-b border-dashed border-[var(--border)] opacity-20" />

            {/* Center Gate */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-12 sm:w-16 border-x border-[var(--border)] bg-[var(--surface-2)]/25 flex flex-col items-center justify-start pt-2">
              <span className="px-1 py-0.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[9px] font-mono font-semibold text-[var(--accent)] tracking-wider uppercase">
                YapShield
              </span>
            </div>

            {/* Right AI Model Destination */}
            <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2.5 flex flex-col items-center justify-center text-center gap-1 shadow-xs">
              <svg className="w-4 h-4 text-[var(--text-dim)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="16" height="16" x="4" y="4" rx="2" />
                <path d="M9 9h.01M15 9h.01M9 13h6" />
              </svg>
              <span className="font-mono text-[10px] text-[var(--text-dim)] font-medium">AI model</span>
              <span className="font-mono text-[8px] text-[var(--accent)] font-semibold">Only tokens sent</span>
            </div>

            {/* 4 Frozen Packets in before/after states */}
            {/* 1. Clean packet (Passed) */}
            <div className="absolute top-[14%] right-[28%] z-10 flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-[11px] font-mono shadow-xs">
              <svg className="w-3 h-3 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Explain recursion simply</span>
              <span className="text-[9px] uppercase px-1 py-0.2 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                passed
              </span>
            </div>

            {/* 2. Sensitive packet (Before gate: raw) */}
            <div className="absolute top-[44%] left-[6%] z-10 flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-[11px] font-mono shadow-xs">
              <svg className="w-3 h-3 text-[var(--warn)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M20 21a8 8 0 1 0-16 0" />
              </svg>
              <span>call 98765 43210</span>
              <span className="text-[9px] uppercase px-1 py-0.2 rounded border border-[var(--border)] text-[var(--text-dim)]">
                raw
              </span>
            </div>

            {/* 3. Sensitive packet (After gate: tokenized) */}
            <div className="absolute top-[44%] right-[28%] z-10 flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--accent)] border-b-2 bg-[var(--surface-2)] text-[var(--text)] text-[11px] font-mono shadow-xs">
              <svg className="w-3 h-3 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="text-[var(--accent)] font-medium">call [PHONE_1]</span>
              <span className="text-[9px] uppercase px-1 py-0.2 rounded border border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)] font-semibold flex items-center gap-0.5">
                <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                tokenized
              </span>
            </div>

            {/* 4. Attack packet (Blocked at gate) */}
            <div className="absolute top-[74%] left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded border-2 border-red-500 bg-[var(--surface-2)] text-red-500 text-[11px] font-mono shadow-xs">
              <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="text-red-600 dark:text-red-400 font-semibold">key=AIzaSyD2849x...</span>
              <span className="text-[9px] uppercase px-1 py-0.2 rounded border border-red-500 bg-red-500/10 text-red-500 font-bold">
                blocked
              </span>
            </div>
          </div>

          {/* Ingress / Egress labels */}
          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-dim)] border-t border-[var(--border)] pt-2">
            <span>Ingress Traffic</span>
            <span>AI Destination</span>
          </div>
        </div>

        {/* Legend & Caption under panel */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[var(--text-dim)]">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-center text-emerald-500">
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span className="text-[11px] sm:text-xs">Passed (Clean)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded border border-[var(--accent)] bg-[var(--surface-2)] flex items-center justify-center text-[var(--accent)]">
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
              <span className="text-[11px] sm:text-xs">Tokenized ([TOKEN])</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded border border-red-500/50 bg-[var(--surface-2)] flex items-center justify-center text-red-500">
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <span className="text-[11px] sm:text-xs">Blocked (Attack/Key)</span>
            </div>
          </div>

          <div className="text-[11px] text-[var(--text-dim)] italic">
            Illustrative simulation, not live traffic.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full flex flex-col ${className}`}
      aria-label="Packet Inspection Gate Simulation"
    >
      {/* Screen-reader descriptive summary */}
      <div className="sr-only">
        Interactive simulation showing YapShield packet inspection: clean prompts pass directly to the AI model, sensitive prompts have personal data tokenized before dispatch, and prompt injections or secret keys are blocked at the gate.
      </div>

      {/* Main Panel Container: Fixed height (360px desktop, 300px mobile), 8px radius, faint grid-bg */}
      <div
        className={`rounded-lg border border-[var(--border)] bg-[var(--surface)] grid-bg relative overflow-hidden h-[300px] sm:h-[360px] w-full p-3 sm:p-4 flex flex-col justify-between select-none ${
          shouldPause ? 'inspector-paused' : ''
        }`}
      >
        {/* Top Header / Status bar inside panel */}
        <div className="flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] font-semibold">
              Packet Inspection Gate
            </span>
          </div>

          {/* Pause / Play and Replay controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              aria-label={isPaused ? 'Resume packet inspection animation' : 'Pause packet inspection animation'}
              className="p-1 rounded border border-transparent hover:border-[var(--border)] bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] text-[var(--text-dim)] hover:text-[var(--text)] transition"
            >
              {isPaused ? (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setReplayKey((k) => k + 1);
                setIsPaused(false);
              }}
              aria-label="Replay packet inspection animation"
              className="p-1 rounded border border-transparent hover:border-[var(--border)] bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] text-[var(--text-dim)] hover:text-[var(--text)] transition"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </button>
          </div>
        </div>

        {/* Animation Arena: 3 Lanes, Central Gate, Destination Box */}
        <div key={replayKey} className="relative flex-1 w-full my-2 overflow-hidden">
          {/* Horizontal Lane Guidelines (dotted lines) */}
          <div className="absolute top-[22%] left-0 right-0 h-[1px] border-b border-dashed border-[var(--border)] opacity-20 pointer-events-none" />
          <div className="absolute top-[50%] left-0 right-0 h-[1px] border-b border-dashed border-[var(--border)] opacity-20 pointer-events-none" />
          <div className="absolute top-[78%] left-0 right-0 h-[1px] border-b border-dashed border-[var(--border)] opacity-20 pointer-events-none" />

          {/* Centre Gate: thin vertical frame with tick marks & 1px sweeping scan line */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-12 sm:w-16 border-x border-[var(--border)] bg-[var(--surface-2)]/25 pointer-events-none z-10 flex flex-col items-center justify-between">
            {/* Gate Top Label */}
            <div className="pt-1.5">
              <span className="px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[9px] sm:text-[10px] font-mono font-semibold text-[var(--accent)] tracking-wider uppercase shadow-xs">
                YapShield
              </span>
            </div>

            {/* Vertical Tick Marks on Gate Borders */}
            <div className="absolute inset-y-10 left-0 flex flex-col justify-between py-2 pointer-events-none">
              <div className="w-1.5 h-[1px] bg-[var(--border)]" />
              <div className="w-1.5 h-[1px] bg-[var(--border)]" />
              <div className="w-1.5 h-[1px] bg-[var(--border)]" />
              <div className="w-1.5 h-[1px] bg-[var(--border)]" />
              <div className="w-1.5 h-[1px] bg-[var(--border)]" />
            </div>
            <div className="absolute inset-y-10 right-0 flex flex-col justify-between py-2 pointer-events-none">
              <div className="w-1.5 h-[1px] bg-[var(--border)] ml-auto" />
              <div className="w-1.5 h-[1px] bg-[var(--border)] ml-auto" />
              <div className="w-1.5 h-[1px] bg-[var(--border)] ml-auto" />
              <div className="w-1.5 h-[1px] bg-[var(--border)] ml-auto" />
              <div className="w-1.5 h-[1px] bg-[var(--border)] ml-auto" />
            </div>

            {/* 1px Sweeping Accent Scanline */}
            <div className="absolute left-0 right-0 h-[1px] bg-[var(--accent)] shadow-xs hud-scanline" />

            <div className="pb-1 text-[8px] font-mono text-[var(--text-dim)] uppercase">Gate</div>
          </div>

          {/* Right Lane Destination: AI Model Box */}
          <div className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 sm:px-3 py-2 sm:py-3 flex flex-col items-center justify-center text-center gap-1 shadow-xs">
            <svg className="w-4 h-4 text-[var(--text-dim)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="16" height="16" x="4" y="4" rx="2" />
              <path d="M9 9h.01M15 9h.01M9 13h6" />
            </svg>
            <span className="font-mono text-[10px] text-[var(--text-dim)] font-medium">AI model</span>
            <span className="font-mono text-[8px] text-[var(--accent)] font-semibold">Only tokens sent</span>
          </div>

          {/* =========================================================================
              6 DETERMINISTIC PACKETS: 14s cycle using transform & opacity only
             ========================================================================= */}

          {/* PACKET 1: Sensitive | Middle Lane (top: 44%) | delay: 0s */}
          <div
            className="absolute left-0 w-full pointer-events-none select-none z-10"
            style={{ top: '44%' }}
            aria-hidden="true"
          >
            <div
              className="w-full relative"
              style={{
                animation: 'packetSensitiveMotion 14s linear infinite',
                animationDelay: '0s',
              }}
            >
              <div className="absolute left-0 -translate-x-1/2">
                {/* Raw View */}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-[11px] sm:text-xs font-mono shadow-xs whitespace-nowrap"
                  style={{
                    animation: 'sensitiveRawFade 14s linear infinite',
                    animationDelay: '0s',
                  }}
                >
                  <svg className="w-3 h-3 text-[var(--warn)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M20 21a8 8 0 1 0-16 0" />
                  </svg>
                  <span>call 98765 43210</span>
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded border border-[var(--border)] text-[var(--text-dim)]">
                    raw
                  </span>
                </div>

                {/* Tokenized View */}
                <div
                  className="absolute inset-0 flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--accent)] border-b-2 bg-[var(--surface-2)] text-[var(--text)] text-[11px] sm:text-xs font-mono shadow-xs whitespace-nowrap"
                  style={{
                    animation: 'sensitiveTokenizedFade 14s linear infinite',
                    animationDelay: '0s',
                  }}
                >
                  <svg className="w-3 h-3 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span className="text-[var(--accent)] font-medium">call [PHONE_1]</span>
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded border border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)] font-semibold flex items-center gap-0.5">
                    <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    tokenized
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PACKET 2: Clean | Top Lane (top: 15%) | delay: -11.7s (2.3s after pkt 1) */}
          <div
            className="absolute left-0 w-full pointer-events-none select-none z-10"
            style={{ top: '15%' }}
            aria-hidden="true"
          >
            <div
              className="w-full relative"
              style={{
                animation: 'packetCleanMotion 14s linear infinite',
                animationDelay: '-11.7s',
              }}
            >
              <div className="absolute left-0 -translate-x-1/2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-[11px] sm:text-xs font-mono shadow-xs whitespace-nowrap">
                  <svg className="w-3 h-3 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="truncate max-w-[140px] sm:max-w-none">Explain recursion simply</span>
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                    passed
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PACKET 3: Attack | Bottom Lane (top: 72%) | delay: -9.4s (4.6s after pkt 1) */}
          <div
            className="absolute left-0 w-full pointer-events-none select-none z-10"
            style={{ top: '72%' }}
            aria-hidden="true"
          >
            <div
              className="w-full relative"
              style={{
                animation: 'packetAttackMotion 14s linear infinite',
                animationDelay: '-9.4s',
              }}
            >
              <div className="absolute left-0 -translate-x-1/2">
                {/* Incoming Attack Prompt */}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-[11px] sm:text-xs font-mono shadow-xs whitespace-nowrap"
                  style={{
                    animation: 'attackRawFade 14s linear infinite',
                    animationDelay: '-9.4s',
                  }}
                >
                  <svg className="w-3 h-3 text-[var(--warn)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span className="truncate max-w-[140px] sm:max-w-none">ignore previous instructions...</span>
                </div>

                {/* Blocked at gate */}
                <div
                  className="absolute inset-0 flex items-center gap-1.5 px-2.5 py-1 rounded border-2 border-red-500 bg-[var(--surface-2)] text-red-500 text-[11px] sm:text-xs font-mono shadow-xs whitespace-nowrap"
                  style={{
                    animation: 'attackBlockedFade 14s linear infinite',
                    animationDelay: '-9.4s',
                  }}
                >
                  <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span className="truncate max-w-[120px] sm:max-w-none text-red-600 dark:text-red-400 font-semibold">ignore previous instructions...</span>
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded border border-red-500 bg-red-500/10 text-red-500 font-bold">
                    blocked
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PACKET 4: Sensitive | Top Lane (top: 15%) | delay: -7.0s (7.0s after pkt 1) */}
          <div
            className="absolute left-0 w-full pointer-events-none select-none z-10"
            style={{ top: '15%' }}
            aria-hidden="true"
          >
            <div
              className="w-full relative"
              style={{
                animation: 'packetSensitiveMotion 14s linear infinite',
                animationDelay: '-7.0s',
              }}
            >
              <div className="absolute left-0 -translate-x-1/2">
                {/* Raw View */}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-[11px] sm:text-xs font-mono shadow-xs whitespace-nowrap"
                  style={{
                    animation: 'sensitiveRawFade 14s linear infinite',
                    animationDelay: '-7.0s',
                  }}
                >
                  <svg className="w-3 h-3 text-[var(--warn)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M20 21a8 8 0 1 0-16 0" />
                  </svg>
                  <span>mail rahul@example.com</span>
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded border border-[var(--border)] text-[var(--text-dim)]">
                    raw
                  </span>
                </div>

                {/* Tokenized View */}
                <div
                  className="absolute inset-0 flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--accent)] border-b-2 bg-[var(--surface-2)] text-[var(--text)] text-[11px] sm:text-xs font-mono shadow-xs whitespace-nowrap"
                  style={{
                    animation: 'sensitiveTokenizedFade 14s linear infinite',
                    animationDelay: '-7.0s',
                  }}
                >
                  <svg className="w-3 h-3 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span className="text-[var(--accent)] font-medium">mail [EMAIL_1]</span>
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded border border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)] font-semibold flex items-center gap-0.5">
                    <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    tokenized
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PACKET 5: Attack | Middle Lane (top: 44%) | delay: -4.7s (9.3s after pkt 1) */}
          <div
            className="absolute left-0 w-full pointer-events-none select-none z-10"
            style={{ top: '44%' }}
            aria-hidden="true"
          >
            <div
              className="w-full relative"
              style={{
                animation: 'packetAttackMotion 14s linear infinite',
                animationDelay: '-4.7s',
              }}
            >
              <div className="absolute left-0 -translate-x-1/2">
                {/* Incoming Attack Prompt */}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-[11px] sm:text-xs font-mono shadow-xs whitespace-nowrap"
                  style={{
                    animation: 'attackRawFade 14s linear infinite',
                    animationDelay: '-4.7s',
                  }}
                >
                  <svg className="w-3 h-3 text-[var(--warn)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span className="truncate max-w-[140px] sm:max-w-none">key=AIzaSyD2849x...</span>
                </div>

                {/* Blocked at gate */}
                <div
                  className="absolute inset-0 flex items-center gap-1.5 px-2.5 py-1 rounded border-2 border-red-500 bg-[var(--surface-2)] text-red-500 text-[11px] sm:text-xs font-mono shadow-xs whitespace-nowrap"
                  style={{
                    animation: 'attackBlockedFade 14s linear infinite',
                    animationDelay: '-4.7s',
                  }}
                >
                  <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span className="truncate max-w-[120px] sm:max-w-none text-red-600 dark:text-red-400 font-semibold">key=AIzaSyD2849x...</span>
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded border border-red-500 bg-red-500/10 text-red-500 font-bold">
                    blocked
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PACKET 6: Clean | Bottom Lane (top: 72%) | delay: -2.4s (11.6s after pkt 1) */}
          <div
            className="absolute left-0 w-full pointer-events-none select-none z-10"
            style={{ top: '72%' }}
            aria-hidden="true"
          >
            <div
              className="w-full relative"
              style={{
                animation: 'packetCleanMotion 14s linear infinite',
                animationDelay: '-2.4s',
              }}
            >
              <div className="absolute left-0 -translate-x-1/2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-[11px] sm:text-xs font-mono shadow-xs whitespace-nowrap">
                  <svg className="w-3 h-3 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="truncate max-w-[140px] sm:max-w-none">Summarize meeting notes</span>
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                    passed
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Lane Labels */}
        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-dim)] border-t border-[var(--border)] pt-2 z-10">
          <span>Ingress Traffic</span>
          <span>AI Destination</span>
        </div>
      </div>

      {/* Legend & Caption Under Panel */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Legend: Passed, Tokenized, Blocked (icon + text) */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[var(--text-dim)]">
          {/* Passed */}
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-center text-emerald-500">
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span className="text-[11px] sm:text-xs">Passed (Clean)</span>
          </div>

          {/* Tokenized */}
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded border border-[var(--accent)] bg-[var(--surface-2)] flex items-center justify-center text-[var(--accent)]">
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </span>
            <span className="text-[11px] sm:text-xs">Tokenized ([TOKEN])</span>
          </div>

          {/* Blocked */}
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded border border-red-500/50 bg-[var(--surface-2)] flex items-center justify-center text-red-500">
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <span className="text-[11px] sm:text-xs">Blocked (Attack/Key)</span>
          </div>
        </div>

        {/* Required Caption */}
        <div className="text-[11px] text-[var(--text-dim)] italic">
          Illustrative simulation, not live traffic.
        </div>
      </div>
    </div>
  );
}
