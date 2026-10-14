/**
 * YapShield - Audit Logging Module
 * Handles recording security events, detections, and proxy decisions.
 */

import { getServiceSupabase } from '@/lib/supabase';

export interface AuditEvent {
  eventType: string;
  payload: Record<string, unknown>;
  timestamp?: string;
  status: 'passed' | 'blocked' | 'sanitized';
}

export async function logAuditEvent(event: AuditEvent) {
  try {
    const supabase = getServiceSupabase();
    const { error } = await supabase.from('audit_logs').insert([event]);
    if (error) {
      console.warn('Supabase audit log insert notice:', error.message);
    }
    return { success: !error };
  } catch (error) {
    console.error('Failed to record audit event:', error);
    return { success: false, error };
  }
}
