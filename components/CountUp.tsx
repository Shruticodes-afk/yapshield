'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface CountUpProps {
  /** Target value to animate to */
  value?: number;
  /** Optional alias for value */
  end?: number;
  /** Duration of animation in ms, default 800 */
  duration?: number;
  /** Optional CSS class name */
  className?: string;
  /** Optional prefix (e.g. '$' or 'N=') */
  prefix?: string;
  /** Optional suffix (e.g. '%' or '/100') */
  suffix?: string;
  /** Optional custom formatter */
  formatter?: (val: number) => string;
}

export default function CountUp({
  value,
  end,
  duration = 800,
  className = '',
  prefix = '',
  suffix = '',
  formatter,
}: CountUpProps) {
  const targetValue = typeof value === 'number' ? value : (typeof end === 'number' ? end : 0);
  const [displayValue, setDisplayValue] = useState<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Under prefers-reduced-motion, show the final value instantly
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.matches) {
        setDisplayValue(targetValue);
        return;
      }
    }

    startTimeRef.current = null;
    const startVal = 0;
    const endVal = typeof targetValue === 'number' && !Number.isNaN(targetValue) ? targetValue : 0;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(1, elapsed / duration);

      // Ease-out cubic curve: 1 - (1 - t)^3
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * easedProgress);

      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endVal);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [targetValue, duration]);

  const formatted = formatter
    ? formatter(displayValue)
    : displayValue.toLocaleString();

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
