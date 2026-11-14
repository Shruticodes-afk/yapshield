import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'YapShield | Think freely, share safely',
  description:
    'Privacy and safety gateway for generative AI applications. Real-time Indian PII scanning, secrets detection, prompt injection scoring, and reversible AES-256-GCM tokenization.',
};

export default function Home() {
  const steps = [
    {
      num: '01',
      title: 'Scan',
      tagline: 'Deep Entity & Attack Analysis',
      description:
        'Inspects prompts in real time for Indian PII, credentials, high-entropy secrets, and adversarial prompt injections.',
    },
    {
      num: '02',
      title: 'Protect',
      tagline: 'Reversible Vault Encryption',
      description:
        'Replaces private values with typed placeholders and stores them securely in an ephemeral AES-256-GCM vault.',
    },
    {
      num: '03',
      title: 'Review',
      tagline: 'Explainable Policy Decision',
      description:
        'Computes a 0–100 risk score and policy action (Allow, Sanitize, Review, or Block) with plain-language diagnostic reasons.',
    },
    {
      num: '04',
      title: 'Send',
      tagline: 'Zero-Leak Model Forwarding',
      description:
        'Transmits the sanitized prompt to the AI model. Third-party providers never receive raw confidential data.',
    },
    {
      num: '05',
      title: 'Restore',
      tagline: 'Bidirectional Rehydration',
      description:
        'Transparently maps placeholders back to their original values in the model response before returning it to the user.',
    },
  ];

  const features = [
    {
      title: 'India-Specific Detectors',
      description:
        'Native verification for Aadhaar (with full Verhoeff checksum algorithm), PAN card numbers, Indian mobile numbers, UPI handles, IFSC codes, and common Indian names.',
      badge: 'Localized',
    },
    {
      title: 'Reversible Tokenization',
      description:
        'Substitutes sensitive data with type-safe placeholders like [PHONE_1] and [PAN_1]. Keys are encrypted with AES-256-GCM in an ephemeral vault and restored on reply.',
      badge: 'Zero-Knowledge',
    },
    {
      title: 'Prompt Injection Defense',
      description:
        'Multi-pattern detection scoring covering jailbreak attempts, role hijacks, system prompt extraction, developer-mode triggers, and Hinglish overrides.',
      badge: 'Multi-Vector',
    },
    {
      title: 'Policy Presets',
      description:
        'Select from Student, Developer, or Enterprise presets to balance privacy guardrails with model utility across strict, balanced, or lenient modes.',
      badge: 'Customizable',
    },
    {
      title: 'Explainable Risk Scores',
      description:
        'Transparent 0–100 risk severity score computed from confidence-scaled entity detections with plain-language diagnostic reasons for every decision.',
      badge: 'Transparent',
    },
    {
      title: 'Tamper-Evident Audit Log',
      description:
        'Cryptographic SHA-256 hash chain guaranteeing record integrity from genesis. Detects any row alteration, tampering, or deletion immediately.',
      badge: 'SHA-256 Chain',
    },
  ];

  return (
    <div className="bg-slate-950 text-slate-100 flex flex-col">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 shadow-sm">
            <svg
              className="w-4 h-4 text-emerald-400"
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
            <span>Privacy & Safety Gateway for Generative AI</span>
          </div>

          {/* Heading & Tagline */}
          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Yap<span className="text-emerald-400">Shield</span>
            </h1>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-200">
              Think freely, share safely
            </p>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
              YapShield is a privacy and safety gateway that scans prompts for sensitive entities and injection attacks, reversibly tokenizes private data, and restores answers transparently.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center items-center gap-4 pt-2">
            <Link
              href="/playground"
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-950/50 hover:shadow-emerald-900/50 transition-colors flex items-center gap-2"
            >
              <span>Try the Playground</span>
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 font-semibold text-sm shadow-md transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 text-emerald-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
              <span>View Dashboard</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Before and After Example Block */}
      <section className="py-20 border-b border-slate-800/80 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Zero-Leak Sanitization
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Before and After YapShield
            </h3>
            <p className="text-sm text-slate-400">
              Sensitive identifiers are detected, replaced with typed tokens, and held in an ephemeral vault before prompt delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Before Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                      Before (Original Prompt)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    Raw User Input
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs leading-relaxed text-slate-300">
                  <p>
                    &ldquo;Can you draft an invoice for client{' '}
                    <mark className="bg-rose-950/80 text-rose-300 border border-rose-800/80 px-1 py-0.5 rounded font-semibold">
                      Rajesh Kumar
                    </mark>{' '}
                    at TechCorp India? His PAN is{' '}
                    <mark className="bg-rose-950/80 text-rose-300 border border-rose-800/80 px-1 py-0.5 rounded font-semibold">
                      ABCDE1234F
                    </mark>
                    , Aadhaar number is{' '}
                    <mark className="bg-rose-950/80 text-rose-300 border border-rose-800/80 px-1 py-0.5 rounded font-semibold">
                      9999 0000 1234
                    </mark>
                    , and phone is{' '}
                    <mark className="bg-rose-950/80 text-rose-300 border border-rose-800/80 px-1 py-0.5 rounded font-semibold">
                      +91 98765 43210
                    </mark>
                    . Send settlement to{' '}
                    <mark className="bg-rose-950/80 text-rose-300 border border-rose-800/80 px-1 py-0.5 rounded font-semibold">
                      rajesh@okaxis
                    </mark>{' '}
                    via IFSC{' '}
                    <mark className="bg-rose-950/80 text-rose-300 border border-rose-800/80 px-1 py-0.5 rounded font-semibold">
                      SBIN0001234
                    </mark>
                    . Please keep this private.&rdquo;
                  </p>
                </div>
              </div>

              {/* Detected Entities List */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                  Detections: 6 sensitive entities identified
                </span>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-rose-950/50 text-rose-400 border border-rose-900/60">
                    Person: Rajesh Kumar
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-950/50 text-rose-400 border border-rose-900/60">
                    PAN: ABCDE1234F
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-950/50 text-rose-400 border border-rose-900/60">
                    Aadhaar (Verhoeff)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-950/50 text-rose-400 border border-rose-900/60">
                    Phone: Indian Mobile
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-950/50 text-rose-400 border border-rose-900/60">
                    UPI: rajesh@okaxis
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-950/50 text-rose-400 border border-rose-900/60">
                    IFSC: SBIN0001234
                  </span>
                </div>
              </div>
            </div>

            {/* After Card */}
            <div className="bg-slate-900 border border-emerald-900/60 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      After (What the AI Receives)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800/80">
                    Vault Tokenized
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs leading-relaxed text-slate-300">
                  <p>
                    &ldquo;Can you draft an invoice for client{' '}
                    <mark className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 px-1 py-0.5 rounded font-semibold">
                      [NAME_1]
                    </mark>{' '}
                    at TechCorp India? His PAN is{' '}
                    <mark className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 px-1 py-0.5 rounded font-semibold">
                      [PAN_1]
                    </mark>
                    , Aadhaar number is{' '}
                    <mark className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 px-1 py-0.5 rounded font-semibold">
                      [AADHAAR_1]
                    </mark>
                    , and phone is{' '}
                    <mark className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 px-1 py-0.5 rounded font-semibold">
                      [PHONE_1]
                    </mark>
                    . Send settlement to{' '}
                    <mark className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 px-1 py-0.5 rounded font-semibold">
                      [UPI_1]
                    </mark>{' '}
                    via IFSC{' '}
                    <mark className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 px-1 py-0.5 rounded font-semibold">
                      [IFSC_1]
                    </mark>
                    . Please keep this private.&rdquo;
                  </p>
                </div>
              </div>

              {/* Protection Guarantee Note */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2 text-xs text-emerald-300/90">
                  <svg
                    className="w-4 h-4 text-emerald-400 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>
                    Zero raw secrets or Indian PII leak to the AI. Responses automatically restore original values.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How It Works Strip (Scan, Protect, Review, Send, Restore) */}
      <section className="py-20 border-b border-slate-800/80 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Pipeline Flow
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              How It Works
            </h3>
            <p className="text-sm text-slate-400">
              Five automated stages guarding prompts from inspection through model transmission and answer rehydration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {steps.map((step, idx) => (
              <div
                key={step.num}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-colors group relative"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                      Step {step.num}
                    </span>
                    <span className="text-slate-500 group-hover:text-emerald-400 text-xs font-semibold">
                      Stage {idx + 1}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white tracking-tight">
                      {step.title}
                    </h4>
                    <p className="text-[11px] font-medium text-emerald-400/90 mt-0.5">
                      {step.tagline}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {idx < steps.length - 1 && (
                  <div
                    className="hidden md:flex items-center justify-center absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs"
                    aria-hidden="true"
                  >
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Features Grid with Short Plain-Language Titles */}
      <section className="py-20 border-b border-slate-800/80 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Core Capabilities
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Security Features
            </h3>
            <p className="text-sm text-slate-400">
              Built specifically for privacy-first AI deployments and regulatory compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat) => (
              <div
                key={feat.title}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-slate-950 text-slate-400 border border-slate-800">
                      {feat.badge}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white tracking-tight">
                    {feat.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Honest Note on Limits */}
      <section className="py-12 bg-slate-950 border-b border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 sm:p-6 shadow-lg flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-800/60 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5">
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="space-y-1.5 text-xs text-amber-200/90 leading-relaxed">
              <h5 className="font-semibold text-amber-300 text-sm">
                System Boundary & Limitations
              </h5>
              <p>
                <strong>Rule-based detection, tested on a synthetic dataset.</strong> While deterministic regex patterns, entropy thresholds, and mathematical checksums (such as Verhoeff for Aadhaar) eliminate accidental data leakage without network latency, novel adversarial prompt injections and edge-case obfuscations can emerge. High-consequence environments should maintain human-in-the-loop review.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Call to Action */}
      <section className="py-16 bg-slate-900/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Ready to secure your generative AI prompts?
          </h3>
          <p className="text-sm text-slate-300 max-w-xl mx-auto">
            Test custom policies, simulate injection jailbreaks, and inspect cryptographic audit chains in the interactive playground.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4 pt-2">
            <Link
              href="/playground"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md transition-colors flex items-center gap-2"
            >
              <span>Try the Playground</span>
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm transition-colors"
            >
              View Dashboard
            </Link>
            <Link
              href="/case-study"
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-[#ff2d4a]/40 hover:border-[#ff2d4a] text-white font-semibold text-sm transition-colors flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-[#ff2d4a]" />
              <span>Cybersecurity UI Case Study</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
