import React from 'react';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-slate-800 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="text-emerald-400">📊</span> YapShield Security Dashboard
            </h1>
            <p className="text-slate-400 mt-1">
              Live audit metrics, security telemetry, and detector activity.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            System Live
          </span>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Requests</div>
            <div className="mt-2 text-2xl font-bold text-white">1,248</div>
            <div className="text-xs text-slate-500 mt-1">Past 24 hours</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Blocked Threats</div>
            <div className="mt-2 text-2xl font-bold text-rose-400">42</div>
            <div className="text-xs text-rose-500/80 mt-1">3.3% threat rate</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">PII Redacted</div>
            <div className="mt-2 text-2xl font-bold text-amber-400">118</div>
            <div className="text-xs text-slate-500 mt-1">Vault protected</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Average Latency</div>
            <div className="mt-2 text-2xl font-bold text-emerald-400">18ms</div>
            <div className="text-xs text-emerald-500/80 mt-1">Sub-second gate</div>
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Recent Audit Logs</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="text-xs text-slate-500 uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-xs">
                <tr>
                  <td className="py-2.5 px-3">Just now</td>
                  <td className="py-2.5 px-3 text-slate-300">Prompt Injection Attempt</td>
                  <td className="py-2.5 px-3"><span className="text-rose-400 font-sans font-semibold">Blocked</span></td>
                  <td className="py-2.5 px-3 text-slate-500">Gateway rejected</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3">2 mins ago</td>
                  <td className="py-2.5 px-3 text-slate-300">PII Detection</td>
                  <td className="py-2.5 px-3"><span className="text-amber-400 font-sans font-semibold">Sanitized</span></td>
                  <td className="py-2.5 px-3 text-slate-500">Tokenized in Vault</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3">5 mins ago</td>
                  <td className="py-2.5 px-3 text-slate-300">Standard Inference Request</td>
                  <td className="py-2.5 px-3"><span className="text-emerald-400 font-sans font-semibold">Passed</span></td>
                  <td className="py-2.5 px-3 text-slate-500">Allowed</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
