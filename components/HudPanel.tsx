import React from 'react';
import StatusDot, { StatusDotType } from './StatusDot';

export interface HudPanelProps {
  /** Main panel content */
  children?: React.ReactNode;
  /** Panel title */
  title?: string;
  /** Label or category */
  tag?: string;
  /** Whether to show small corner tick marks, default true */
  brackets?: boolean;
  /** Operational status indicator in the header */
  status?: StatusDotType;
  /** Status indicator label */
  statusLabel?: string;
  /** Right-aligned custom header action or controls */
  headerAction?: React.ReactNode;
  /** Additional CSS class names for the outer wrapper */
  className?: string;
  /** Additional CSS class names for the content area */
  contentClassName?: string;
  /** HTML tag for the container element, default 'div' */
  as?: React.ElementType;
}

export default function HudPanel({
  children,
  title,
  tag,
  brackets = true,
  status,
  statusLabel,
  headerAction,
  className = '',
  contentClassName = 'p-4 sm:p-5',
  as: Component = 'div',
}: HudPanelProps) {
  const hasHeader = Boolean(title || tag || status || headerAction);

  return (
    <Component
      className={`hud-panel ${brackets ? 'has-brackets' : 'no-brackets'} ${className}`}
    >
      {/* Header Bar */}
      {hasHeader && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5 sm:py-3 border-b border-[var(--border)] bg-[var(--surface-2)] rounded-t-[7px]">
          <div className="flex items-center gap-2.5 min-w-0">
            {tag && (
              <span className="text-xs text-[var(--text-dim)] font-mono font-medium">
                {tag}
              </span>
            )}
            {tag && title && (
              <span className="text-[var(--border)] select-none">•</span>
            )}
            {title && (
              <h4 className="text-sm font-semibold tracking-normal text-[var(--text)] truncate">
                {title}
              </h4>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {status && (
              <StatusDot
                status={status}
                label={statusLabel}
                size="sm"
                pulse={status === 'alert' || status === 'critical'}
              />
            )}
            {headerAction}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`relative ${contentClassName}`}>
        {children}
      </div>
    </Component>
  );
}
