import type { Metadata } from 'next';
import Link from 'next/link';
import HudPanel from '@/components/HudPanel';

export const metadata: Metadata = {
  title: '404 - Page Not Found',
  description: 'The requested route could not be found. Return to YapShield home or playground.',
};

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 min-h-[60vh] bg-[var(--bg)] text-[var(--text)] transition-colors">
      <div className="max-w-md w-full">
        <HudPanel title="Error 404" tag="ROUTING_FAULT" status="alert" statusLabel="Not Found">
          <div className="text-center space-y-6 py-4">
            {/* Inline SVG HUD Shield Icon */}
            <div className="mx-auto w-14 h-14 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
              <svg
                className="w-7 h-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-[var(--text)] tracking-tight">
                Page Not Found
              </h1>
              <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                The security guardrail route you requested does not exist or has been relocated.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/"
                className="btn-primary w-full sm:w-auto h-9 px-4 text-xs font-semibold"
              >
                Return Home
              </Link>
              <Link
                href="/playground"
                className="btn-secondary w-full sm:w-auto h-9 px-4 text-xs font-medium"
              >
                Open Playground
              </Link>
            </div>
          </div>
        </HudPanel>
      </div>
    </div>
  );
}
