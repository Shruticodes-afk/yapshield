import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import PacketInspector from '@/components/PacketInspector';
import LiveStatusBand from '@/components/home/LiveStatusBand';
import Reveal from '@/components/Reveal';

export const metadata: Metadata = {
  title: 'YapShield — Your prompts, minus the private data.',
  description:
    'YapShield checks every prompt before it reaches the AI, replaces personal data and secrets with tokens, and puts the real values back in the answer.',
};

export default function Home() {
  const steps = [
    {
      num: '01',
      title: 'Scan',
      desc: 'YapShield scans your prompt in real time for Indian IDs, contact information, secrets, and injection attacks.',
    },
    {
      num: '02',
      title: 'Protect',
      desc: 'Every detected entity is swapped for a safe token; values are encrypted with AES-256-GCM and stored temporarily in the database vault, deleted after the response.',
    },
    {
      num: '03',
      title: 'Review',
      desc: 'You can review sanitized values, check confidence levels, and customize policy overrides before dispatch.',
    },
    {
      num: '04',
      title: 'Send',
      desc: 'The sanitized prompt reaches the AI provider with placeholder tokens instead of your sensitive data.',
    },
    {
      num: '05',
      title: 'Restore',
      desc: 'Tokens in the returned AI answer are replaced with your original values before displaying the response.',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] pb-20 relative overflow-hidden transition-colors">
      {/* Drifting Grid Background: 60s transform-only loop */}
      <div
        className="absolute inset-[-40px] pointer-events-none grid-bg hud-grid-drift opacity-60"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 space-y-16 sm:space-y-24 relative z-10">
        {/* =========================================================================
            1. HERO SECTION: Two columns on desktop, stacked on mobile
           ========================================================================= */}
        <section
          aria-labelledby="hero-heading"
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
        >
          {/* Left Column: Headline, subtext, primary/secondary buttons */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <h1
              id="hero-heading"
              className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[var(--text)] leading-tight"
            >
              Your prompts, minus the private data.
            </h1>

            <p className="text-base sm:text-lg text-[var(--text-dim)] leading-relaxed max-w-xl">
              YapShield checks every prompt before it reaches the AI, replaces personal data and secrets with tokens, and puts the real values back in the answer.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/playground" className="btn-primary">
                Try the Playground
              </Link>
              <Link href="/dashboard" className="btn-secondary">
                View the dashboard
              </Link>
            </div>
          </div>

          {/* Right Column: Packet Inspection Gate Simulation */}
          <div className="lg:col-span-6">
            <PacketInspector />
          </div>
        </section>

        {/* =========================================================================
            2. LIVE SYSTEM STATUS BAND: Derived from real GET /api/public-stats
           ========================================================================= */}
        <section aria-labelledby="live-status-heading">
          <h2 id="live-status-heading" className="sr-only">
            Live System Status
          </h2>
          <LiveStatusBand />
        </section>

        {/* =========================================================================
            3. HOW IT WORKS: 5 steps revealed as they scroll into view
           ========================================================================= */}
        <section aria-labelledby="how-it-works-heading" className="space-y-6 pt-6 border-t border-[var(--border)]">
          <div className="space-y-1">
            <h2 id="how-it-works-heading" className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--text)]">
              How it works
            </h2>
            <p className="text-sm text-[var(--text-dim)]">
              Five straightforward steps between your prompt and the AI model.
            </p>
          </div>

          <ol className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {steps.map((st, idx) => (
              <li key={st.num}>
                <Reveal delayMs={idx * 80}>
                  <div className="py-4 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6">
                    <span className="font-mono text-sm text-[var(--accent)] font-semibold shrink-0 sm:w-28">
                      {st.num}. {st.title}
                    </span>
                    <p className="text-sm text-[var(--text)] leading-relaxed">
                      {st.desc}
                    </p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        {/* =========================================================================
            4. WHAT IT DETECTS: Two-column list
           ========================================================================= */}
        <section aria-labelledby="what-it-detects-heading" className="space-y-6 pt-6 border-t border-[var(--border)]">
          <div className="space-y-1">
            <h2 id="what-it-detects-heading" className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--text)]">
              What it detects
            </h2>
            <p className="text-sm text-[var(--text-dim)]">
              Built-in detectors calibrated for high precision across sensitive formats.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-[var(--text)]">Indian IDs</h3>
                <p className="text-[var(--text-dim)] leading-relaxed">
                  Aadhaar with checksum, PAN, UPI, IFSC, mobile
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-[var(--text)]">Secrets</h3>
                <p className="text-[var(--text-dim)] leading-relaxed">
                  API keys, tokens, private keys
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-[var(--text)]">Personal data</h3>
                <p className="text-[var(--text-dim)] leading-relaxed">
                  names, emails
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-[var(--text)]">Attacks</h3>
                <p className="text-[var(--text-dim)] leading-relaxed">
                  prompt injection in English and Hinglish
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            5. HONEST NOTE
           ========================================================================= */}
        <section aria-label="Limitation notice" className="pt-6 border-t border-[var(--border)]">
          <p className="text-sm text-[var(--text-dim)] leading-relaxed">
            Detection is rule-based and was evaluated on a synthetic dataset, so results on real prompts may differ.{' '}
            <Link
              href="/playground"
              className="text-[var(--accent)] underline underline-offset-4 hover:text-[var(--text)] transition-colors font-medium"
            >
              Try the Playground
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
