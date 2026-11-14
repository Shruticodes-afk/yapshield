import React from 'react';

export type StatusDotType = 'ok' | 'warn' | 'alert' | 'critical' | 'active' | 'idle';
export type StatusDotSize = 'sm' | 'md' | 'lg';

export interface StatusDotProps {
  /** Operational status type */
  status?: StatusDotType;
  /** Text label displayed next to or representing the dot */
  label?: string;
  /** Whether to show a subtle decorative breathing pulse */
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
  { color: string; glow: string; defaultLabel: string; bgClass: string }
> = {
  ok: {
    color: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.45)',
    defaultLabel: 'Operational',
    bgClass: 'bg-emerald-500',
  },
  warn: {
    color: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.45)',
    defaultLabel: 'Warning',
    bgClass: 'bg-amber-400',
  },
  alert: {
    color: '#fb7185',
    glow: 'rgba(251, 113, 133, 0.45)',
    defaultLabel: 'Elevated Risk',
    bgClass: 'bg-rose-400',
  },
  critical: {
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.55)',
    defaultLabel: 'Critical Threat',
    bgClass: 'bg-red-500',
  },
  active: {
    color: '#2dd4bf',
    glow: 'rgba(45, 212, 191, 0.45)',
    defaultLabel: 'Active Scan',
    bgClass: 'bg-teal-400',
  },
  idle: {
    color: '#9bb3bf',
    glow: 'rgba(155, 179, 191, 0.25)',
    defaultLabel: 'Standby',
    bgClass: 'bg-slate-400',
  },
};

const sizeConfig: Record<StatusDotSize, { dot: string; ring: string }> = {
  sm: { dot: 'w-1.5 h-1.5', ring: 'w-2.5 h-2.5' },
  md: { dot: 'w-2 h-2', ring: 'w-3.5 h-3.5' },
  lg: { dot: 'w-2.5 h-2.5', ring: 'w-4 h-4' },
};

export default function StatusDot({
  status = 'active',
  label,
  pulse = false,
  size = 'md',
  className = '',
  showText = true,
}: StatusDotProps) {
  const cfg = statusConfig[status] || statusConfig.active;
  const sz = sizeConfig[size] || sizeConfig.md;
  const displayLabel = label || cfg.defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-2 select-none align-middle ${className}`}
      role="status"
    >
      {/* Visual Dot with subtle concentric outer halo */}
      <span
        className={`relative inline-flex items-center justify-center ${sz.ring} ${
          pulse ? 'hud-pulse' : ''
        }`}
        aria-hidden="true"
      >
        {/* Outer subtle halo ring */}
        <span
          className="absolute inset-0 rounded-full opacity-35"
          style={{ backgroundColor: cfg.color }}
        />
        {/* Inner solid core dot */}
        <span
          className={`relative rounded-full ${sz.dot} shadow-sm`}
          style={{
            backgroundColor: cfg.color,
            boxShadow: `0 0 8px ${cfg.glow}`,
          }}
        />
      </span>

      {/* Accessible label text (visible or screen reader only) */}
      {showText ? (
        <span className="hud-label text-slate-300 font-medium tracking-wider">
          {displayLabel}
        </span>
      ) : (
        <span className="sr-only">{displayLabel}</span>
      )}
    </span>
  );
}
