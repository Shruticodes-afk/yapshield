/**
 * SERVER-ONLY MODULE
 * 
 * This file interacts directly with Supabase using the administrative Service Role key.
 * It must NEVER be imported from client components or exposed in client bundles.
 */

import { getServiceSupabase } from '@/lib/supabase';
import { VaultStore } from './store';

/**
 * VaultStore implementation backed by Supabase Postgres.
 * Table: vault
 * Columns:
 * - request_id (string)
 * - token (string)
 * - encrypted_value (string)
 * - expires_at (timestamptz / string)
 */
export class SupabaseVaultStore implements VaultStore {
  /**
   * Persists tokenized encrypted entries to the Supabase vault table.
   * Note: Raw and encrypted values are never logged.
   */
  async save(
    entries: {
      requestId: string;
      token: string;
      encryptedValue: string;
      expiresAt: Date;
    }[]
  ): Promise<void> {
    if (!entries || entries.length === 0) {
      return;
    }

    const supabase = getServiceSupabase();
    const rows = entries.map((entry) => ({
      request_id: entry.requestId,
      token: entry.token,
      encrypted_value: entry.encryptedValue,
      expires_at: entry.expiresAt.toISOString(),
    }));

    const { error } = await supabase.from('vault').insert(rows);

    if (error) {
      // Never log entry.encryptedValue or sensitive values
      throw new Error(`Failed to save vault entries: ${error.message}`);
    }
  }

  /**
   * Loads valid (unexpired) entries for a given requestId.
   */
  async load(requestId: string): Promise<{ token: string; encryptedValue: string }[]> {
    if (!requestId) {
      return [];
    }

    const supabase = getServiceSupabase();
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from('vault')
      .select('token, encrypted_value')
      .eq('request_id', requestId)
      .gt('expires_at', nowIso);

    if (error) {
      throw new Error(`Failed to load vault entries for request: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((row) => ({
      token: row.token,
      encryptedValue: row.encrypted_value,
    }));
  }

  /**
   * Deletes all vault entries associated with a requestId.
   */
  async remove(requestId: string): Promise<void> {
    if (!requestId) {
      return;
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from('vault')
      .delete()
      .eq('request_id', requestId);

    if (error) {
      throw new Error(`Failed to remove vault entries: ${error.message}`);
    }
  }

  /**
   * Purges all expired vault entries where expires_at is in the past.
   */
  async purgeExpired(): Promise<void> {
    const supabase = getServiceSupabase();
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('vault')
      .delete()
      .lt('expires_at', nowIso);

    if (error) {
      throw new Error(`Failed to purge expired vault entries: ${error.message}`);
    }
  }
}

/**
 * Helper function to purge all expired vault entries where expires_at is in the past.
 */
export async function purgeExpired(): Promise<void> {
  const store = new SupabaseVaultStore();
  await store.purgeExpired();
}

export default SupabaseVaultStore;
