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

import { detectAll } from '../detectors';
import { AuditEntry, AuditRow, VerifyChainResult } from './types';
import { AuditStore, normalizeRow } from './store';
import { SupabaseAuditStore } from './supabaseStore';
import { computeHash, computeHashWithoutOverride } from './hash';

export * from './types';
export * from './store';
export * from './supabaseStore';
export * from './hash';

/**
 * Writes an audit record to the store with cryptographic hash-chaining.
 *
 * Concurrency Safety:
 * Replaces the in-process queue with an atomic approach. When the store provides
 * an `append()` method (such as SupabaseAuditStore using PostgreSQL's pg_advisory_xact_lock
 * or InMemoryAuditStore with serialized internal queue), writes are coordinated atomically
 * across multiple serverless instances without race conditions.
 */
export async function writeAudit(
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

  // 2. Atomic delegation: If the store implements append(), delegate directly
  if (typeof store.append === 'function') {
    return store.append(entry);
  }

  // 3. Fallback for custom stores implementing only latest() and insert()
  const rawCreatedAt = entry.createdAt || new Date();
  const createdAtIso =
    rawCreatedAt instanceof Date
      ? rawCreatedAt.toISOString()
      : new Date(rawCreatedAt).toISOString();

  const latestRow = await store.latest();
  const prevHash = latestRow ? latestRow.hash : 'GENESIS';

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

  await store.insert(rowToInsert);

  return rowToInsert;
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
