import React from 'react';
import Link from 'next/link';

export default function Home() {
  const steps = [
    {
      num: '01',
      title: 'Scan',
      tagline: 'Deep Entity & Attack Analysis',
      description:
        'Inspects prompts in real-time across heuristic, regex, entropy, and prompt injection detection layers.',
      icon: '🔍',
    },
    {
      num: '02',
      title: 'Protect',
      tagline: 'Reversible Vault Encryption',
      description:
        'Tokenizes sensitive entities with AES-256-GCM ephemeral encryption before values ever leave your boundary.',
      icon: '🛡️',
    },
    {
      num: '03',
      title: 'Review',
      tagline: 'Human-in-the-Loop Oversight',
      description:
        'Interactive preview highlights findings in-place and allows justifiable policy overrides before forwarding.',
      icon: '👁️',
    },
    {
      num: '04',
      title: 'Send',
      tagline: 'Zero-Leak LLM Forwarding',
      description:
        'Transmits clean, tokenized prompts to downstream AI models. Third-party providers never see raw confidential data.',
      icon: '🚀',
    },
    {
      num: '05',
      title: 'Restore',
      tagline: 'Bidirectional Rehydration',
      description:
        'Transparently restores tokenized placeholders in the model response before returning answers to users.',
      icon: '✨',
    },
  ];

  const features = [
    {
      title: 'India-Specific Detectors',
      description:
        'Native validation for Aadhaar (with full Verhoeff checksum algorithm), PAN card numbers, Indian mobile numbers, UPI handles, IFSC codes, and common Indian names.',
      icon: '🇮🇳',
      badge: 'Localized',
    },
    {
      title: 'Reversible Tokenization',
      description:
        'Replaces sensitive entities with type-safe placeholders ([PHONE_1], [EMAIL_1]). Encrypted with AES-256-GCM in an ephemeral vault, then seamlessly restored upon response.',
      icon: '🔐',
      badge: 'Zero-Knowledge',
    },
    {
      title: 'Explainable Risk Score',
      description:
        'Transparent 0–100 severity index computed from confidence-scaled entity detections and prompt injection telemetry with plain-language diagnostic reasons.',
      icon: '📊',
      badge: 'Explainable',
    },
    {
      title: 'Review Before Send',
      description:
        'Dual-pane preview with color-coded offsets shows exact finding locations and allows authorized users to override non-blocking actions with audited justifications.',
      icon: '👁️',
      badge: 'Interactive',
    },
    {
      title: 'Tamper-Evident Audit Log',
      description:
        'Cryptographic SHA-256 hash-chain guaranteeing data integrity from GENESIS. Detects any record mutation, tampering, or deletion in real time.',
      icon: '🔗',
      badge: 'Cryptographic',
    },
    {
      title: 'Built-in Evaluation',
      description:
        'Pre-configured security presets (Student, Developer, Enterprise) enforce fail-closed guardrails with automatic mode adjustments and zero prompt leaks.',
      icon: '⚙️',
      badge: 'Fail-Closed',
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-slate-800/80">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950/0 to-transparent pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 shadow-sm">
            <span>🛡️</span> AI Guardrails & Sensitive Data Gateway
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Yap<span className="text-emerald-400">Shield</span>
            </h1>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-200">
              Think freely, share safely
            </p>
            <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
              Production-grade guardrails for AI applications. Real-time sensitive entity detection,
              prompt injection defense, and reversible vault tokenization built for strict data sovereignty.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center items-center gap-4 pt-2">
            <Link
              href="/playground"
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-950/50 hover:shadow-emerald-900/50 transition flex items-center gap-2"
            >
              <span>🚀</span> Try the Playground
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 font-semibold text-sm shadow-md transition flex items-center gap-2"
            >
              <span>📊</span> View Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* 2. "How it works" Flow Section */}
      <section className="py-20 border-b border-slate-800/80 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Architecture & Lifecycle
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              How It Works
            </h3>
            <p className="text-sm text-slate-400">
              A 5-stage secure proxy pipeline inspecting, sanitizing, and restoring prompt data transparently.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {steps.map((step, idx) => (
              <div
                key={step.num}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition group relative"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{step.icon}</span>
                    <span className="text-xs font-mono font-bold text-slate-500 group-hover:text-emerald-400 transition">
                      {step.num}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-1.5">
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
                  <div className="hidden md:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 text-slate-600 text-xs">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Features Grid Section */}
      <section className="py-20 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Enterprise Capabilities
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Comprehensive Guardrail Architecture
            </h3>
            <p className="text-sm text-slate-400">
              Engineered with specialized support for Indian regulatory requirements and modern LLM security.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat) => (
              <div
                key={feat.title}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4 transition hover:bg-slate-900/90"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{feat.icon}</span>
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

      {/* 4. Bottom Call to Action */}
      <section className="py-16 border-t border-slate-800/80 bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Ready to secure your generative AI prompts?
          </h3>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Evaluate policy presets, test adversarial jailbreak injection strings, and inspect cryptographic audit chains.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4 pt-2">
            <Link
              href="/playground"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md transition"
            >
              Try the Playground →
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm transition"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 bg-slate-950 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">YapShield</span>
            <span>•</span>
            <span>Think freely, share safely</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <Link href="/playground" className="hover:text-white transition">
              Playground
            </Link>
            <Link href="/dashboard" className="hover:text-white transition">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
