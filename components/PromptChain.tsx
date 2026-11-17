'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface ChainNode {
  id: number;
  label: string;
  caption: string;
  icon: (className?: string) => React.ReactNode;
}

export const CHAIN_NODES: ChainNode[] = [
  {
    id: 1,
    label: '1 You write',
    caption: 'You write a prompt containing sensitive personal data or secrets',
    icon: (className = 'w-3 h-3') => (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
  },
  {
    id: 2,
    label: '2 Detect',
    caption: 'YapShield inspects prompt for Indian IDs, credentials, and injections',
    icon: (className = 'w-3 h-3') => (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    id: 3,
    label: '3 Tokenize',
    caption: 'Real name stays in YapShield; safe tokens created in vault',
    icon: (className = 'w-3 h-3') => (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    ),
  },
  {
    id: 4,
    label: '4 AI sees tokens',
    caption: 'AI only sees [PERSON_1] and safe placeholder tokens',
    icon: (className = 'w-3 h-3') => (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect width="16" height="16" x="4" y="4" rx="2" />
        <path d="M9 9h.01M15 9h.01M9 13h6" />
      </svg>
    ),
  },
  {
    id: 5,
    label: '5 AI answers',
    caption: 'AI generates an answer referring to the placeholder tokens',
    icon: (className = 'w-3 h-3') => (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 6,
    label: '6 Restore',
    caption: 'YapShield puts the real values back in the answer for you',
    icon: (className = 'w-3 h-3') => (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
];

export interface PromptChainProps {
  className?: string;
}

export default function PromptChain({ className = '' }: PromptChainProps) {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);
  const [isInView, setIsInView] = useState<boolean>(true);
  const [isDocHidden, setIsDocHidden] = useState<boolean>(false);

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

  // 12-second deterministic step timer: 1750ms per step, with a 1500ms pause after step 6 (index 5)
  useEffect(() => {
    if (isPaused || !isInView || isDocHidden || isReducedMotion) return;

    // Steps 0..4 run for 1750ms; step 5 runs for 1750ms + 1500ms pause = 3250ms
    const stepDuration = activeStep === 5 ? 3250 : 1750;

    const timer = setTimeout(() => {
      setActiveStep((prev) => (prev + 1) % 6);
    }, stepDuration);

    return () => clearTimeout(timer);
  }, [activeStep, isPaused, isInView, isDocHidden, isReducedMotion]);

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const handleReplay = useCallback(() => {
    setActiveStep(0);
    setIsPaused(false);
  }, []);

  // Under prefers-reduced-motion, show all 6 nodes static with their captions as a short list
  if (isReducedMotion) {
    return (
      <div
        ref={containerRef}
        className={`w-full py-2 space-y-3 font-mono ${className}`}
        aria-label="Prompt protection sequence"
      >
        <div className="flex items-center justify-between text-xs text-[var(--text-dim)] border-b border-[var(--border)] pb-1.5">
          <span className="font-semibold text-[var(--accent)] uppercase tracking-wider text-[11px]">
            How a prompt travels
          </span>
          <span className="text-[10px] text-[var(--text-dim)]">Static view</span>
        </div>

        {/* Static nodes row */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto py-1">
          {CHAIN_NODES.map((node, idx) => (
            <React.Fragment key={node.id}>
              <div className="flex flex-col items-center gap-1 min-w-[70px]">
                <div className="w-6 h-6 rounded-md border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-center text-[var(--text)]">
                  {node.icon('w-3 h-3')}
                </div>
                <span className="text-[10px] text-[var(--text-dim)] whitespace-nowrap">
                  {node.label}
                </span>
              </div>
              {idx < CHAIN_NODES.length - 1 && (
                <div className="flex-1 min-w-[12px] h-[1px] bg-[var(--border)]" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Captions as a short list */}
        <ol className="space-y-1 text-xs text-[var(--text-dim)] pt-1 border-t border-[var(--border)]">
          {CHAIN_NODES.map((node) => (
            <li key={node.id} className="flex items-start gap-1.5 leading-relaxed">
              <span className="text-[var(--accent)] font-semibold">{node.id}.</span>
              <span className="text-[var(--text)] font-medium whitespace-nowrap">{node.label}:</span>
              <span>{node.caption}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full flex flex-col items-center justify-center space-y-1.5 select-none ${className}`}
      aria-label="How a prompt travels simulation"
    >
      {/* Top Meta Bar: Explanatory Caption + Pause/Play/Replay controls */}
      <div className="w-full flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] font-semibold">
            How a prompt travels
          </span>
          <span className="text-[10px] font-mono text-[var(--text-dim)]/70 hidden sm:inline">
            (Explanatory flow)
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleTogglePause}
            aria-label={isPaused ? 'Resume prompt flow animation' : 'Pause prompt flow animation'}
            className="p-1 text-[var(--text-dim)] hover:text-[var(--text)] transition rounded hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border)]"
          >
            {isPaused ? (
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            ) : (
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={handleReplay}
            aria-label="Replay prompt flow animation from step 1"
            className="p-1 text-[var(--text-dim)] hover:text-[var(--text)] transition rounded hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border)]"
          >
            <svg
              className="w-3 h-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
        </div>
      </div>

      {/* Horizontal Chain of 6 Nodes connected by lines */}
      <div className="w-full flex items-center justify-between gap-1 overflow-x-auto py-1 px-1">
        {CHAIN_NODES.map((node, idx) => {
          const isActive = activeStep === idx;
          const isPassed = activeStep > idx;

          return (
            <React.Fragment key={node.id}>
              {/* Node Card */}
              <button
                type="button"
                onClick={() => {
                  setActiveStep(idx);
                  setIsPaused(false);
                }}
                aria-label={`Step ${node.label}: ${node.caption}`}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-mono transition-all duration-200 shrink-0 ${
                  isActive
                    ? 'border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)] ring-1 ring-[var(--accent)]/40 shadow-xs'
                    : isPassed
                    ? 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] opacity-90'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-dim)] opacity-60'
                }`}
              >
                <span className="shrink-0">{node.icon('w-3 h-3')}</span>
                <span className="text-[11px] font-medium whitespace-nowrap">{node.label}</span>
              </button>

              {/* 1px Connector Line with traveling packet dot */}
              {idx < CHAIN_NODES.length - 1 && (
                <div
                  className="relative flex-1 min-w-[12px] sm:min-w-[18px] lg:min-w-[24px] h-[1px] bg-[var(--border)] flex items-center"
                  aria-hidden="true"
                >
                  {/* Packet traveling from node idx to node idx+1 during step idx */}
                  {activeStep === idx && !isPaused && isInView && !isDocHidden && (
                    <div
                      className="absolute w-2 h-2 rounded-full bg-[var(--accent)] -top-[3.5px] shadow-xs hud-packet-travel"
                    />
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Single Fixed-Height Caption Line (nothing shifts) */}
      <div className="w-full h-6 flex items-center justify-center text-center px-2">
        <p className="text-[11px] sm:text-xs font-mono text-[var(--text-dim)] truncate max-w-full">
          <span className="text-[var(--accent)] font-semibold mr-1.5">
            {CHAIN_NODES[activeStep]?.label}:
          </span>
          <span className="text-[var(--text)]">
            {CHAIN_NODES[activeStep]?.caption}
          </span>
        </p>
      </div>
    </div>
  );
}
