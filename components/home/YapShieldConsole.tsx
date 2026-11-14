'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import HudPanel from '@/components/HudPanel';
import RiskGauge from '@/components/RiskGauge';
import StatusDot from '@/components/StatusDot';
import type { PublicStatsResponse } from '@/lib/publicStats';
import type { EvaluationData } from '@/lib/evaluation';

interface YapShieldConsoleProps {
  evaluationData: EvaluationData | null;
}

export default function YapShieldConsole({ evaluationData }: YapShieldConsoleProps) {
  const [stats, setStats] = useState<PublicStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchStats() {
      try {
        setLoading(true);
        const res = await fetch('/api/public-stats');
        if (!res.ok) {
          throw new Error(`Failed to fetch stats: HTTP ${res.status}`);
        }
        const data = (await res.json()) as PublicStatsResponse;
        if (isMounted) {
          setStats(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load telemetry');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchStats();
    // Poll every 30 seconds for live telemetry updates
    const interval = setInterval(fetchStats, 30_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const isStatsAvailable = Boolean(stats && stats.available !== false && !error);
  const totalScans = stats?.totalScans ?? 0;
  const blockedCount = stats?.blockedCount ?? 0;
  const blockedPercent = stats?.blockedPercent ?? 0;
  const injectionCount = stats?.injectionCount ?? 0;
  const averageRisk = stats?.averageRisk ?? 0;
  const chain = stats?.chain;

  return (
    <div className="space-y-12">
      {/* =========================================================================
          1. MASTER HUD PANEL
         ========================================================================= */}
      <HudPanel
        tag="TELEMETRY"
        title="Audit Ledger & Telemetry"
        status={loading ? 'active' : isStatsAvailable ? 'ok' : 'alert'}
        statusLabel={
          loading
            ? 'Polling Telemetry...'
            : isStatsAvailable
            ? 'Live Telemetry Synchronized'
            : 'Live stats unavailable'
        }
        headerAction={
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block font-mono text-[10px] text-[var(--text-dim)] uppercase tracking-wider">
              AUTO-REFRESH: 30S
            </span>
            <Link
              href="/dashboard"
              className="px-2.5 py-1 rounded text-xs font-mono uppercase tracking-wider font-medium bg-[var(--surface-2)] text-[#22d3ee] border border-[var(--border)] hover:border-[#22d3ee] transition-colors"
            >
              Full Logs →
            </Link>
          </div>
        }
        className="w-full"
      >
        <div className="space-y-6">
          {/* Audit Chain Integrity Line */}
          <div className="p-3 sm:p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 font-mono">
              <span className="text-[var(--text-dim)] uppercase tracking-wider text-[11px]">
                Audit Chain:
              </span>
              {loading ? (
                <span className="text-slate-400 animate-pulse">Verifying SHA-256 chain...</span>
              ) : isStatsAvailable && chain ? (
                <span className="text-[var(--text)] flex items-center gap-1.5 flex-wrap">
                  Hash chain: <code className="text-[#22d3ee] font-semibold">{chain.latestHashPrefix}...</code>
                  {chain.valid ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                      <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Valid ({chain.entries} entries checked)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-950/80 text-red-400 border border-red-800/80">
                      <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Tampering detected
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Live stats unavailable
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto text-[11px] text-[var(--text-dim)] font-mono">
              <span className="inline-flex items-center gap-1.5">
                <StatusDot status={isStatsAvailable ? 'ok' : 'idle'} size="sm" pulse={isStatsAvailable} />
                <span>RPC pg_advisory_xact_lock</span>
              </span>
            </div>
          </div>

          {/* Failure Banner when DB is unreachable */}
          {!loading && !isStatsAvailable && (
            <div className="p-4 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div className="space-y-1">
                <p className="font-semibold text-sm">Live stats unavailable</p>
                <p className="text-xs text-amber-200/80">
                  The audit database is currently unreachable or offline. Static pipeline layers and synthetic benchmark evaluations are shown below.
                </p>
              </div>
            </div>
          )}

          {/* Skeletons while loading */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-lg bg-[rgba(10,28,44,0.4)] border border-[rgba(64,224,208,0.15)] animate-pulse p-4 space-y-3"
                >
                  <div className="h-3 w-20 bg-slate-800 rounded" />
                  <div className="h-7 w-28 bg-slate-800 rounded" />
                  <div className="h-3 w-16 bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Zero Scans Empty State */}
          {!loading && isStatsAvailable && totalScans === 0 && (
            <div className="p-8 text-center rounded-lg bg-[var(--surface-2)] border border-[var(--border)] space-y-4">
              <div className="inline-flex p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[#22d3ee]">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-white">No scans yet, try the Playground</h4>
                <p className="text-xs text-[var(--text-dim)] max-w-md mx-auto">
                  Run your first prompt evaluation to see live telemetry, risk scoring, tokenization, and audit chain validation in action.
                </p>
              </div>
              <Link
                href="/playground"
                className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold"
              >
                Open Playground →
              </Link>
            </div>
          )}

          {/* (a) & (b) TOP ROW OF STAT CARDS WITH RISK GAUGE */}
          {!loading && isStatsAvailable && totalScans > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Stat Card 1: Total Scans */}
              <div className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex flex-col justify-between">
                <div>
                  <span className="hud-label text-[10px] text-[var(--text-dim)]">Total Scans</span>
                  <div className="mt-2 hud-stat text-2xl sm:text-3xl font-mono text-[#e8edf3]">
                    {totalScans.toLocaleString()}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-dim)] font-mono">
                  <span>Processed through gateway</span>
                  <span className="text-[#22d3ee] font-semibold">100%</span>
                </div>
              </div>

              {/* Stat Card 2: Blocked Prompts with Percent */}
              <div className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="hud-label text-[10px] text-[var(--text-dim)]">Blocked Prompts</span>
                    <span className="badge-critical text-[10px]">
                      {blockedPercent}% of total
                    </span>
                  </div>
                  <div className="mt-2 hud-stat text-2xl sm:text-3xl font-mono text-[#fca5a5]">
                    {blockedCount.toLocaleString()}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-dim)] font-mono">
                  <span>Policy violations halted</span>
                  <span className="text-red-400 font-semibold">{blockedPercent}%</span>
                </div>
              </div>

              {/* Stat Card 3: Injection Attempts */}
              <div className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex flex-col justify-between">
                <div>
                  <span className="hud-label text-[10px] text-[var(--text-dim)]">Injection Attempts</span>
                  <div className="mt-2 hud-stat text-2xl sm:text-3xl font-mono text-amber-300">
                    {injectionCount.toLocaleString()}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-dim)] font-mono">
                  <span>Adversarial vectors</span>
                  <span className="text-amber-400 font-semibold">Flagged</span>
                </div>
              </div>

              {/* Stat Card 4: Average Risk with RiskGauge */}
              <div className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between gap-3">
                <div className="flex-1">
                  <span className="hud-label text-[10px] text-[var(--text-dim)]">Average Risk</span>
                  <div className="mt-2 hud-stat text-2xl sm:text-3xl font-mono text-[#e8edf3]">
                    {averageRisk}
                    <span className="text-xs text-[var(--text-dim)] font-normal"> / 100</span>
                  </div>
                  <div className="mt-2 text-[11px] text-[var(--text-dim)] font-mono">
                    Severity score
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <RiskGauge score={averageRisk} size={90} strokeWidth={7} />
                </div>
              </div>
            </div>
          )}

          {/* (c) & (e) TWO-COLUMN TELEMETRY: BLOCKED BY POLICY & RECENT ACTIVITY */}
          {!loading && isStatsAvailable && totalScans > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* (c) Blocked by Policy Card (4 columns) */}
              <div className="lg:col-span-4 p-4 rounded-lg bg-[rgba(4,11,20,0.5)] border border-[rgba(64,224,208,0.2)] space-y-4">
                <div className="flex items-center justify-between border-b border-[rgba(64,224,208,0.15)] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <h5 className="hud-label text-[11px] text-[#e6f1f5]">BLOCKED BY POLICY</h5>
                  </div>
                  <span className="font-mono text-xs font-bold text-red-400">{blockedCount} Total</span>
                </div>

                {stats?.topBlockedCategories && stats.topBlockedCategories.length > 0 ? (
                  <div className="space-y-2.5">
                    <p className="text-[11px] text-[var(--text-dim)] font-mono">
                      Top policy triggers across blocked scans:
                    </p>
                    <div className="space-y-2">
                      {stats.topBlockedCategories.map((item) => (
                        <div
                          key={item.category}
                          className="flex items-center justify-between p-2 rounded bg-[rgba(10,28,44,0.4)] border border-red-500/20 text-xs font-mono"
                        >
                          <span className="text-[#fca5a5] capitalize truncate max-w-[180px]">
                            {item.category.replace(/_/g, ' ')}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800/60 text-[11px] font-bold">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded bg-[rgba(10,28,44,0.3)] text-center text-xs text-[var(--text-dim)] font-mono">
                    No policy blocks recorded yet
                  </div>
                )}

                {/* Counts By Decision Breakdown */}
                {stats?.countsByDecision && Object.keys(stats.countsByDecision).length > 0 && (
                  <div className="pt-3 border-t border-[rgba(64,224,208,0.15)] space-y-2">
                    <span className="hud-label text-[10px] text-[var(--text-dim)]">DECISION BREAKDOWN</span>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      {Object.entries(stats.countsByDecision).map(([decision, count]) => (
                        <div
                          key={decision}
                          className="p-1.5 rounded bg-[rgba(10,28,44,0.4)] border border-[rgba(64,224,208,0.12)] flex items-center justify-between"
                        >
                          <span className="text-[var(--text-dim)] capitalize">{decision}</span>
                          <span className="text-[#e6f1f5] font-bold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* (e) Recent Activity List (8 columns) */}
              <div className="lg:col-span-8 p-4 rounded-lg bg-[rgba(4,11,20,0.5)] border border-[rgba(64,224,208,0.2)] space-y-4">
                <div className="flex items-center justify-between border-b border-[rgba(64,224,208,0.15)] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#2dd4bf]" />
                    <h5 className="hud-label text-[11px] text-[#e6f1f5]">RECENT ACTIVITY (LAST 8)</h5>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--text-dim)]">
                    Aggregated Log Stream (No PII)
                  </span>
                </div>

                {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-[rgba(64,224,208,0.15)] text-[var(--text-dim)] text-[10px] uppercase">
                          <th className="py-2 pr-3 font-semibold">Time (UTC)</th>
                          <th className="py-2 px-3 font-semibold">Action</th>
                          <th className="py-2 px-3 font-semibold">Decision</th>
                          <th className="py-2 px-3 font-semibold">Risk</th>
                          <th className="py-2 pl-3 font-semibold">Detected Categories</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[rgba(64,224,208,0.1)]">
                        {stats.recentActivity.map((act, idx) => {
                          const timeStr = act.createdAt
                            ? new Date(act.createdAt).toISOString().replace('T', ' ').slice(11, 19)
                            : '--:--:--';

                          let badgeClass = 'badge-low';
                          if (act.decision === 'block') badgeClass = 'badge-critical';
                          else if (act.decision === 'review') badgeClass = 'badge-high';
                          else if (act.decision === 'sanitize') badgeClass = 'badge-medium';

                          return (
                            <tr key={idx} className="hover:bg-[rgba(45,212,191,0.03)] transition-colors">
                              <td className="py-2.5 pr-3 text-[var(--text-dim)] whitespace-nowrap">
                                {timeStr}
                              </td>
                              <td className="py-2.5 px-3 uppercase text-[#2dd4bf] font-semibold whitespace-nowrap">
                                {act.action}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className={badgeClass}>{act.decision}</span>
                              </td>
                              <td className="py-2.5 px-3 font-bold whitespace-nowrap text-[#e6f1f5]">
                                {act.riskScore}
                              </td>
                              <td className="py-2.5 pl-3">
                                <div className="flex flex-wrap gap-1">
                                  {act.categories.length > 0 ? (
                                    act.categories.map((cat, cIdx) => (
                                      <span
                                        key={cIdx}
                                        className="px-1.5 py-0.5 rounded bg-[rgba(45,212,191,0.1)] text-[#2dd4bf] border border-[#2dd4bf]/20 text-[10px]"
                                      >
                                        {cat}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-500 text-[11px]">none</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-[var(--text-dim)] font-mono">
                    No recent activity recorded
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </HudPanel>

      {/* =========================================================================
          2. (d) PIPELINE LAYERS (TRUTHFUL ARCHITECTURE)
         ========================================================================= */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <span className="hud-label text-xs text-[#22d3ee]">SECURITY ARCHITECTURE</span>
          <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
            Three Defense Layers
          </h3>
          <p className="text-xs sm:text-sm text-[var(--text-dim)] max-w-xl mx-auto">
            Modular detection, reversible in-memory encryption, and verifiable audit logging.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Layer 1: Detect */}
          <HudPanel tag="LAYER 01" title="Entity & Injection Detection" className="h-full">
            <div className="space-y-4 text-xs text-[var(--text-dim)] leading-relaxed">
              <p>
                Inspects incoming prompts in real-time for Indian identity numbers, financial credentials, high-entropy secrets, and prompt injections.
              </p>
              <div className="p-3 rounded bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
                <span className="hud-label text-[10px] text-[#22d3ee]">DETECTION CAPABILITIES</span>
                <ul className="space-y-1 font-mono text-[11px] text-[#e8edf3]">
                  <li>• Aadhaar (Verhoeff checksum verified)</li>
                  <li>• PAN, Indian Phone, UPI, IFSC</li>
                  <li>• High-entropy API keys & JWT secrets</li>
                  <li>• Jailbreaks, system leaks & Hinglish bypasses</li>
                </ul>
              </div>
              <p className="text-[11px] text-[var(--text-dim)] font-mono">
                Execution: Sub-millisecond synchronous regex matching with zero cloud calls.
              </p>
            </div>
          </HudPanel>

          {/* Layer 2: Protect */}
          <HudPanel tag="LAYER 02" title="Reversible Tokenization" className="h-full">
            <div className="space-y-4 text-xs text-[var(--text-dim)] leading-relaxed">
              <p>
                Substitutes identified private values with type-safe placeholders like <code className="text-[#22d3ee] font-mono">[AADHAAR_1]</code> and <code className="text-[#22d3ee] font-mono">[PHONE_1]</code> before model dispatch.
              </p>
              <div className="p-3 rounded bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
                <span className="hud-label text-[10px] text-[#22d3ee]">POLICY ENFORCEMENT</span>
                <ul className="space-y-1 font-mono text-[11px] text-[#e8edf3]">
                  <li>• Ephemeral AES-256-GCM encrypted vault</li>
                  <li>• Student, Developer, & Enterprise presets</li>
                  <li>• Tokenize (reversible) vs Mask (permanent)</li>
                  <li>• Transparent reply de-tokenization</li>
                </ul>
              </div>
              <p className="text-[11px] text-[var(--text-dim)] font-mono">
                Guarantee: External AI models receive only sanitized placeholders.
              </p>
            </div>
          </HudPanel>

          {/* Layer 3: Audit */}
          <HudPanel tag="LAYER 03" title="Audit Hash Chain" className="h-full">
            <div className="space-y-4 text-xs text-[var(--text-dim)] leading-relaxed">
              <p>
                Records every decision, policy override, and risk score in an append-only ledger secured by a continuous SHA-256 hash chain starting from genesis.
              </p>
              <div className="p-3 rounded bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
                <span className="hud-label text-[10px] text-[#22d3ee]">INTEGRITY CONTROLS</span>
                <ul className="space-y-1 font-mono text-[11px] text-[#e8edf3]">
                  <li>• Hash embeds prev_hash, decision, risk</li>
                  <li>• Atomic concurrency via PostgreSQL locks</li>
                  <li>• Instant detection of modified or deleted rows</li>
                  <li>• Zero raw PII written to log storage</li>
                </ul>
              </div>
              <p className="text-[11px] text-[var(--text-dim)] font-mono">
                Verification: SHA-256 hash recomputation from genesis.
              </p>
            </div>
          </HudPanel>
        </div>
      </section>

      {/* =========================================================================
          3. (g) EVALUATION STRIP (REAL NUMBERS FROM /data/results.json)
         ========================================================================= */}
      {evaluationData && evaluationData.stats.length > 0 && (
        <section className="space-y-6">
          <HudPanel
            tag="OFFLINE BENCHMARK"
            title={`Rigorous Evaluation (${evaluationData.dataset})`}
            className="w-full"
          >
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="text-sm font-semibold text-[#e6f1f5]">
                    Offline Synthetic Benchmark Results
                  </h4>
                  <p className="text-xs text-[var(--text-dim)] mt-0.5">
                    Evaluated on {evaluationData.totalSamples ? `${evaluationData.totalSamples} synthetic test prompts` : 'synthetic test dataset'}.
                  </p>
                </div>
                <div className="px-3 py-1 rounded bg-[#2dd4bf]/10 border border-[#2dd4bf]/30 text-[#2dd4bf] text-[11px] font-mono uppercase tracking-wider font-semibold">
                  synthetic, see report
                </div>
              </div>

              {/* Grid of Real Metrics from results.json */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {evaluationData.stats.map((stat) => (
                  <div
                    key={stat.id}
                    className="p-3 rounded bg-[rgba(4,11,20,0.6)] border border-[rgba(64,224,208,0.18)] flex flex-col justify-between"
                  >
                    <div>
                      <span className="hud-label text-[9px] text-[var(--text-dim)] block truncate">
                        {stat.label}
                      </span>
                      <div className="mt-1.5 hud-stat text-xl font-mono text-[#2dd4bf]">
                        {stat.value}
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] text-[var(--text-dim)] font-mono leading-tight">
                      synthetic, see report
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </HudPanel>
        </section>
      )}

      {/* =========================================================================
          4. STATIC BEFORE-AND-AFTER DEMO (ZERO API CALLS, SAFE STATIC PLACEHOLDERS)
         ========================================================================= */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <span className="hud-label text-xs text-[#22d3ee]">DEMO WORKFLOW</span>
          <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
            Before &amp; After Sanitization
          </h3>
          <p className="text-xs sm:text-sm text-[var(--text-dim)] max-w-xl mx-auto">
            See how sensitive information is sanitized before reaching external AI models.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Prompt (Before) */}
          <HudPanel tag="INPUT" title="Original Prompt" className="h-full">
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3.5 rounded bg-[var(--surface-2)] border border-red-500/20 text-slate-300 leading-relaxed">
                Please verify customer onboarding for Rajesh Kumar. Aadhaar number is{' '}
                <span className="text-red-400 bg-red-950/60 px-1 py-0.5 rounded border border-red-800/60 font-semibold">
                  9999 9999 0019
                </span>
                , mobile{' '}
                <span className="text-red-400 bg-red-950/60 px-1 py-0.5 rounded border border-red-800/60 font-semibold">
                  +91 98765 43210
                </span>
                , and email{' '}
                <span className="text-red-400 bg-red-950/60 px-1 py-0.5 rounded border border-red-800/60 font-semibold">
                  rajesh.kumar@example.com
                </span>
                .
              </div>
              <div className="flex items-center gap-2 text-[11px] text-red-400">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>3 sensitive entities detected before dispatch</span>
              </div>
            </div>
          </HudPanel>

          {/* Sanitized Prompt (After) */}
          <HudPanel tag="OUTPUT" title="What the AI received" className="h-full">
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3.5 rounded bg-[var(--surface-2)] border border-emerald-500/20 text-slate-300 leading-relaxed">
                Please verify customer onboarding for Rajesh Kumar. Aadhaar number is{' '}
                <span className="text-emerald-400 bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-800/60 font-semibold">
                  [AADHAAR_1]
                </span>
                , mobile{' '}
                <span className="text-emerald-400 bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-800/60 font-semibold">
                  [PHONE_1]
                </span>
                , and email{' '}
                <span className="text-emerald-400 bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-800/60 font-semibold">
                  [EMAIL_1]
                </span>
                .
              </div>
              <div className="flex items-center gap-2 text-[11px] text-emerald-400">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Tokens stored in ephemeral memory; reversible after reply</span>
              </div>
            </div>
          </HudPanel>
        </div>
      </section>

      {/* =========================================================================
          5. CTA CALLOUT
         ========================================================================= */}
      <section className="p-8 sm:p-10 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-center space-y-6">
        <div className="max-w-2xl mx-auto space-y-3">
          <span className="hud-label text-xs text-[#22d3ee]">GET STARTED</span>
          <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Protect Your AI Applications Today
          </h3>
          <p className="text-xs sm:text-sm text-[var(--text-dim)]">
            Test prompt sanitization live in our interactive playground or inspect chain integrity in the audit dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/playground"
            className="btn-primary"
          >
            Try the Playground →
          </Link>
          <Link
            href="/dashboard"
            className="btn-secondary"
          >
            View Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
