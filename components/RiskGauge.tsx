'use client';

import React, { useState, useEffect } from 'react';

export type RiskSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface RiskGaugeProps {
  /** Risk score between 0 and 100 */
  score: number;
  /** Size in pixels (width and height), default is 150 */
  size?: number;
  /** Width of the gauge arc strokes, default is 9 */
  strokeWidth?: number;
  /** Optional custom class name */
  className?: string;
  /** Optional custom label override */
  label?: string;
  /** Whether to show the severity label in the middle, default true */
  showLabel?: boolean;
}

export function getRiskSeverity(score: number): {
  label: RiskSeverity;
  color: string;
  varName: string;
} {
  const numeric = typeof score === 'number' && !Number.isNaN(score) ? score : 0;
  const s = Math.max(0, Math.min(100, Math.round(numeric)));
  if (s < 30) {
    return { label: 'Low', color: '#22c55e', varName: 'var(--ok)' };
  }
  if (s < 60) {
    return { label: 'Medium', color: '#fbbf24', varName: 'var(--warn)' };
  }
  if (s < 80) {
    return { label: 'High', color: '#fb7185', varName: 'var(--alert)' };
  }
  return { label: 'Critical', color: '#ef4444', varName: 'var(--critical)' };
}

export default function RiskGauge({
  score,
  size = 150,
  strokeWidth = 9,
  className = '',
  label,
  showLabel = true,
}: RiskGaugeProps) {
  const numericScore = typeof score === 'number' && !Number.isNaN(score) ? score : 0;
  const clampedScore = Math.max(0, Math.min(100, Math.round(numericScore)));
  const severity = getRiskSeverity(clampedScore);
  const displayLabel = label || severity.label;

  // Track mount state for one-time stroke-dashoffset transition
  const [mounted, setMounted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check user reduced motion preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
    }
    // Animate once on mount
    const timer = setTimeout(() => {
      setMounted(true);
    }, 40);

    return () => clearTimeout(timer);
  }, []);

  // Arc geometry calculations (240 degree open arc)
  const center = size / 2;
  const radius = Math.max(10, (size - strokeWidth * 2) / 2);
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * (240 / 360);
  const targetOffset = arcLength * (1 - clampedScore / 100);

  // If not mounted yet and motion is allowed, start from 0 progress (offset = arcLength)
  const currentOffset = mounted || prefersReducedMotion ? targetOffset : arcLength;

  const ariaLabel = `Risk score ${clampedScore} out of 100, ${displayLabel}`;

  return (
    <div
      className={`inline-flex flex-col items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={ariaLabel}
        className="overflow-visible"
      >
        {/* Decorative ambient radial glow in background */}
        <defs>
          <filter id={`hud-gauge-glow-${clampedScore}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer subtle tick marks / border ring */}
        <circle
          cx={center}
          cy={center}
          r={radius + strokeWidth * 0.85}
          fill="none"
          stroke="rgba(64, 224, 208, 0.14)"
          strokeWidth="1"
          strokeDasharray="2 6"
          className="opacity-60"
        />

        {/* Gauge Track (240 degree arc rotated starting at 150 deg) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(10, 28, 44, 0.9)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(150 ${center} ${center})`}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(64, 224, 208, 0.16)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(150 ${center} ${center})`}
        />

        {/* Foreground Colored Active Arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={severity.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={currentOffset}
          strokeLinecap="round"
          transform={`rotate(150 ${center} ${center})`}
          filter={`url(#hud-gauge-glow-${clampedScore})`}
          style={{
            transition: prefersReducedMotion
              ? 'none'
              : 'stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />

        {/* Central Display: Score Number */}
        <text
          x={center}
          y={center - size * 0.04}
          textAnchor="middle"
          dominantBaseline="central"
          className="hud-stat"
          style={{
            fill: 'var(--text)',
            fontSize: `${Math.round(size * 0.24)}px`,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontWeight: 700,
          }}
        >
          {clampedScore}
        </text>

        {/* Central Display: Severity Text Label */}
        {showLabel && (
          <text
            x={center}
            y={center + size * 0.18}
            textAnchor="middle"
            dominantBaseline="central"
            className="hud-label"
            style={{
              fill: severity.color,
              fontSize: `${Math.max(9, Math.round(size * 0.08))}px`,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontWeight: 600,
              letterSpacing: '0.14em',
            }}
          >
            {displayLabel.toUpperCase()}
          </text>
        )}
      </svg>
    </div>
  );
}
