import React from 'react';

export type StatusDotType = 'ok' | 'warn' | 'alert' | 'critical' | 'active' | 'idle';
export type StatusDotSize = 'sm' | 'md' | 'lg';

export interface StatusDotProps {
  /** Operational status type */
  status?: StatusDotType;
  /** Text label displayed next to or representing the dot */
  label?: string;
  /** Whether to show a pulse animation */
  pulse?: boolean;
  /** Dot size variant */
  size?: StatusDotSize;
  /** Additional CSS class names */
  className?: string;
  /** Whether to render the label visibly or only for screen-readers */
  showText?: boolean;
}

const statusConfig: Record<
  StatusDotType,
  { color: string; defaultLabel: string; bgClass: string }
> = {
  ok: {
    color: '#22c55e',
    defaultLabel: 'Operational',
    bgClass: 'bg-emerald-500',
  },
  warn: {
    color: '#fbbf24',
    defaultLabel: 'Warning',
    bgClass: 'bg-amber-400',
  },
  alert: {
    color: '#fb7185',
    defaultLabel: 'Elevated Risk',
    bgClass: 'bg-rose-400',
  },
  critical: {
    color: '#ef4444',
    defaultLabel: 'Critical Threat',
    bgClass: 'bg-red-500',
  },
  active: {
    color: '#22d3ee',
    defaultLabel: 'Active Scan',
    bgClass: 'bg-cyan-400',
  },
  idle: {
    color: '#9aa7b6',
    defaultLabel: 'Standby',
    bgClass: 'bg-slate-400',
  },
};

const sizeClasses: Record<StatusDotSize, { dot: string; text: string }> = {
  sm: { dot: 'w-2 h-2', text: 'text-xs' },
  md: { dot: 'w-2.5 h-2.5', text: 'text-sm' },
  lg: { dot: 'w-3 h-3', text: 'text-base' },
};

export default function StatusDot({
  status = 'ok',
  label,
  pulse = false,
  size = 'md',
  className = '',
  showText = true,
}: StatusDotProps) {
  const config = statusConfig[status] || statusConfig.ok;
  const sizeConfig = sizeClasses[size] || sizeClasses.md;
  const displayLabel = label || config.defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-2 select-none ${className}`}
      role="status"
    >
      <span
        className={`relative inline-block rounded-full flex-shrink-0 ${sizeConfig.dot} ${config.bgClass} ${
          pulse ? 'hud-pulse' : ''
        }`}
        style={{ backgroundColor: config.color }}
        aria-hidden="true"
      />
      {showText ? (
        <span
          className={`font-medium text-[var(--text-dim)] leading-none ${sizeConfig.text}`}
        >
          {displayLabel}
        </span>
      ) : (
        <span className="sr-only">{displayLabel}</span>
      )}
    </span>
  );
}
