import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-8">
      <div className="max-w-3xl text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
          <span>🛡️</span> AI Guardrails & LLM Security Gateway
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white">
          Yap<span className="text-emerald-400">Shield</span>
        </h1>

        <p className="text-lg text-slate-400 max-w-xl mx-auto">
          Production-grade guardrails for AI applications. Real-time prompt injection detection,
          sensitive data tokenization in the vault, and comprehensive audit logs powered by Supabase.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/playground"
            className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-900/20 transition"
          >
            Open Playground →
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-medium transition"
          >
            Security Dashboard
          </Link>
          <Link
            href="/api/gateway"
            className="px-6 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-medium font-mono text-sm flex items-center transition"
          >
            /api/gateway
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-left pt-8 border-t border-slate-800 text-xs">
          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
            <span className="text-emerald-400 font-bold block mb-1">/lib/detectors</span>
            Heuristics & AI injection scanners
          </div>
          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
            <span className="text-emerald-400 font-bold block mb-1">/lib/policy</span>
            Configurable guardrail rules
          </div>
          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
            <span className="text-emerald-400 font-bold block mb-1">/lib/vault</span>
            PII tokenization & secrets
          </div>
          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
            <span className="text-emerald-400 font-bold block mb-1">/lib/audit</span>
            Supabase security logging
          </div>
        </div>
      </div>
    </main>
  );
}
