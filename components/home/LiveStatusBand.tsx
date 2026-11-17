'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { HudPanel, RiskGauge, CountUp } from '@/components';
import PromptChain from '@/components/PromptChain';
import type { PublicStatsResponse } from '@/lib/publicStats';

export default function LiveStatusBand() {
  const [stats, setStats] = useState<PublicStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchStats() {
      try {
        const res = await fetch('/api/public-stats');
        if (!res.ok) {
          if (active) setError(true);
          return;
        }
        const data: PublicStatsResponse = await res.json();
        if (active) {
          setStats(data);
          setError(!data.available);
        }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchStats();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <HudPanel
        title="Live System Status"
        tag="TELEMETRY"
        status="active"
        statusLabel="Polling..."
        className="transition-colors"
      >
        <div className="py-6 flex items-center justify-center gap-3 text-xs font-mono text-[var(--text-dim)]">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
          <span>Connecting to live gateway telemetry...</span>
        </div>
      </HudPanel>
    );
  }

  if (error || !stats || !stats.available) {
    return (
      <HudPanel
        title="Live System Status"
        tag="OFFLINE"
        status="idle"
        statusLabel="Standby"
        className="transition-colors"
      >
        <div className="py-6 text-center text-xs font-mono text-[var(--text-dim)]">
          Live stats unavailable
        </div>
      </HudPanel>
    );
  }

  if (typeof stats.totalScans === 'number' && stats.totalScans === 0) {
    return (
      <HudPanel
        title="Live System Status"
        tag="TELEMETRY"
        status="ok"
        statusLabel="Ready"
        className="transition-colors"
      >
        <div className="py-6 text-center space-y-3">
          <p className="text-sm font-medium text-[var(--text)]">
            No scans yet, try the Playground
          </p>
          <p className="text-xs text-[var(--text-dim)]">
            Scans performed in the playground will verify and log integrity on the audit chain in real time.
          </p>
          <div>
            <Link href="/playground" className="btn-primary text-xs h-8 px-3">
              Open Playground
            </Link>
          </div>
        </div>
      </HudPanel>
    );
  }

  const isChainValid = stats.chain?.valid ?? true;
  const hashPrefix = stats.chain?.latestHashPrefix ?? 'GENESIS';
  const checkedBlocks = stats.chain?.entries ?? 0;

  return (
    <HudPanel
      title="Live system status"
      status={isChainValid ? 'ok' : 'critical'}
      statusLabel={isChainValid ? 'Chain Valid' : 'Tamper Detected'}
      headerCenter={<PromptChain />}
      className="transition-colors"
    >
      {/* Below 1024px: chain moves to its own full-width row under the header and scrolls horizontally */}
      <div className="lg:hidden -mx-4 -mt-4 sm:-mx-5 sm:-mt-5 mb-6 border-b border-[var(--border)] bg-[var(--surface-2)]/40 p-3 sm:p-4 overflow-x-auto">
        <PromptChain />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 items-center">
        {/* Total Scans */}
        <div className="space-y-1">
          <div className="hud-label text-xs">Total Scans</div>
          <div className="hud-stat text-2xl lg:text-3xl font-semibold">
            <CountUp value={stats.totalScans || 0} />
          </div>
          <div className="text-[11px] font-mono text-[var(--text-dim)]">
            Verified requests
          </div>
        </div>

        {/* Blocked Percent */}
        <div className="space-y-1">
          <div className="hud-label text-xs">Blocked Rate</div>
          <div className="hud-stat text-2xl lg:text-3xl font-semibold text-rose-500 dark:text-rose-400">
            <CountUp value={stats.blockedPercent || 0} suffix="%" />
          </div>
          <div className="text-[11px] font-mono text-[var(--text-dim)]">
            {stats.blockedCount || 0} prompts intercepted
          </div>
        </div>

        {/* Injection Attempts */}
        <div className="space-y-1">
          <div className="hud-label text-xs">Injection Attempts</div>
          <div className="hud-stat text-2xl lg:text-3xl font-semibold text-amber-500 dark:text-amber-400">
            <CountUp value={stats.injectionCount || 0} />
          </div>
          <div className="text-[11px] font-mono text-[var(--text-dim)]">
            Multi-vector attacks
          </div>
        </div>

        {/* Average Risk (Gauge) */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="hud-label text-xs mb-1">Average Risk</div>
          <RiskGauge
            score={stats.averageRisk || 0}
            size={96}
            strokeWidth={7}
            showLabel={false}
          />
          <div className="text-[11px] font-mono text-[var(--text-dim)] mt-1">
            Score: {stats.averageRisk || 0}/100
          </div>
        </div>

        {/* Hash Chain Integrity */}
        <div className="space-y-2 border-t sm:border-t-0 sm:border-l border-[var(--border)] sm:pl-6">
          <div className="hud-label text-xs">Cryptographic Chain</div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider ${
                isChainValid
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40'
                  : 'bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/40'
              }`}
            >
              {isChainValid ? 'VALID' : 'BROKEN'}
            </span>
            <span className="font-mono text-xs text-[var(--text)]">
              SHA-256: {hashPrefix}
            </span>
          </div>
          <div className="text-[11px] font-mono text-[var(--text-dim)]">
            {checkedBlocks} entries verified
          </div>
        </div>
      </div>
    </HudPanel>
  );
}
