export type AuditAction = 'scan' | 'forward' | 'block' | 'override';

export interface AuditEntry {
  userId: string | null;
  action: AuditAction;
  categories: string[];
  riskScore: number;
  decision: string;
  maskedPrompt: string;
  overrideCount: number;
  createdAt?: Date | string;
}

export interface AuditRow {
  id?: number;
  userId: string | null;
  action: AuditAction;
  categories: string[];
  riskScore: number;
  decision: string;
  maskedPrompt: string;
  overrideCount: number;
  prevHash: string;
  hash: string;
  createdAt: string;

  // DB column compatibility aliases
  user_id?: string | null;
  risk_score?: number;
  masked_prompt?: string;
  prev_hash?: string;
  created_at?: string;
  override_count?: number;
}

export interface VerifyChainResult {
  valid: boolean;
  checked: number;
  brokenAtId?: number;
}
