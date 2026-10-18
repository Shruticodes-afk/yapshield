/**
 * SERVER-ONLY MODULE
 *
 * Backed by Supabase Postgres table: audit_logs
 * Columns:
 * - id (int8 / serial)
 * - user_id (text / uuid, nullable)
 * - action (text)
 * - categories (text[])
 * - risk_score (numeric / int4)
 * - masked_prompt (text)
 * - decision (text)
 * - prev_hash (text)
 * - hash (text)
 * - created_at (timestamptz)
 *
 * NOTE: The audit_logs table schema does not include an override_count column.
 * As instructed, overrideCount is stored in the SHA-256 hash input for chain integrity
 * and is not written to a non-existent database column.
 */

import { getServiceSupabase } from '@/lib/supabase';
import { AuditStore, normalizeRow } from './store';
import { AuditRow } from './types';

export class SupabaseAuditStore implements AuditStore {
  /**
   * Fetches the latest recorded audit log row from Supabase.
   */
  async latest(): Promise<AuditRow | null> {
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from('audit_logs')
      .select(
        'id, user_id, action, categories, risk_score, masked_prompt, decision, prev_hash, hash, created_at'
      )
      .order('id', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Failed to fetch latest audit log: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return null;
    }

    return normalizeRow(data[0]);
  }

  /**
   * Inserts an audit log entry into Supabase audit_logs table.
   * Note: override_count is intentionally omitted from the insert payload
   * as the column is not present in the database table.
   */
  async insert(row: AuditRow): Promise<void> {
    const supabase = getServiceSupabase();

    const dbRow = {
      user_id: row.userId ?? row.user_id ?? null,
      action: row.action,
      categories: Array.isArray(row.categories) ? row.categories : [],
      risk_score: row.riskScore ?? row.risk_score ?? 0,
      masked_prompt: row.maskedPrompt ?? row.masked_prompt ?? '',
      decision: row.decision,
      prev_hash: row.prevHash ?? row.prev_hash,
      hash: row.hash,
      created_at:
        row.createdAt || row.created_at || new Date().toISOString(),
    };

    const { error } = await supabase.from('audit_logs').insert([dbRow]);

    if (error) {
      throw new Error(`Failed to insert audit log entry: ${error.message}`);
    }
  }

  /**
   * Returns all audit log rows ordered by sequential insertion (id ascending).
   */
  async all(): Promise<AuditRow[]> {
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from('audit_logs')
      .select(
        'id, user_id, action, categories, risk_score, masked_prompt, decision, prev_hash, hash, created_at'
      )
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Failed to load audit log chain: ${error.message}`);
    }

    return (data || []).map(normalizeRow);
  }
}

export default SupabaseAuditStore;
