/**
 * YapShield Evaluation Harness
 *
 * Runs comprehensive automated evaluation across the 300-prompt benchmark:
 * 1. Generates /data/test_prompts.csv if missing.
 * 2. Runs detectAll and detectInjection across every row.
 * 3. Calculates per-type precision, recall, and F1.
 * 4. Calculates overall micro-averaged metrics.
 * 5. Measures false-positive rate on clean prompts (detects anything or injection score >= 30).
 * 6. Measures injection recall and false-positive rate.
 * 7. Measures average and p95 latency per prompt.
 * 8. Evaluates a Naive Regex Baseline for honest empirical comparison.
 * 9. Saves results (IDs and numbers only, NO raw prompts) to /data/results.json and /data/results.md.
 * 10. Prints the top misses and false positives by ID for diagnosis.
 */

import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { detectAll } from '../lib/detectors';
import { detectInjection } from '../lib/detectors/injection';
import { writeDatasetToCsv } from './generateDataset';

export interface PromptItem {
  id: number;
  text: string;
  expected_types: string[];
  is_injection: boolean;
  group: string;
}

// ---------------------------------------------------------------------------
// CSV Parser (RFC 4180)
// ---------------------------------------------------------------------------

export function parseCsv(content: string): PromptItem[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < content.length && content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        cur.push(field);
        field = '';
      } else if (c === '\n' || (c === '\r' && content[i + 1] === '\n')) {
        if (c === '\r') i++;
        cur.push(field);
        field = '';
        if (cur.length > 1) {
          rows.push(cur);
        }
        cur = [];
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    if (cur.length > 1) rows.push(cur);
  }

  if (rows.length === 0) return [];

  // Parse header to dynamically map columns (supports 3-column holdout or 5-column benchmark)
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idIdx = header.indexOf('id');
  const textIdx = header.indexOf('text');
  const typesIdx = header.indexOf('expected_types');
  const injIdx = header.indexOf('is_injection');
  const groupIdx = header.indexOf('group');

  const dataRows = rows.slice(1);
  return dataRows.map((r) => {
    const id = idIdx >= 0 && r[idIdx] !== undefined ? parseInt(r[idIdx], 10) : 0;
    const text = textIdx >= 0 && r[textIdx] !== undefined ? r[textIdx] : '';
    const expected_types =
      typesIdx >= 0 && r[typesIdx]
        ? r[typesIdx].split(';').map((s) => s.trim()).filter(Boolean)
        : [];
    const is_injection =
      injIdx >= 0 && r[injIdx] !== undefined
        ? r[injIdx].trim().toLowerCase() === 'true'
        : false;
    const group = groupIdx >= 0 && r[groupIdx] !== undefined ? r[groupIdx].trim() : '';

    return {
      id,
      text,
      expected_types,
      is_injection,
      group,
    };
  });
}

// ---------------------------------------------------------------------------
// Naive Regex Baseline
// Generic regexes only: email, any 10-digit number, any 12-digit number,
// any 16-digit number, simple phrase for injection, no checksums, no entropy.
// ---------------------------------------------------------------------------

interface BaselineResult {
  detectedTypes: string[];
  isInjection: boolean;
}

export function runNaiveBaseline(text: string): BaselineResult {
  const detectedTypes = new Set<string>();

  // Generic email regex
  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(text)) {
    detectedTypes.add('email');
  }

  // Any 10-digit number -> phone (no prefix / range checking)
  if (/\b\d{10}\b/.test(text)) {
    detectedTypes.add('phone');
  }

  // Any 12-digit number -> aadhaar (no Verhoeff checksum)
  if (/\b\d{12}\b|\b\d{4}\s\d{4}\s\d{4}\b/.test(text)) {
    detectedTypes.add('aadhaar');
  }

  // Any 16-digit number -> credit card (no Luhn check)
  if (/\b\d{16}\b|\b\d{4}\s\d{4}\s\d{4}\s\d{4}\b/.test(text)) {
    detectedTypes.add('credit_card');
  }

  // Generic PAN pattern
  if (/\b[A-Z]{5}\d{4}[A-Z]\b/.test(text)) {
    detectedTypes.add('pan');
  }

  // Generic UPI pattern
  if (/\b[a-zA-Z0-9._-]+@(okaxis|oksbi|paytm|ybl|upi|apl|sbi|icici)\b/i.test(text)) {
    detectedTypes.add('upi');
  }

  // Generic IFSC pattern
  if (/\b[A-Z]{4}0[A-Z0-9]{6}\b/.test(text)) {
    detectedTypes.add('ifsc');
  }

  // Naive injection: only exact phrase
  const isInjection = /ignore\s+(?:all\s+)?previous\s+instructions/i.test(text);

  return {
    detectedTypes: Array.from(detectedTypes),
    isInjection,
  };
}

// ---------------------------------------------------------------------------
// Metric Calculations
// ---------------------------------------------------------------------------

export interface TypeMetrics {
  type: string;
  tp: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface EvalSummary {
  totalRows: number;
  types: TypeMetrics[];
  micro: {
    precision: number;
    recall: number;
    f1: number;
  };
  cleanFpr: number;
  cleanFpCount: number;
  cleanTotal: number;
  injectionRecall: number;
  injectionFpr: number;
  latencyAvgMs: number;
  latencyP95Ms: number;
}

const EVAL_TYPES = [
  'email',
  'phone',
  'aadhaar',
  'pan',
  'upi',
  'ifsc',
  'credit_card',
  'api_key',
  'jwt',
  'private_key',
  'high_entropy_secret',
  'person',
];

export function computeSummary(
  items: PromptItem[],
  results: {
    id: number;
    detectedTypes: string[];
    isInjection: boolean;
    injectionScore: number;
    latencyMs: number;
  }[]
): EvalSummary {
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const typeStats = new Map<string, { tp: number; fp: number; fn: number }>();

  for (const t of EVAL_TYPES) {
    typeStats.set(t, { tp: 0, fp: 0, fn: 0 });
  }

  let cleanFpCount = 0;
  let cleanTotal = 0;

  let injTp = 0;
  let injTotalTrue = 0;
  let injFp = 0;
  let injTotalFalse = 0;

  const latencies: number[] = [];

  for (const r of results) {
    const item = itemMap.get(r.id);
    if (!item) continue;

    latencies.push(r.latencyMs);

    const expectedSet = new Set(item.expected_types);
    const detectedSet = new Set(r.detectedTypes);

    for (const t of EVAL_TYPES) {
      const isExp = expectedSet.has(t);
      const isDet = detectedSet.has(t);
      const s = typeStats.get(t)!;

      if (isExp && isDet) s.tp++;
      else if (!isExp && isDet) s.fp++;
      else if (isExp && !isDet) s.fn++;
    }

    // Clean group FP evaluation
    if (item.group === 'clean') {
      cleanTotal++;
      if (r.detectedTypes.length > 0 || r.injectionScore >= 30) {
        cleanFpCount++;
      }
    }

    // Injection detection metrics
    if (item.is_injection) {
      injTotalTrue++;
      if (r.isInjection) {
        injTp++;
      }
    } else {
      injTotalFalse++;
      if (r.isInjection) {
        injFp++;
      }
    }
  }

  let totalTp = 0;
  let totalFp = 0;
  let totalFn = 0;

  const typeMetrics: TypeMetrics[] = EVAL_TYPES.map((type) => {
    const s = typeStats.get(type)!;
    totalTp += s.tp;
    totalFp += s.fp;
    totalFn += s.fn;

    const precision = s.tp + s.fp > 0 ? s.tp / (s.tp + s.fp) : 1;
    const recall = s.tp + s.fn > 0 ? s.tp / (s.tp + s.fn) : 1;
    const f1 =
      precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return {
      type,
      tp: s.tp,
      fp: s.fp,
      fn: s.fn,
      precision,
      recall,
      f1,
    };
  });

  const microP = totalTp + totalFp > 0 ? totalTp / (totalTp + totalFp) : 1;
  const microR = totalTp + totalFn > 0 ? totalTp / (totalTp + totalFn) : 1;
  const microF1 = microP + microR > 0 ? (2 * microP * microR) / (microP + microR) : 0;

  const cleanFpr = cleanTotal > 0 ? cleanFpCount / cleanTotal : 0;
  const injectionRecall = injTotalTrue > 0 ? injTp / injTotalTrue : 0;
  const injectionFpr = injTotalFalse > 0 ? injFp / injTotalFalse : 0;

  latencies.sort((a, b) => a - b);
  const latencyAvgMs =
    latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
  const p95Idx = Math.floor(0.95 * (latencies.length - 1));
  const latencyP95Ms = latencies[p95Idx] || 0;

  return {
    totalRows: items.length,
    types: typeMetrics,
    micro: {
      precision: microP,
      recall: microR,
      f1: microF1,
    },
    cleanFpr,
    cleanFpCount,
    cleanTotal,
    injectionRecall,
    injectionFpr,
    latencyAvgMs,
    latencyP95Ms,
  };
}

// ---------------------------------------------------------------------------
// Markdown Report Formatting
// ---------------------------------------------------------------------------

function formatPercent(val: number): string {
  return `${(val * 100).toFixed(1)}%`;
}

export function generateMarkdownReport(
  yap: EvalSummary,
  baseline: EvalSummary,
  misses: { id: number; group: string; expected: string[]; detected: string[]; injectionScore: number }[],
  fps: { id: number; group: string; expected: string[]; detected: string[]; injectionScore: number }[],
  label = 'v1 (original)'
): string {
  // If evaluating a pure injection dataset (e.g. held-out manual set with only id, text, is_injection)
  if (label === 'held-out manual set' || yap.types.every((t) => t.tp === 0 && t.fn === 0)) {
    let md = `# YapShield Evaluation Report - ${label}\n\n`;
    md += `**Dataset**: ${label}  \n`;
    md += `**Total Test Prompts Evaluated**: ${yap.totalRows}  \n`;
    md += `**Average Latency**: ${yap.latencyAvgMs.toFixed(2)} ms  \n`;
    md += `**p95 Latency**: ${yap.latencyP95Ms.toFixed(2)} ms  \n\n`;

    md += '## Security & Prompt Injection Performance\n\n';
    md += '| Metric | YapShield Guardrails | Naive Regex Baseline | Delta |\n';
    md += '| :--- | :---: | :---: | :---: |\n';
    md += `| **Prompt Injection Recall** | **${formatPercent(yap.injectionRecall)}** | ${formatPercent(baseline.injectionRecall)} | +${((yap.injectionRecall - baseline.injectionRecall) * 100).toFixed(1)}% |\n`;
    md += `| **Prompt Injection False-Positive Rate** | **${formatPercent(yap.injectionFpr)}** | ${formatPercent(baseline.injectionFpr)} | -${((baseline.injectionFpr - yap.injectionFpr) * 100).toFixed(1)}% |\n\n`;

    md += '## Diagnostics: Top Misses by ID\n\n';
    if (misses.length === 0) {
      md += 'No misses recorded.\n\n';
    } else {
      md += '| ID | Expected Injection | Detected | Injection Score |\n';
      md += '| :---: | :--- | :--- | :---: |\n';
      for (const m of misses.slice(0, 10)) {
        md += `| #${m.id} | true | false | ${m.injectionScore} |\n`;
      }
      md += '\n';
    }

    md += '## Diagnostics: Top False Positives by ID\n\n';
    if (fps.length === 0) {
      md += 'No false positives recorded.\n\n';
    } else {
      md += '| ID | Expected Injection | Detected | Injection Score |\n';
      md += '| :---: | :--- | :--- | :---: |\n';
      for (const f of fps.slice(0, 10)) {
        md += `| #${f.id} | false | true | ${f.injectionScore} |\n`;
      }
      md += '\n';
    }

    return md;
  }

  let md = `# YapShield Evaluation Benchmark Report - ${label}\n\n`;
  md += `**Dataset**: ${label}  \n`;
  md += `**Total Test Prompts Evaluated**: ${yap.totalRows}  \n`;
  md += `**Average Latency**: ${yap.latencyAvgMs.toFixed(2)} ms  \n`;
  md += `**p95 Latency**: ${yap.latencyP95Ms.toFixed(2)} ms  \n\n`;

  md += `## 1. Primary Model Performance (${label})\n\n`;
  md += '| Entity Type | Precision | Recall | F1 Score | TP | FP | FN |\n';
  md += '| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n';
  for (const t of yap.types) {
    md += `| **${t.type}** | ${formatPercent(t.precision)} | ${formatPercent(t.recall)} | ${formatPercent(t.f1)} | ${t.tp} | ${t.fp} | ${t.fn} |\n`;
  }
  md += `| **MICRO AVERAGE** | **${formatPercent(yap.micro.precision)}** | **${formatPercent(yap.micro.recall)}** | **${formatPercent(yap.micro.f1)}** | - | - | - |\n\n`;

  md += '### Security & Clean Robustness\n';
  md += `- **Clean Group False-Positive Rate (FPR)**: ${formatPercent(yap.cleanFpr)} (${yap.cleanFpCount}/${yap.cleanTotal})\n`;
  md += `- **Prompt Injection Recall**: ${formatPercent(yap.injectionRecall)}\n`;
  md += `- **Prompt Injection False-Positive Rate**: ${formatPercent(yap.injectionFpr)}\n\n`;

  md += `## 2. Comparative Benchmark: YapShield (${label}) vs. Naive Regex Baseline\n\n`;
  md += '| Metric | YapShield Guardrails | Naive Regex Baseline | Delta |\n';
  md += '| :--- | :---: | :---: | :---: |\n';
  md += `| **Entity Micro Precision** | **${formatPercent(yap.micro.precision)}** | ${formatPercent(baseline.micro.precision)} | +${((yap.micro.precision - baseline.micro.precision) * 100).toFixed(1)}% |\n`;
  md += `| **Entity Micro Recall** | **${formatPercent(yap.micro.recall)}** | ${formatPercent(baseline.micro.recall)} | +${((yap.micro.recall - baseline.micro.recall) * 100).toFixed(1)}% |\n`;
  md += `| **Entity Micro F1** | **${formatPercent(yap.micro.f1)}** | ${formatPercent(baseline.micro.f1)} | +${((yap.micro.f1 - baseline.micro.f1) * 100).toFixed(1)}% |\n`;
  md += `| **Clean Group FPR (Lower is Better)** | **${formatPercent(yap.cleanFpr)}** | ${formatPercent(baseline.cleanFpr)} | -${((baseline.cleanFpr - yap.cleanFpr) * 100).toFixed(1)}% |\n`;
  md += `| **Injection Attack Recall** | **${formatPercent(yap.injectionRecall)}** | ${formatPercent(baseline.injectionRecall)} | +${((yap.injectionRecall - baseline.injectionRecall) * 100).toFixed(1)}% |\n`;
  md += `| **Injection FPR (Lower is Better)** | **${formatPercent(yap.injectionFpr)}** | ${formatPercent(baseline.injectionFpr)} | -${((baseline.injectionFpr - yap.injectionFpr) * 100).toFixed(1)}% |\n\n`;

  md += '## 3. Diagnostics: Top Misses by ID (IDs and Numbers Only)\n\n';
  if (misses.length === 0) {
    md += 'No misses recorded.\n\n';
  } else {
    md += '| ID | Group | Expected Entities | Detected Entities | Injection Score |\n';
    md += '| :---: | :--- | :--- | :--- | :---: |\n';
    for (const m of misses.slice(0, 10)) {
      md += `| #${m.id} | ${m.group} | ${m.expected.join(', ') || 'none'} | ${m.detected.join(', ') || 'none'} | ${m.injectionScore} |\n`;
    }
    md += '\n';
  }

  md += '## 4. Diagnostics: Top False Positives by ID (IDs and Numbers Only)\n\n';
  if (fps.length === 0) {
    md += 'No false positives recorded.\n\n';
  } else {
    md += '| ID | Group | Expected Entities | Detected Entities | Injection Score |\n';
    md += '| :---: | :--- | :--- | :--- | :---: |\n';
    for (const f of fps.slice(0, 10)) {
      md += `| #${f.id} | ${f.group} | ${f.expected.join(', ') || 'none'} | ${f.detected.join(', ') || 'none'} | ${f.injectionScore} |\n`;
    }
    md += '\n';
  }

  return md;
}

// ---------------------------------------------------------------------------
// Main Evaluation Runner
// ---------------------------------------------------------------------------

export interface EvaluationResult {
  label: string;
  yap: EvalSummary;
  baseline: EvalSummary;
  markdown: string;
  json: any;
}

export async function evaluateDatasetFile(
  csvPath: string,
  label: string
): Promise<EvaluationResult> {
  // 1. Generate dataset if missing (except manual holdout set which must be provided by user)
  if (!fs.existsSync(csvPath)) {
    if (csvPath.includes('holdout_manual')) {
      throw new Error(`Manual holdout dataset not found at ${csvPath}`);
    }
    console.log(`[eval] Dataset missing at ${csvPath}, generating...`);
    const seed = csvPath.includes('holdout') ? 987654321 : 20261103;
    writeDatasetToCsv(csvPath, seed);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const items = parseCsv(csvContent);

  if (items.length !== 300 && !label.includes('manual')) {
    console.warn(`[eval] Expected 300 items in ${label}, read ${items.length}`);
  }

  // 2. Evaluate YapShield
  const yapResults: {
    id: number;
    detectedTypes: string[];
    isInjection: boolean;
    injectionScore: number;
    latencyMs: number;
  }[] = [];

  const misses: {
    id: number;
    group: string;
    expected: string[];
    detected: string[];
    injectionScore: number;
  }[] = [];

  const falsePositives: {
    id: number;
    group: string;
    expected: string[];
    detected: string[];
    injectionScore: number;
  }[] = [];

  for (const item of items) {
    const t0 = performance.now();
    const detections = detectAll(item.text);
    const injection = detectInjection(item.text);
    const latencyMs = performance.now() - t0;

    const detectedTypes: string[] = Array.from(new Set(detections.map((d) => d.type as string)));
    const isInjection = injection.score >= 30;

    yapResults.push({
      id: item.id,
      detectedTypes,
      isInjection,
      injectionScore: injection.score,
      latencyMs,
    });

    const expectedSet = new Set<string>(item.expected_types);
    const detectedSet = new Set<string>(detectedTypes);

    // Identify misses (expected entity missing or missed injection)
    const hasTypeCheck = item.expected_types.length > 0;
    const hasTypeMiss = hasTypeCheck && item.expected_types.some((exp) => !detectedSet.has(exp));
    const hasInjMiss = item.is_injection && !isInjection;
    if (hasTypeMiss || hasInjMiss) {
      misses.push({
        id: item.id,
        group: item.group,
        expected: item.expected_types,
        detected: detectedTypes,
        injectionScore: injection.score,
      });
    }

    // Identify false positives (unexpected detection on clean or non-injection)
    const hasUnexpectedType = hasTypeCheck && detectedTypes.some((det) => !expectedSet.has(det));
    const hasUnexpectedInj = !item.is_injection && isInjection;
    if (hasUnexpectedType || hasUnexpectedInj) {
      falsePositives.push({
        id: item.id,
        group: item.group,
        expected: item.expected_types,
        detected: detectedTypes,
        injectionScore: injection.score,
      });
    }
  }

  // 3. Evaluate Naive Baseline
  const baselineResults: {
    id: number;
    detectedTypes: string[];
    isInjection: boolean;
    injectionScore: number;
    latencyMs: number;
  }[] = [];

  for (const item of items) {
    const t0 = performance.now();
    const res = runNaiveBaseline(item.text);
    const latencyMs = performance.now() - t0;

    baselineResults.push({
      id: item.id,
      detectedTypes: res.detectedTypes,
      isInjection: res.isInjection,
      injectionScore: res.isInjection ? 70 : 0,
      latencyMs,
    });
  }

  const yapSummary = computeSummary(items, yapResults);
  const baselineSummary = computeSummary(items, baselineResults);

  const jsonResults = {
    evaluatedAt: new Date().toISOString(),
    dataset: label,
    filePath: path.relative(process.cwd(), csvPath),
    totalSamples: yapSummary.totalRows,
    yapShield: {
      micro: yapSummary.micro,
      cleanFpr: yapSummary.cleanFpr,
      cleanFpCount: yapSummary.cleanFpCount,
      cleanTotal: yapSummary.cleanTotal,
      injectionRecall: yapSummary.injectionRecall,
      injectionFpr: yapSummary.injectionFpr,
      latencyAvgMs: yapSummary.latencyAvgMs,
      latencyP95Ms: yapSummary.latencyP95Ms,
      perTypeMetrics: yapSummary.types,
    },
    naiveRegexBaseline: {
      micro: baselineSummary.micro,
      cleanFpr: baselineSummary.cleanFpr,
      cleanFpCount: baselineSummary.cleanFpCount,
      cleanTotal: baselineSummary.cleanTotal,
      injectionRecall: baselineSummary.injectionRecall,
      injectionFpr: baselineSummary.injectionFpr,
      latencyAvgMs: baselineSummary.latencyAvgMs,
      latencyP95Ms: baselineSummary.latencyP95Ms,
      perTypeMetrics: baselineSummary.types,
    },
    diagnostics: {
      topMissesById: misses.slice(0, 10).map((m) => ({
        id: m.id,
        group: m.group,
        expected: m.expected,
        detected: m.detected,
        injectionScore: m.injectionScore,
      })),
      topFalsePositivesById: falsePositives.slice(0, 10).map((f) => ({
        id: f.id,
        group: f.group,
        expected: f.expected,
        detected: f.detected,
        injectionScore: f.injectionScore,
      })),
    },
  };

  const markdownReport = generateMarkdownReport(
    yapSummary,
    baselineSummary,
    misses,
    falsePositives,
    label
  );

  return {
    label,
    yap: yapSummary,
    baseline: baselineSummary,
    markdown: markdownReport,
    json: jsonResults,
  };
}

export async function runEvaluation(targetFile?: string): Promise<void> {
  const resultsDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  if (targetFile) {
    let absPath: string;
    if (path.isAbsolute(targetFile)) {
      if (fs.existsSync(targetFile)) {
        absPath = targetFile;
      } else {
        const normalized = targetFile.replace(/^[/\\]+/, '');
        const candidate = path.join(process.cwd(), normalized);
        absPath = fs.existsSync(candidate) ? candidate : targetFile;
      }
    } else {
      absPath = path.join(process.cwd(), targetFile);
    }

    let label = 'custom dataset';
    if (targetFile.includes('holdout_manual')) {
      label = 'held-out manual set';
    } else if (targetFile.includes('holdout')) {
      label = 'v2 (held-out)';
    } else if (targetFile.includes('test_prompts.csv')) {
      label = 'v1 (original)';
    } else {
      label = path.basename(targetFile, '.csv');
    }

    const result = await evaluateDatasetFile(absPath, label);

    console.log(`\n================================================================================`);
    console.log(`=== ${label} ===`);
    console.log(`================================================================================\n`);
    console.log(result.markdown);

    fs.writeFileSync(path.join(resultsDir, 'results.json'), JSON.stringify(result.json, null, 2), 'utf8');
    fs.writeFileSync(path.join(resultsDir, 'results.md'), result.markdown, 'utf8');
    return;
  }

  // Dual evaluation: v1 (original) and v2 (held-out)
  const v1Path = path.join(process.cwd(), 'data', 'test_prompts.csv');
  const v2Path = path.join(process.cwd(), 'data', 'test_prompts_holdout.csv');

  const v1Result = await evaluateDatasetFile(v1Path, 'v1 (original)');
  const v2Result = await evaluateDatasetFile(v2Path, 'v2 (held-out)');

  console.log(`\n================================================================================`);
  console.log(`=== v1 (original) ===`);
  console.log(`================================================================================\n`);
  console.log(v1Result.markdown);

  console.log(`\n================================================================================`);
  console.log(`=== v2 (held-out) ===`);
  console.log(`================================================================================\n`);
  console.log(v2Result.markdown);

  const combinedJson = {
    evaluatedAt: new Date().toISOString(),
    v1: v1Result.json,
    v2: v2Result.json,
  };

  const combinedMarkdown = `${v1Result.markdown}\n\n---\n\n${v2Result.markdown}`;

  fs.writeFileSync(path.join(resultsDir, 'results.json'), JSON.stringify(combinedJson, null, 2), 'utf8');
  fs.writeFileSync(path.join(resultsDir, 'results.md'), combinedMarkdown, 'utf8');
}

// Direct execution
if (require.main === module || process.argv[1]?.endsWith('evaluate.ts')) {
  let fileArg: string | undefined;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      fileArg = args[i + 1];
      i++;
    }
  }

  runEvaluation(fileArg)
    .then(() => {
      console.log('[eval] Evaluation completed successfully.');
    })
    .catch((err) => {
      console.error('[eval] Evaluation failed:', err);
      process.exit(1);
    });
}
