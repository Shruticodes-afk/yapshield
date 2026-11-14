import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg)] text-[var(--text-dim)] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Row: Brand & Quick Links */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-sm">
            <Link
              href="/"
              className="text-sm font-semibold text-[var(--text)] hover:text-[var(--accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
            >
              YapShield
            </Link>
            <p className="text-xs text-[var(--text-dim)] leading-relaxed">
              Privacy and safety gateway for generative AI applications with reversible AES-256-GCM tokenization.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <Link
              href="/"
              className="text-[var(--text-dim)] hover:text-[var(--text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
            >
              Home
            </Link>
            <Link
              href="/playground"
              className="text-[var(--text-dim)] hover:text-[var(--text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
            >
              Playground
            </Link>
            <Link
              href="/dashboard"
              className="text-[var(--text-dim)] hover:text-[var(--text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Origin Mini 2026 and Team Cooked Credits */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-dim)] pt-4 border-t border-[var(--border)]">
          <div className="flex flex-wrap items-center gap-2 text-center sm:text-left">
            <span className="text-[var(--text)] font-medium">Team Cooked, ORIGIN MINI 2026</span>
            <span className="text-[var(--border)] hidden sm:inline">•</span>
            <span>Problem Statement 5</span>
          </div>

          <div className="text-[var(--text-dim)] text-center sm:text-right text-xs">
            <span>Rule-based detection, tested on a synthetic dataset</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
