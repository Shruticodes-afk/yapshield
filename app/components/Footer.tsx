import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800/80">
          {/* Logo & Tagline */}
          <div className="space-y-2 max-w-sm">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-white hover:text-emerald-300 transition-colors"
            >
              <svg
                className="w-5 h-5 text-emerald-400 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span>
                Yap<span className="text-emerald-400">Shield</span>
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Think freely, share safely. Privacy and safety gateway for generative AI applications with reversible AES-256-GCM tokenization.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <Link
              href="/"
              className="text-slate-300 hover:text-emerald-400 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/playground"
              className="text-slate-300 hover:text-emerald-400 transition-colors"
            >
              Playground
            </Link>
            <Link
              href="/dashboard"
              className="text-slate-300 hover:text-emerald-400 transition-colors"
            >
              Audit Dashboard
            </Link>
          </div>
        </div>

        {/* Origin Mini 2026 and Team Cooked Credits */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-2 text-center sm:text-left">
            <span>Built by <strong className="text-slate-200 font-semibold">Team Cooked</strong></span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-medium">
              ORIGIN MINI 2026
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-400">Problem Statement 5</span>
          </div>

          <div className="text-slate-400 text-center sm:text-right text-[11px]">
            <span>Rule-based detection, tested on a synthetic dataset</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
