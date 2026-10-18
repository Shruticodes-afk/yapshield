/**
 * YapShield - Cryptographic Tamper-Evident Audit Logging
 *
 * Implements a secure SHA-256 hash-chained audit trail verifying all policy evaluations,
 * prompt sanitization decisions, overrides, and forwardings.
 *
 * Features:
 * - Immutable hash-chain: each row embeds the SHA-256 hash of the preceding row ('GENESIS' for row 1).
 * - Full chain integrity verification: verifyChain recomputes all hashes and identifies broken links.
 * - Concurrency control: in-process queue serializes parallel writes to maintain chain continuity.
 * - Defense in depth: writeAudit validates that maskedPrompt contains no raw sensitive values before recording.
 */

import crypto from 'node:crypto';
import { detectAll } from '../detectors';
import { AuditEntry, AuditRow, VerifyChainResult } from './types';
import { AuditStore, normalizeRow } from './store';
import { SupabaseAuditStore } from './supabaseStore';

export * from './types';
export * from './store';
export * from './supabaseStore';

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

// In-process serialization queue to safely serialize concurrent writes
let writeQueue: Promise<unknown> = Promise.resolve();

/**
 * Internal sequential write logic
 */
async function internalWriteAudit(
  entry: AuditEntry,
  store: AuditStore
): Promise<AuditRow> {
  // 1. Defense-in-depth: maskedPrompt must NEVER contain raw sensitive values
  const prompt = entry.maskedPrompt || '';
  const detections = detectAll(prompt);
  if (detections.length > 0) {
    const types = Array.from(new Set(detections.map((d) => d.type)));
    throw new Error(
      `Audit entry rejected: maskedPrompt contains raw sensitive data (${types.join(
        ', '
      )})`
    );
  }

  // 2. Format createdAt as ISO 8601 string
  const rawCreatedAt = entry.createdAt || new Date();
  const createdAtIso =
    rawCreatedAt instanceof Date
      ? rawCreatedAt.toISOString()
      : new Date(rawCreatedAt).toISOString();

  // 3. Determine prev_hash from the latest stored row (or 'GENESIS' for first row)
  const latestRow = await store.latest();
  const prevHash = latestRow ? latestRow.hash : 'GENESIS';

  // 4. Compute cryptographic SHA-256 hash
  const hash = computeHash({
    prevHash,
    action: entry.action,
    categories: entry.categories,
    riskScore: entry.riskScore,
    decision: entry.decision,
    maskedPrompt: prompt,
    overrideCount: entry.overrideCount ?? 0,
    createdAt: createdAtIso,
  });

  // 5. Construct and normalize new audit row
  const rowToInsert: AuditRow = normalizeRow({
    userId: entry.userId,
    action: entry.action,
    categories: entry.categories,
    riskScore: entry.riskScore,
    decision: entry.decision,
    maskedPrompt: prompt,
    overrideCount: entry.overrideCount ?? 0,
    prevHash,
    hash,
    createdAt: createdAtIso,
  });

  // 6. Persist to store
  await store.insert(rowToInsert);

  return rowToInsert;
}

/**
 * Writes an audit record to the store with cryptographic hash-chaining.
 * Concurrent calls are strictly serialized through an in-process queue.
 */
export async function writeAudit(
  entry: AuditEntry,
  store: AuditStore
): Promise<AuditRow> {
  return new Promise((resolve, reject) => {
    writeQueue = writeQueue
      .then(async () => {
        try {
          const res = await internalWriteAudit(entry, store);
          resolve(res);
        } catch (err) {
          reject(err);
        }
      })
      .catch((err) => {
        // Prevent queue lock if an uncaught failure occurs
        reject(err);
      });
  });
}

/**
 * Recomputes and validates every cryptographic hash in the audit chain in sequential order.
 *
 * Returns:
 * - valid: true if all hashes and prev_hash links match, false otherwise
 * - checked: number of rows successfully validated
 * - brokenAtId: the row id where a chain fracture or tampering was detected
 */
export async function verifyChain(store: AuditStore): Promise<VerifyChainResult> {
  const rows = await store.all();

  if (!rows || rows.length === 0) {
    return { valid: true, checked: 0 };
  }

  let expectedPrevHash = 'GENESIS';
  let checked = 0;

  for (const row of rows) {
    const rowPrevHash = row.prevHash ?? row.prev_hash;

    // 1. Verify prev_hash linkage
    if (rowPrevHash !== expectedPrevHash) {
      return {
        valid: false,
        checked,
        brokenAtId: row.id ?? checked + 1,
      };
    }

    // 2. Verify row SHA-256 hash integrity
    const hashWithOverride = computeHash(row);
    const hashWithoutOverride = computeHashWithoutOverride(row);

    const isMatch =
      row.hash === hashWithOverride || row.hash === hashWithoutOverride;

    if (!isMatch) {
      return {
        valid: false,
        checked,
        brokenAtId: row.id ?? checked + 1,
      };
    }

    // Chain intact up to this row
    checked++;
    expectedPrevHash = row.hash;
  }

  return {
    valid: true,
    checked,
  };
}

// Legacy helper for backwards compatibility
export interface AuditEvent {
  eventType: string;
  payload: Record<string, unknown>;
  timestamp?: string;
  status: 'passed' | 'blocked' | 'sanitized';
}

export async function logAuditEvent(event: AuditEvent) {
  const store = new SupabaseAuditStore();
  const entry: AuditEntry = {
    userId: null,
    action: event.status === 'blocked' ? 'block' : 'scan',
    categories: [event.eventType],
    riskScore: event.status === 'blocked' ? 100 : 0,
    decision: event.status,
    maskedPrompt: JSON.stringify(event.payload || {}),
    overrideCount: 0,
    createdAt: event.timestamp || new Date(),
  };

  try {
    const row = await writeAudit(entry, store);
    return { success: true, row };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
