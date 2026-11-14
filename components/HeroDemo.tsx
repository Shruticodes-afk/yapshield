'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

const FULL_PROMPT = 'My name is Shruti. Write a short thank-you note.';

const STEP_TITLES = [
  'You write a prompt',
  'YapShield finds private data',
  'YapShield replaces it with a token',
  'The AI only sees the token',
  'The AI answers using the token',
  'YapShield puts the real value back',
] as const;

const STEP_CAPTIONS = [
  'You write a prompt',
  'YapShield finds private data',
  'The real name stays inside YapShield',
  'The AI only sees the token',
  'The AI answers using the token',
  'The AI never saw your name',
] as const;

type PacketTransfer =
  | 'none'
  | 'you-to-yap'
  | 'yap-to-ai'
  | 'ai-to-yap'
  | 'yap-to-you';

export default function HeroDemo() {
  const [step, setStep] = useState<number>(0);
  const [typedChars, setTypedChars] = useState<number>(FULL_PROMPT.length);
  const [packetTransfer, setPacketTransfer] = useState<PacketTransfer>('none');
  const [packetMoving, setPacketMoving] = useState<boolean>(false);
  const [yapshieldTokenized, setYapshieldTokenized] = useState<boolean>(false);
  const [aiThinking, setAiThinking] = useState<boolean>(false);
  const [yapshieldRestored, setYapshieldRestored] = useState<boolean>(false);
  const [youHasAnswer, setYouHasAnswer] = useState<boolean>(false);

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  const userPausedRef = useRef<boolean>(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const currentStepRef = useRef<number>(0);

  // Helper to schedule a timeout and track it for cleanup
  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter((t) => t !== id);
      fn();
    }, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  // Helper to clear all scheduled timeouts
  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  // Check prefers-reduced-motion media query
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // One step state machine with setTimeout
  const runStep = useCallback(
    (stepIdx: number) => {
      clearAllTimeouts();
      currentStepRef.current = stepIdx;
      setStep(stepIdx);

      if (stepIdx === 0) {
        // Step 1: 'You write a prompt'
        setTypedChars(0);
        setPacketTransfer('none');
        setPacketMoving(false);
        setYapshieldTokenized(false);
        setAiThinking(false);
        setYapshieldRestored(false);
        setYouHasAnswer(false);

        // Type characters incrementally across ~1800ms
        const totalChars = FULL_PROMPT.length;
        const charInterval = Math.floor(1800 / totalChars);
        for (let i = 1; i <= totalChars; i++) {
          scheduleTimeout(() => {
            setTypedChars(i);
          }, i * charInterval);
        }

        // Settle, then advance to Step 2
        scheduleTimeout(() => {
          runStep(1);
        }, 2600);
      } else if (stepIdx === 1) {
        // Step 2: 'YapShield finds private data'
        setTypedChars(FULL_PROMPT.length);
        setYouHasAnswer(false);
        setYapshieldTokenized(false);
        setYapshieldRestored(false);
        setPacketTransfer('you-to-yap');
        setPacketMoving(false);

        // Start packet travel on next tick
        scheduleTimeout(() => {
          setPacketMoving(true);
        }, 30);

        // Arrival at YapShield: packet disappears, prompt appears with highlight
        scheduleTimeout(() => {
          setPacketTransfer('none');
          setPacketMoving(false);
        }, 630);

        // Settle, then advance to Step 3
        scheduleTimeout(() => {
          runStep(2);
        }, 2400);
      } else if (stepIdx === 2) {
        // Step 3: 'YapShield replaces it with a token'
        setTypedChars(FULL_PROMPT.length);
        setPacketTransfer('none');
        setPacketMoving(false);
        setYapshieldRestored(false);

        // Morph 'Shruti' into [PERSON_1] in place
        scheduleTimeout(() => {
          setYapshieldTokenized(true);
        }, 200);

        // Settle, then advance to Step 4
        scheduleTimeout(() => {
          runStep(3);
        }, 2200);
      } else if (stepIdx === 3) {
        // Step 4: 'The AI only sees the token'
        setYapshieldTokenized(true);
        setYapshieldRestored(false);
        setPacketTransfer('yap-to-ai');
        setPacketMoving(false);
        setAiThinking(false);

        // Start packet travel to AI
        scheduleTimeout(() => {
          setPacketMoving(true);
        }, 30);

        // Packet reaches AI, AI starts thinking dots for ~1 second
        scheduleTimeout(() => {
          setPacketTransfer('none');
          setPacketMoving(false);
          setAiThinking(true);
        }, 630);

        // Settle, then advance to Step 5
        scheduleTimeout(() => {
          runStep(4);
        }, 2600);
      } else if (stepIdx === 4) {
        // Step 5: 'The AI answers using the token'
        setAiThinking(false);
        setPacketTransfer('none');
        setPacketMoving(false);

        // Send packet back from AI to YapShield
        scheduleTimeout(() => {
          setPacketTransfer('ai-to-yap');
          setPacketMoving(false);
        }, 400);

        scheduleTimeout(() => {
          setPacketMoving(true);
        }, 430);

        scheduleTimeout(() => {
          setPacketTransfer('none');
          setPacketMoving(false);
        }, 1030);

        // Settle, then advance to Step 6
        scheduleTimeout(() => {
          runStep(5);
        }, 2400);
      } else if (stepIdx === 5) {
        // Step 6: 'YapShield puts the real value back'
        setYapshieldRestored(false);
        setPacketTransfer('none');
        setPacketMoving(false);

        // Cross-fade [PERSON_1] into 'Shruti' with highlight in YapShield box
        scheduleTimeout(() => {
          setYapshieldRestored(true);
        }, 200);

        // Send packet from YapShield to You
        scheduleTimeout(() => {
          setPacketTransfer('yap-to-you');
          setPacketMoving(false);
        }, 900);

        scheduleTimeout(() => {
          setPacketMoving(true);
        }, 930);

        // Packet arrives at You, You box displays final answer
        scheduleTimeout(() => {
          setPacketTransfer('none');
          setPacketMoving(false);
          setYouHasAnswer(true);
        }, 1530);

        // Pause 2 seconds, then loop back to Step 1
        scheduleTimeout(() => {
          runStep(0);
        }, 3800);
      }
    },
    [clearAllTimeouts, scheduleTimeout]
  );

  // Initialize and run state machine when not paused and not reduced motion
  useEffect(() => {
    if (prefersReducedMotion || isPaused) {
      clearAllTimeouts();
      return;
    }

    runStep(currentStepRef.current);

    return () => {
      clearAllTimeouts();
    };
  }, [isPaused, prefersReducedMotion, runStep, clearAllTimeouts]);

  // Pause when document is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsPaused(true);
        clearAllTimeouts();
      } else if (!userPausedRef.current) {
        setIsPaused(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clearAllTimeouts]);

  // Toggle user pause / play
  const handleTogglePlayPause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      userPausedRef.current = next;
      if (next) {
        clearAllTimeouts();
      }
      return next;
    });
  }, [clearAllTimeouts]);

  // Replay from start
  const handleReplay = useCallback(() => {
    userPausedRef.current = false;
    setIsPaused(false);
    runStep(0);
  }, [runStep]);

  // Jump to specific step
  const handleJumpToStep = useCallback(
    (stepIdx: number) => {
      userPausedRef.current = false;
      setIsPaused(false);
      runStep(stepIdx);
    },
    [runStep]
  );

  // Static vertical sequence for prefers-reduced-motion (no timers, all 6 steps)
  if (prefersReducedMotion) {
    return (
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 sm:p-6 space-y-6 text-xs sm:text-sm font-mono text-[var(--text)]"
        aria-label="YapShield prompt protection demonstration"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <span className="font-sans font-semibold text-[var(--text)]">
            How YapShield Protects Prompts
          </span>
          <span className="text-[11px] font-mono text-[var(--text-dim)]">Static View</span>
        </div>

        <ol className="space-y-4">
          {/* Step 1 */}
          <li className="space-y-1.5">
            <div className="text-[11px] font-sans font-medium text-[var(--accent)]">
              1. You write a prompt
            </div>
            <div className="p-3 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] leading-relaxed">
              My name is Shruti. Write a short thank-you note.
            </div>
          </li>

          {/* Step 2 */}
          <li className="space-y-1.5">
            <div className="text-[11px] font-sans font-medium text-[var(--accent)]">
              2. YapShield finds private data
            </div>
            <div className="p-3 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] leading-relaxed">
              My name is{' '}
              <span className="border-b-2 border-amber-500 text-amber-600 dark:text-amber-200 inline-flex items-baseline gap-1 font-semibold">
                Shruti
                <span className="text-[9px] uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-200 px-1 py-0.2 rounded border border-amber-500/40">
                  person
                </span>
              </span>
              . Write a short thank-you note.
            </div>
          </li>

          {/* Step 3 */}
          <li className="space-y-1.5">
            <div className="text-[11px] font-sans font-medium text-[var(--accent)]">
              3. YapShield replaces it with a token
            </div>
            <div className="p-3 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] leading-relaxed">
              My name is{' '}
              <span className="bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent)]/40 px-1.5 py-0.5 rounded font-semibold text-xs">
                [PERSON_1]
              </span>
              . Write a short thank-you note.
            </div>
            <div className="text-[11px] text-[var(--text-dim)] italic">
              The real name stays inside YapShield
            </div>
          </li>

          {/* Step 4 */}
          <li className="space-y-1.5">
            <div className="text-[11px] font-sans font-medium text-[var(--accent)]">
              4. The AI only sees the token
            </div>
            <div className="p-3 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] leading-relaxed">
              My name is{' '}
              <span className="bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent)]/40 px-1.5 py-0.5 rounded font-semibold text-xs">
                [PERSON_1]
              </span>
              . Write a short thank-you note.
            </div>
          </li>

          {/* Step 5 */}
          <li className="space-y-1.5">
            <div className="text-[11px] font-sans font-medium text-[var(--accent)]">
              5. The AI answers using the token
            </div>
            <div className="p-3 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] leading-relaxed">
              Dear{' '}
              <span className="bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent)]/40 px-1.5 py-0.5 rounded font-semibold text-xs">
                [PERSON_1]
              </span>
              , thank you for your help and support. Warm regards.
            </div>
          </li>

          {/* Step 6 */}
          <li className="space-y-1.5">
            <div className="text-[11px] font-sans font-medium text-[var(--accent)]">
              6. YapShield puts the real value back
            </div>
            <div className="p-3 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] leading-relaxed">
              Dear{' '}
              <span className="border-b-2 border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-950/60 px-1 py-0.5 rounded font-semibold">
                Shruti
              </span>
              , thank you for your help and support. Warm regards.
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 italic">
              The AI never saw your name
            </div>
          </li>
        </ol>
      </div>
    );
  }

  // Calculate packet transforms & opacities (Desktop and Mobile)
  const isConnector1Active =
    packetTransfer === 'you-to-yap' || packetTransfer === 'yap-to-you';
  const isConnector2Active =
    packetTransfer === 'yap-to-ai' || packetTransfer === 'ai-to-yap';

  // Desktop transforms (40px track width: 0px to 32px)
  let conn1TransformDesktop = 'translateX(0px)';
  if (packetTransfer === 'you-to-yap') {
    conn1TransformDesktop = packetMoving ? 'translateX(32px)' : 'translateX(0px)';
  } else if (packetTransfer === 'yap-to-you') {
    conn1TransformDesktop = packetMoving ? 'translateX(0px)' : 'translateX(32px)';
  }

  let conn2TransformDesktop = 'translateX(0px)';
  if (packetTransfer === 'yap-to-ai') {
    conn2TransformDesktop = packetMoving ? 'translateX(32px)' : 'translateX(0px)';
  } else if (packetTransfer === 'ai-to-yap') {
    conn2TransformDesktop = packetMoving ? 'translateX(0px)' : 'translateX(32px)';
  }

  // Mobile transforms (24px track height: 0px to 16px)
  let conn1TransformMobile = 'translateY(0px)';
  if (packetTransfer === 'you-to-yap') {
    conn1TransformMobile = packetMoving ? 'translateY(16px)' : 'translateY(0px)';
  } else if (packetTransfer === 'yap-to-you') {
    conn1TransformMobile = packetMoving ? 'translateY(0px)' : 'translateY(16px)';
  }

  let conn2TransformMobile = 'translateY(0px)';
  if (packetTransfer === 'yap-to-ai') {
    conn2TransformMobile = packetMoving ? 'translateY(16px)' : 'translateY(0px)';
  } else if (packetTransfer === 'ai-to-yap') {
    conn2TransformMobile = packetMoving ? 'translateY(0px)' : 'translateY(16px)';
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 sm:p-6 shadow-sm flex flex-col justify-between transition-colors">
      {/* Visually hidden screen-reader description of the complete story */}
      <div className="sr-only">
        Interactive demonstration of YapShield prompt protection across three actors: You,
        YapShield, and the AI model. Step 1: You write a prompt containing your name
        Shruti. Step 2: YapShield detects the private name. Step 3: YapShield replaces
        the name with token [PERSON_1] while keeping the real name inside its secure
        vault. Step 4: The AI model receives only the tokenized prompt. Step 5: The AI
        model responds using the token. Step 6: YapShield restores the original name into
        the final response before delivering it to you, ensuring the AI model never saw
        your private data.
      </div>

      {/* Actor Boxes Row: You <-> YapShield <-> AI model */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-0">
        {/* ================= Box 1: You ================= */}
        <div className="w-full md:flex-1 h-[142px] bg-[var(--bg)] border border-[var(--border)] rounded p-3 flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
            <span className="font-sans text-xs font-semibold text-[var(--text)]">You</span>
            <span className="font-mono text-[10px] text-[var(--text-dim)]">Client</span>
          </div>
          <div className="font-mono text-xs leading-relaxed overflow-hidden my-auto">
            {step === 0 && (
              <div className="text-[var(--text)]">
                {FULL_PROMPT.slice(0, typedChars)}
                <span
                  className="inline-block w-1.5 h-3.5 ml-0.5 bg-[var(--accent)] animate-pulse align-middle"
                  aria-hidden="true"
                />
              </div>
            )}
            {step >= 1 && step < 5 && (
              <div className="text-[var(--text-dim)]">{FULL_PROMPT}</div>
            )}
            {step === 5 && (
              <div className="transition-opacity duration-300">
                {youHasAnswer ? (
                  <span className="text-[var(--text)] font-medium">
                    Dear Shruti, thank you for your help and support. Warm regards.
                  </span>
                ) : (
                  <span className="text-[var(--text-dim)]">{FULL_PROMPT}</span>
                )}
              </div>
            )}
          </div>
          <div className="text-[10px] font-mono text-[var(--text-dim)] pt-1 border-t border-[var(--border)]/50 flex justify-between">
            <span>Input &amp; final view</span>
            {step === 5 && youHasAnswer && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Answer restored</span>
            )}
          </div>
        </div>

        {/* ================= Connector 1 (Desktop) ================= */}
        <div className="hidden md:flex items-center justify-center w-10 h-px bg-[var(--border)] relative shrink-0 self-center">
          <div
            className="absolute top-1/2 -translate-y-1/2 left-0 w-2 h-2 rounded-full bg-[var(--accent)] pointer-events-none"
            style={{
              transform: conn1TransformDesktop,
              opacity: isConnector1Active ? 1 : 0,
              transition:
                'transform 600ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease-in-out',
              willChange: 'transform, opacity',
            }}
            aria-hidden="true"
          />
        </div>

        {/* ================= Connector 1 (Mobile) ================= */}
        <div className="flex md:hidden items-center justify-center w-px h-6 bg-[var(--border)] relative shrink-0 mx-auto">
          <div
            className="absolute left-1/2 -translate-x-1/2 top-0 w-2 h-2 rounded-full bg-[var(--accent)] pointer-events-none"
            style={{
              transform: conn1TransformMobile,
              opacity: isConnector1Active ? 1 : 0,
              transition:
                'transform 600ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease-in-out',
              willChange: 'transform, opacity',
            }}
            aria-hidden="true"
          />
        </div>

        {/* ================= Box 2: YapShield ================= */}
        <div className="w-full md:flex-1 h-[142px] bg-[var(--bg)] border border-[var(--border)] rounded p-3 flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
            <span className="font-sans text-xs font-semibold text-[var(--accent)]">
              YapShield
            </span>
            <span className="font-mono text-[10px] text-[var(--text-dim)]">Security Proxy</span>
          </div>
          <div className="font-mono text-xs leading-relaxed overflow-hidden my-auto">
            {step === 0 && (
              <span className="text-[var(--text-dim)]/60 italic text-[11px]">
                Waiting for prompt...
              </span>
            )}
            {step === 1 && (
              <div className="text-[var(--text)]">
                My name is{' '}
                <span className="border-b-2 border-amber-500 text-amber-600 dark:text-amber-200 inline-flex items-baseline gap-1 font-semibold">
                  Shruti
                  <span className="text-[9px] uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-200 px-1 py-0.2 rounded border border-amber-500/40 font-mono">
                    person
                  </span>
                </span>
                . Write a short thank-you note.
              </div>
            )}
            {(step === 2 || step === 3) && (
              <div className="text-[var(--text)]">
                My name is{' '}
                <span className="inline-grid grid-cols-1 grid-rows-1 items-baseline align-baseline">
                  <span
                    className="col-start-1 row-start-1 border-b-2 border-amber-500 text-amber-600 dark:text-amber-200 inline-flex items-baseline gap-1 font-semibold transition-opacity duration-400 ease-in-out"
                    style={{ opacity: yapshieldTokenized ? 0 : 1 }}
                  >
                    Shruti
                    <span className="text-[9px] uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-200 px-1 py-0.2 rounded border border-amber-500/40 font-mono">
                      person
                    </span>
                  </span>
                  <span
                    className="col-start-1 row-start-1 bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent)]/40 px-1.5 py-0.5 rounded font-semibold text-[11px] transition-opacity duration-400 ease-in-out"
                    style={{ opacity: yapshieldTokenized ? 1 : 0 }}
                  >
                    [PERSON_1]
                  </span>
                </span>
                . Write a short thank-you note.
              </div>
            )}
            {step === 4 && (
              <div className="text-[var(--text)]">
                Dear{' '}
                <span className="bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent)]/40 px-1.5 py-0.5 rounded font-semibold text-[11px]">
                  [PERSON_1]
                </span>
                , thank you for your help and support. Warm regards.
              </div>
            )}
            {step === 5 && (
              <div className="text-[var(--text)]">
                Dear{' '}
                <span className="inline-grid grid-cols-1 grid-rows-1 items-baseline align-baseline">
                  <span
                    className="col-start-1 row-start-1 bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent)]/40 px-1.5 py-0.5 rounded font-semibold text-[11px] transition-opacity duration-400 ease-in-out"
                    style={{ opacity: yapshieldRestored ? 0 : 1 }}
                  >
                    [PERSON_1]
                  </span>
                  <span
                    className="col-start-1 row-start-1 border-b-2 border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-950/60 px-1 py-0.5 rounded font-semibold transition-opacity duration-400 ease-in-out"
                    style={{ opacity: yapshieldRestored ? 1 : 0 }}
                  >
                    Shruti
                  </span>
                </span>
                , thank you for your help and support. Warm regards.
              </div>
            )}
          </div>
          <div className="text-[10px] font-mono text-[var(--text-dim)] pt-1 border-t border-[var(--border)]/50 flex justify-between">
            <span>AES-256 Vault</span>
            {step >= 2 && step <= 4 && (
              <span className="text-[var(--accent)] font-medium">Token active</span>
            )}
            {step === 5 && yapshieldRestored && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Restored</span>
            )}
          </div>
        </div>

        {/* ================= Connector 2 (Desktop) ================= */}
        <div className="hidden md:flex items-center justify-center w-10 h-px bg-[var(--border)] relative shrink-0 self-center">
          <div
            className="absolute top-1/2 -translate-y-1/2 left-0 w-2 h-2 rounded-full bg-[var(--accent)] pointer-events-none"
            style={{
              transform: conn2TransformDesktop,
              opacity: isConnector2Active ? 1 : 0,
              transition:
                'transform 600ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease-in-out',
              willChange: 'transform, opacity',
            }}
            aria-hidden="true"
          />
        </div>

        {/* ================= Connector 2 (Mobile) ================= */}
        <div className="flex md:hidden items-center justify-center w-px h-6 bg-[var(--border)] relative shrink-0 mx-auto">
          <div
            className="absolute left-1/2 -translate-x-1/2 top-0 w-2 h-2 rounded-full bg-[var(--accent)] pointer-events-none"
            style={{
              transform: conn2TransformMobile,
              opacity: isConnector2Active ? 1 : 0,
              transition:
                'transform 600ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease-in-out',
              willChange: 'transform, opacity',
            }}
            aria-hidden="true"
          />
        </div>

        {/* ================= Box 3: AI model ================= */}
        <div className="w-full md:flex-1 h-[142px] bg-[var(--bg)] border border-[var(--border)] rounded p-3 flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
            <span className="font-sans text-xs font-semibold text-[var(--text)]">
              AI model
            </span>
            <span className="font-mono text-[10px] text-[var(--text-dim)]">LLM</span>
          </div>
          <div className="font-mono text-xs leading-relaxed overflow-hidden my-auto">
            {step < 3 && (
              <span className="text-[var(--text-dim)]/60 italic text-[11px]">Idle</span>
            )}
            {step === 3 && (
              <div>
                <div className="text-[var(--text)]">
                  My name is{' '}
                  <span className="bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent)]/40 px-1.5 py-0.5 rounded font-semibold text-[11px]">
                    [PERSON_1]
                  </span>
                  . Write a short thank-you note.
                </div>
                {aiThinking && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--text-dim)]">
                    <span>Thinking</span>
                    <span className="inline-flex gap-1" aria-hidden="true">
                      <span className="w-1 h-1 rounded-full bg-[var(--accent)] animate-pulse" />
                      <span className="w-1 h-1 rounded-full bg-[var(--accent)] animate-pulse [animation-delay:150ms]" />
                      <span className="w-1 h-1 rounded-full bg-[var(--accent)] animate-pulse [animation-delay:300ms]" />
                    </span>
                  </div>
                )}
              </div>
            )}
            {step === 4 && (
              <div className="text-[var(--text)]">
                Dear{' '}
                <span className="bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent)]/40 px-1.5 py-0.5 rounded font-semibold text-[11px]">
                  [PERSON_1]
                </span>
                , thank you for your help and support. Warm regards.
              </div>
            )}
            {step === 5 && (
              <div className="text-[var(--text-dim)]">
                Dear [PERSON_1], thank you for your help and support. Warm regards.
              </div>
            )}
          </div>
          <div className="text-[10px] font-mono text-[var(--text-dim)] pt-1 border-t border-[var(--border)]/50 flex justify-between">
            <span>Remote Provider</span>
            <span className="text-[var(--text-dim)]">Zero PII Seen</span>
          </div>
        </div>
      </div>

      {/* ================= Bottom Controls & Caption Strip ================= */}
      <div className="pt-4 mt-4 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Caption line announcing each step */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="text-xs sm:text-sm font-sans font-medium text-[var(--text)] min-h-[20px] flex items-center gap-2"
        >
          <span className="text-[var(--accent)] font-mono text-xs">0{step + 1}.</span>
          <span>{STEP_CAPTIONS[step]}</span>
        </div>

        {/* 6 Step Dots + Controls */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Step indicator with 6 dots */}
          <div
            className="flex items-center gap-1.5"
            role="tablist"
            aria-label="Story steps"
          >
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const isActive = step === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Jump to step ${idx + 1}: ${STEP_TITLES[idx]}`}
                  onClick={() => handleJumpToStep(idx)}
                  className={`h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] ${
                    isActive
                      ? 'w-5 bg-[var(--accent)]'
                      : 'w-2 bg-[var(--border)] hover:bg-[var(--text-dim)]'
                  }`}
                />
              );
            })}
          </div>

          <div className="w-px h-3.5 bg-[var(--border)]" aria-hidden="true" />

          {/* Pause / Play Button */}
          <button
            type="button"
            onClick={handleTogglePlayPause}
            aria-label={isPaused ? 'Resume demo animation' : 'Pause demo animation'}
            className="p-1.5 rounded bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-dim)] hover:text-[var(--text)] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? (
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            ) : (
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            )}
          </button>

          {/* Replay Button */}
          <button
            type="button"
            onClick={handleReplay}
            aria-label="Replay demo animation from start"
            className="p-1.5 rounded bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-dim)] hover:text-[var(--text)] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
            title="Replay"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M1 4v6h6" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
