'use client';

import React, { useState } from 'react';
import Link from 'next/link';

type PolicyPreset = 'Student' | 'Developer' | 'Enterprise';
type ActionType = 'allow' | 'mask' | 'tokenize' | 'block';

interface Finding {
  type: string;
  start: number;
  end: number;
  confidence: number;
  action: ActionType;
  reason: string;
}

interface RiskScore {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
}

interface PreviewResponse {
  status: 'preview';
  requestId: string;
  decision: string;
  risk: RiskScore;
  findings: Finding[];
  sanitizedPreview: string;
  prompt?: string;
}

interface SendResponse {
  status: 'ok';
  answer: string;
  risk: RiskScore;
  sanitizedPrompt: string;
  tokenMap: { token: string; type: string }[];
}

interface OverrideState {
  action: 'allow' | 'mask' | 'tokenize';
  reason: string;
}

const POLICY_DETAILS: Record<
  PolicyPreset,
  { label: string; mode: string; description: string }
> = {
  Student: {
    label: 'Student',
    mode: 'Balanced',
    description: 'Masks personal contact info, blocks government IDs and secrets. Review required.',
  },
  Developer: {
    label: 'Developer',
    mode: 'Balanced',
    description: 'Tokenizes contact info, allows person names, blocks credentials and secrets.',
  },
  Enterprise: {
    label: 'Enterprise',
    mode: 'Strict',
    description: 'Zero-trust strict mode: blocks all secrets, IDs, and financial tokens. Low injection tolerance.',
  },
};

function getTypeColor(type: string): { bg: string; text: string; border: string; pill: string } {
  switch (type) {
    case 'aadhaar':
    case 'pan':
      return {
        bg: 'bg-red-950/80',
        text: 'text-red-300',
        border: 'border-red-700',
        pill: 'bg-red-900/40 text-red-300 border-red-700',
      };
    case 'credit_card':
      return {
        bg: 'bg-rose-950/80',
        text: 'text-rose-300',
        border: 'border-rose-700',
        pill: 'bg-rose-900/40 text-rose-300 border-rose-700',
      };
    case 'api_key':
    case 'private_key':
    case 'jwt':
    case 'high_entropy_secret':
      return {
        bg: 'bg-purple-950/80',
        text: 'text-purple-300',
        border: 'border-purple-700',
        pill: 'bg-purple-900/40 text-purple-300 border-purple-700',
      };
    case 'phone':
      return {
        bg: 'bg-blue-950/80',
        text: 'text-blue-300',
        border: 'border-blue-700',
        pill: 'bg-blue-900/40 text-blue-300 border-blue-700',
      };
    case 'email':
      return {
        bg: 'bg-cyan-950/80',
        text: 'text-cyan-300',
        border: 'border-cyan-700',
        pill: 'bg-cyan-900/40 text-cyan-300 border-cyan-700',
      };
    case 'person':
      return {
        bg: 'bg-amber-950/80',
        text: 'text-amber-300',
        border: 'border-amber-700',
        pill: 'bg-amber-900/40 text-amber-300 border-amber-700',
      };
    case 'upi':
    case 'ifsc':
      return {
        bg: 'bg-teal-950/80',
        text: 'text-teal-300',
        border: 'border-teal-700',
        pill: 'bg-teal-900/40 text-teal-300 border-teal-700',
      };
    case 'keyword':
      return {
        bg: 'bg-yellow-950/80',
        text: 'text-yellow-300',
        border: 'border-yellow-700',
        pill: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
      };
    default:
      return {
        bg: 'bg-slate-800',
        text: 'text-slate-300',
        border: 'border-slate-700',
        pill: 'bg-slate-800 text-slate-300 border-slate-700',
      };
  }
}

function getRiskBadge(level: 'low' | 'medium' | 'high' | 'critical'): {
  bg: string;
  text: string;
  border: string;
} {
  switch (level) {
    case 'low':
      return { bg: 'bg-emerald-950', text: 'text-emerald-400', border: 'border-emerald-700' };
    case 'medium':
      return { bg: 'bg-yellow-950', text: 'text-yellow-400', border: 'border-yellow-700' };
    case 'high':
      return { bg: 'bg-orange-950', text: 'text-orange-400', border: 'border-orange-700' };
    case 'critical':
      return { bg: 'bg-red-950', text: 'text-red-400', border: 'border-red-700' };
    default:
      return { bg: 'bg-slate-900', text: 'text-slate-300', border: 'border-slate-700' };
  }
}

export default function PlaygroundPage() {
  const [policyName, setPolicyName] = useState<PolicyPreset>('Student');
  const [prompt, setPrompt] = useState<string>(
    'Please contact Dr. Rahul Sharma at rahul@gmail.com or call 9876543210 regarding the invoice.'
  );

  const [isScanning, setIsScanning] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [scanResult, setScanResult] = useState<PreviewResponse | null>(null);
  const [overrides, setOverrides] = useState<Record<number, OverrideState>>({});
  const [sendResult, setSendResult] = useState<SendResponse | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAiDetailsOpen, setIsAiDetailsOpen] = useState(false);

  // If the user edits the prompt after scanning, clear the scan result
  // and require a new scan because character offsets change.
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    if (scanResult || sendResult || errorMessage) {
      setScanResult(null);
      setOverrides({});
      setSendResult(null);
      setErrorMessage(null);
    }
  };

  const handlePolicyChange = (newPolicy: PolicyPreset) => {
    setPolicyName(newPolicy);
    if (scanResult || sendResult || errorMessage) {
      setScanResult(null);
      setOverrides({});
      setSendResult(null);
      setErrorMessage(null);
    }
  };

  // Step 1: Scan Prompt (mode: 'preview')
  const handleScan = async () => {
    if (!prompt.trim()) {
      setErrorMessage('Please enter a non-empty prompt.');
      return;
    }

    setIsScanning(true);
    setErrorMessage(null);
    setSendResult(null);

    try {
      const response = await fetch('/api/gateway', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          mode: 'preview',
          policyName,
        }),
      });

      const data = await response.json();

      if (data.status === 'preview') {
        setScanResult(data);
        setOverrides({});
      } else if (data.status === 'error') {
        setErrorMessage(data.message || 'Request blocked for safety');
      } else if (data.status === 'bad_input') {
        setErrorMessage(data.message || 'Invalid prompt input.');
      } else if (data.status === 'blocked') {
        setErrorMessage('Prompt blocked by policy during preview.');
      } else {
        setErrorMessage(data.message || 'Scan failed.');
      }
    } catch {
      setErrorMessage('Network error: Unable to reach Gateway API.');
    } finally {
      setIsScanning(false);
    }
  };

  // Step 5: Send to AI (mode: 'send')
  const handleSend = async () => {
    if (!scanResult) return;

    // Validate that all overridden findings have a reason provided
    for (const [idxStr, override] of Object.entries(overrides)) {
      const idx = Number(idxStr);
      const finding = scanResult.findings[idx];
      if (finding && override.action !== finding.action && !override.reason.trim()) {
        setErrorMessage(`Please provide a reason for overriding ${finding.type}.`);
        return;
      }
    }

    setIsSending(true);
    setErrorMessage(null);

    // Format overrides payload
    const formattedOverrides = Object.entries(overrides).map(([idxStr, ov]) => {
      const idx = Number(idxStr);
      const f = scanResult.findings[idx];
      return {
        type: f.type,
        start: f.start,
        end: f.end,
        action: ov.action,
        reason: ov.reason.trim(),
      };
    });

    try {
      const response = await fetch('/api/gateway', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          mode: 'send',
          policyName,
          overrides: formattedOverrides,
        }),
      });

      const data = await response.json();

      if (data.status === 'ok') {
        setSendResult(data);
      } else if (data.status === 'blocked') {
        setErrorMessage(
          `Request blocked by policy: ${
            data.reasons ? data.reasons.join(', ') : 'Blocked'
          }`
        );
      } else if (data.status === 'error') {
        setErrorMessage('Request blocked for safety');
      } else {
        setErrorMessage(data.message || 'Request could not be processed.');
      }
    } catch {
      setErrorMessage('Network error: Failed to communicate with Gateway API.');
    } finally {
      setIsSending(false);
    }
  };

  // Render original text with findings highlighted as pure React text nodes
  const renderHighlightedPrompt = (text: string, findings: Finding[]) => {
    if (!findings || findings.length === 0) {
      return <span>{text}</span>;
    }

    // Sort by start offset ascending
    const sorted = [...findings].sort((a, b) => a.start - b.start);
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;

    sorted.forEach((finding, idx) => {
      // Unhighlighted text segment before finding
      if (finding.start > lastIndex) {
        nodes.push(
          <span key={`plain-${idx}`}>
            {text.slice(lastIndex, finding.start)}
          </span>
        );
      }

      // Highlighted entity segment
      if (finding.start >= lastIndex && finding.end <= text.length) {
        const chunk = text.slice(finding.start, finding.end);
        const color = getTypeColor(finding.type);
        nodes.push(
          <mark
            key={`finding-${idx}-${finding.start}`}
            className={`px-1 py-0.5 rounded font-mono text-xs border ${color.bg} ${color.text} ${color.border}`}
            title={`${finding.type} (${Math.round(finding.confidence * 100)}% conf) - Action: ${finding.action}`}
          >
            {chunk}
          </mark>
        );
        lastIndex = Math.max(lastIndex, finding.end);
      }
    });

    // Remainder of text
    if (lastIndex < text.length) {
      nodes.push(
        <span key="plain-end">
          {text.slice(lastIndex)}
        </span>
      );
    }

    return <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{nodes}</div>;
  };

  // Check if overall decision is 'block' or if any finding has 'block'
  const isBlocked = scanResult?.decision === 'block';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Page Title & Sub-header */}
      <div className="border-b border-slate-800/80 bg-slate-900/40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Gateway Playground</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive sandbox to scan, inspect, review, and safely forward prompts to LLMs.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
            >
              Security Dashboard →
            </Link>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-4 py-8 space-y-8 flex-1">
        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-sm flex items-start gap-3 shadow-lg">
            <span className="text-red-400 text-base font-bold">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold">{errorMessage}</p>
              {errorMessage === 'Request blocked for safety' && (
                <p className="text-xs text-red-300 mt-0.5">
                  The gateway intercepted and safely rejected the operation without transmitting raw content.
                </p>
              )}
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-200 text-xs font-mono"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. Policy & Prompt Input Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h2 className="text-lg font-semibold text-white">1. Select Security Policy</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Each preset configures entity redactions, injection tolerances, and review requirements.
              </p>
            </div>

            <div className="inline-flex p-1 bg-slate-950 border border-slate-800 rounded-xl">
              {(['Student', 'Developer', 'Enterprise'] as PolicyPreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePolicyChange(preset)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
                    policyName === preset
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 text-xs flex items-center justify-between">
            <span className="text-slate-300">
              <span className="font-bold text-emerald-400">{policyName} Policy:</span>{' '}
              {POLICY_DETAILS[policyName].description}
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              Mode: {POLICY_DETAILS[policyName].mode}
            </span>
          </div>

          {/* Prompt Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <label htmlFor="promptInput" className="font-semibold text-slate-300">
                Prompt to Inspect
              </label>
              <span>{prompt.length} / 20,000 characters</span>
            </div>

            <textarea
              id="promptInput"
              rows={4}
              value={prompt}
              onChange={handlePromptChange}
              placeholder="Paste or write prompt here to inspect PII, secrets, or injection..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-500">
              Editing the prompt resets preview results to guarantee offset integrity.
            </p>

            <button
              type="button"
              onClick={handleScan}
              disabled={isScanning || !prompt.trim()}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-emerald-950 transition"
            >
              {isScanning ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <span>🔍</span> Scan Prompt
                </>
              )}
            </button>
          </div>
        </section>

        {/* 2. Risk Score & Policy Decision Banner */}
        {scanResult && (
          <section className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                    Security Analysis Summary
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-2xl font-extrabold text-white">
                      Risk Score: {scanResult.risk.score}
                      <span className="text-slate-500 text-sm font-normal"> / 100</span>
                    </span>

                    {/* Risk Badge */}
                    {(() => {
                      const badge = getRiskBadge(scanResult.risk.level);
                      return (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {scanResult.risk.level} Risk
                        </span>
                      );
                    })()}

                    {/* Decision Badge */}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                        scanResult.decision === 'block'
                          ? 'bg-red-950 text-red-400 border-red-700'
                          : scanResult.decision === 'review'
                          ? 'bg-yellow-950 text-yellow-400 border-yellow-700'
                          : scanResult.decision === 'sanitize'
                          ? 'bg-blue-950 text-blue-400 border-blue-700'
                          : 'bg-emerald-950 text-emerald-400 border-emerald-700'
                      }`}
                    >
                      Decision: {scanResult.decision}
                    </span>
                  </div>
                </div>

                <div className="text-right text-xs text-slate-400 font-mono">
                  <div>Request ID: {scanResult.requestId.slice(0, 13)}...</div>
                  <div className="text-slate-500 mt-0.5">Mode: Preview (Zero Vault Writes)</div>
                </div>
              </div>

              {/* Reasons List */}
              {scanResult.risk.reasons && scanResult.risk.reasons.length > 0 ? (
                <div className="pt-3 border-t border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-400 mb-2">Detection Findings:</h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
                    {scanResult.risk.reasons.map((reason, idx) => (
                      <li
                        key={idx}
                        className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center gap-2"
                      >
                        <span className="text-emerald-400">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-xs text-slate-400 pt-2 border-t border-slate-800">
                  Clean prompt: No sensitive entities or prompt injection anomalies detected.
                </div>
              )}
            </div>

            {/* 3. Side-by-Side Review Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Panel: Highlighted Original Prompt */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <span>📝</span> Original Prompt (Findings Highlighted)
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">
                    {scanResult.findings.length} findings
                  </span>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 flex-1 min-h-[140px] text-slate-300 overflow-auto">
                  {renderHighlightedPrompt(prompt, scanResult.findings)}
                </div>
              </div>

              {/* Right Panel: Sanitized Preview */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <span>🔒</span> Sanitized Preview
                  </h4>
                  <span className="text-xs text-emerald-400 font-mono">
                    Ephemerally Tokenized
                  </span>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 flex-1 min-h-[140px] text-slate-300 font-mono text-sm leading-relaxed overflow-auto whitespace-pre-wrap">
                  {scanResult.sanitizedPreview}
                </div>
              </div>
            </div>

            {/* 4. Findings & Overrides Table */}
            {scanResult.findings.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      4. Findings Table & Policy Overrides
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      You can override non-blocked actions (e.g. change Mask to Tokenize or Allow) by providing a justification.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-medium">
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Confidence</th>
                        <th className="py-2.5 px-3">Policy Action</th>
                        <th className="py-2.5 px-3">Override Action</th>
                        <th className="py-2.5 px-3">Override Justification (Required)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {scanResult.findings.map((f, idx) => {
                        const isBlockAction = f.action === 'block';
                        const currentOverride = overrides[idx];
                        const chosenAction = currentOverride ? currentOverride.action : f.action;
                        const isOverridden = currentOverride && currentOverride.action !== f.action;
                        const color = getTypeColor(f.type);

                        return (
                          <tr key={idx} className="hover:bg-slate-950/40 transition">
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-mono border ${color.pill}`}
                              >
                                {f.type}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-400">
                              {Math.round(f.confidence * 100)}%
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold ${
                                  f.action === 'block'
                                    ? 'bg-red-950 text-red-400 border border-red-800'
                                    : f.action === 'mask'
                                    ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                    : f.action === 'tokenize'
                                    ? 'bg-purple-950 text-purple-400 border border-purple-800'
                                    : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                }`}
                              >
                                {f.action}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              {isBlockAction ? (
                                <span className="text-red-400 text-xs italic">
                                  Blocked by policy: edit your prompt to remove it
                                </span>
                              ) : (
                                <select
                                  value={chosenAction}
                                  onChange={(e) => {
                                    const newAction = e.target.value as 'allow' | 'mask' | 'tokenize';
                                    if (newAction === f.action) {
                                      const next = { ...overrides };
                                      delete next[idx];
                                      setOverrides(next);
                                    } else {
                                      setOverrides({
                                        ...overrides,
                                        [idx]: {
                                          action: newAction,
                                          reason: overrides[idx]?.reason || '',
                                        },
                                      });
                                    }
                                  }}
                                  className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                >
                                  <option value={f.action}>Default ({f.action})</option>
                                  {f.action !== 'allow' && <option value="allow">Allow</option>}
                                  {f.action !== 'mask' && <option value="mask">Mask</option>}
                                  {f.action !== 'tokenize' && <option value="tokenize">Tokenize</option>}
                                </select>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {!isBlockAction && isOverridden ? (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={currentOverride?.reason || ''}
                                    onChange={(e) => {
                                      setOverrides({
                                        ...overrides,
                                        [idx]: {
                                          action: chosenAction as 'allow' | 'mask' | 'tokenize',
                                          reason: e.target.value,
                                        },
                                      });
                                    }}
                                    placeholder="Enter reason for override (required)"
                                    className={`w-full bg-slate-950 border rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none ${
                                      !currentOverride?.reason.trim()
                                        ? 'border-red-600 focus:ring-1 focus:ring-red-500'
                                        : 'border-slate-800 focus:ring-1 focus:ring-emerald-500'
                                    }`}
                                  />
                                  {!currentOverride?.reason.trim() && (
                                    <p className="text-[10px] text-red-400">
                                      Reason is required for this override.
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-600 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. Send to AI Action Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-white">5. Forward to LLM</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isBlocked
                    ? 'Blocked by security policy. You must edit your prompt to remove sensitive violations before continuing.'
                    : 'Prompt passed policy checks. Sensitive items will be vaulted before forwarding.'}
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isBlocked || isSending}
                  className={`px-8 py-3 rounded-xl font-medium text-sm flex items-center gap-2 shadow-lg transition ${
                    isBlocked
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                  }`}
                >
                  {isSending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sanitizing & Sending...
                    </>
                  ) : isBlocked ? (
                    <>
                      <span>🚫</span> Send Blocked by Policy
                    </>
                  ) : (
                    <>
                      <span>🚀</span> Send to AI
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* 6. AI Output & Collapsible Inspection Box */}
        {sendResult && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="text-emerald-400">✨</span> Model Answer (Restored)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Downstream response with vaulted tokens transparently restored.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
                Status: OK
              </span>
            </div>

            {/* Model Response (Plain Text) */}
            <div className="p-5 bg-slate-950 rounded-xl border border-slate-800">
              <pre className="whitespace-pre-wrap font-sans text-slate-100 text-sm leading-relaxed">
                {sendResult.answer}
              </pre>
            </div>

            {/* Collapsible 'What the AI actually saw' box */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
              <button
                type="button"
                onClick={() => setIsAiDetailsOpen(!isAiDetailsOpen)}
                className="w-full px-4 py-3 bg-slate-950 text-slate-300 hover:text-white flex items-center justify-between text-xs font-semibold tracking-wide uppercase transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">{isAiDetailsOpen ? '▼' : '▶'}</span>
                  <span>What the AI actually saw (Vault Protected)</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 lowercase">
                  {sendResult.tokenMap.length} tokens vaulted
                </span>
              </button>

              {isAiDetailsOpen && (
                <div className="p-4 space-y-4 border-t border-slate-800 text-xs">
                  <div>
                    <h5 className="font-semibold text-slate-400 mb-1.5 uppercase text-[10px]">
                      Sanitized Prompt Transmitted to LLM:
                    </h5>
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {sendResult.sanitizedPrompt}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold text-slate-400 mb-1.5 uppercase text-[10px]">
                      Active Token Map (Identifiers Only — Raw Values Never Logged):
                    </h5>
                    {sendResult.tokenMap.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {sendResult.tokenMap.map((tm, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
                          >
                            <span className="font-mono text-emerald-400 font-bold">
                              {tm.token}
                            </span>
                            <span className="text-slate-500 font-mono uppercase text-[10px]">
                              {tm.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-xs italic">
                        No tokens required. All findings were masked, allowed, or none were detected.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        YapShield Guardrail Gateway • Cryptographic Chain & Ephemeral AES-256 Vault Active
      </footer>
    </div>
  );
}
