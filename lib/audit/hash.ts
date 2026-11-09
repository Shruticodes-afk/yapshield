import crypto from 'node:crypto';

/**
 * Computes the SHA-256 hash for an audit log entry.
 * Incorporates: prevHash, action, categories, riskScore, decision, maskedPrompt, overrideCount, createdAt.
 */
export function computeHash(row: {
  prevHash?: string;
  prev_hash?: string;
  action: string;
  categories: string[];
  riskScore?: number;
  risk_score?: number;
  decision: string;
  maskedPrompt?: string;
  masked_prompt?: string;
  overrideCount?: number;
  override_count?: number;
  createdAt?: Date | string;
  created_at?: Date | string;
}): string {
  const prev = row.prevHash ?? row.prev_hash ?? 'GENESIS';
  const action = row.action;
  const cats = (row.categories || []).join(',');
  const risk = row.riskScore ?? row.risk_score ?? 0;
  const decision = row.decision;
  const prompt = row.maskedPrompt ?? row.masked_prompt ?? '';
  const oc = row.overrideCount ?? row.override_count ?? 0;

  const rawDate = row.createdAt ?? row.created_at ?? new Date();
  const createdIso =
    rawDate instanceof Date
      ? rawDate.toISOString()
      : new Date(rawDate).toISOString();

  const payload = `${prev}|${action}|${cats}|${risk}|${decision}|${prompt}|${oc}|${createdIso}`;
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

/**
 * Alternate hash without overrideCount for backward compatibility.
 */
export function computeHashWithoutOverride(row: {
  prevHash?: string;
  prev_hash?: string;
  action: string;
  categories: string[];
  riskScore?: number;
  risk_score?: number;
  decision: string;
  maskedPrompt?: string;
  masked_prompt?: string;
  createdAt?: Date | string;
  created_at?: Date | string;
}): string {
  const prev = row.prevHash ?? row.prev_hash ?? 'GENESIS';
  const action = row.action;
  const cats = (row.categories || []).join(',');
  const risk = row.riskScore ?? row.risk_score ?? 0;
  const decision = row.decision;
  const prompt = row.maskedPrompt ?? row.masked_prompt ?? '';

  const rawDate = row.createdAt ?? row.created_at ?? new Date();
  const createdIso =
    rawDate instanceof Date
      ? rawDate.toISOString()
      : new Date(rawDate).toISOString();

  const payload = `${prev}|${action}|${cats}|${risk}|${decision}|${prompt}|${createdIso}`;
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}
