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
  /** Position of severity text label: 'inside' (default) or 'below' the ring */
  labelPosition?: 'inside' | 'below';
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
  labelPosition = 'inside',
}: RiskGaugeProps) {
  const numericScore = typeof score === 'number' && !Number.isNaN(score) ? score : 0;
  const clampedScore = Math.max(0, Math.min(100, Math.round(numericScore)));
  const severity = getRiskSeverity(clampedScore);
  const displayLabel = label || severity.label;

  // Track mount state for one-time stroke-dashoffset transition
  const [mounted, setMounted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const center = size / 2;
  const radius = center - strokeWidth - 4;
  const circumference = 2 * Math.PI * radius;
  // 240 degree radial arc
  const arcLength = (240 / 360) * circumference;

  const targetOffset = arcLength - (clampedScore / 100) * arcLength;
  const currentOffset = mounted || prefersReducedMotion ? targetOffset : arcLength;

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center select-none ${className}`}
      style={labelPosition === 'below' ? { width: size } : { width: size, height: size }}
      role="img"
      aria-label={`Risk score ${clampedScore} out of 100, ${displayLabel}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        {/* Arc Elements */}
        <g transform={`rotate(-90 ${center} ${center})`}>
          {/* Track Base Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--surface-2, #171d26)"
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
            stroke="var(--border, #243040)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(150 ${center} ${center})`}
            opacity="0.6"
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
            style={{
              transition: prefersReducedMotion
                ? 'none'
                : 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </g>

        {/* Central Display: Score Number */}
        <text
          x={center}
          y={showLabel && labelPosition === 'inside' ? center - size * 0.04 : center}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fill: 'var(--text, #e8edf3)',
            fontSize: `${Math.round(size * 0.24)}px`,
            fontFamily: 'var(--font-mono), monospace',
            fontWeight: 600,
          }}
        >
          {clampedScore}
        </text>

        {/* Central Display: Severity Text Label (when inside) */}
        {showLabel && labelPosition === 'inside' && (
          <text
            x={center}
            y={center + size * 0.2}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fill: severity.color,
              fontSize: `${Math.max(10, Math.round(size * 0.09))}px`,
              fontFamily: 'var(--font-sans), sans-serif',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            {displayLabel.toUpperCase()}
          </text>
        )}
      </svg>

      {/* External Severity Text Label (when below) */}
      {showLabel && labelPosition === 'below' && (
        <span
          className="mt-1 font-sans font-semibold tracking-wider uppercase select-none leading-none"
          style={{
            color: severity.color,
            fontSize: `${Math.max(10, Math.round(size * 0.11))}px`,
          }}
        >
          {displayLabel.toUpperCase()}
        </span>
      )}
    </div>
  );
}
