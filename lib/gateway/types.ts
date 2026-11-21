import { DetectionType } from '../detectors/types';
import { Action, RiskScore } from '../policy/types';
import { VaultStore } from '../vault/store';
import { AuditStore } from '../audit/store';

export interface GatewayOverride {
  type: DetectionType;
  start: number;
  end: number;
  action: 'allow' | 'mask' | 'tokenize';
  reason: string;
}

export interface GatewayInput {
  prompt: string;
  mode: 'preview' | 'send';
  policyName?: 'Student' | 'Developer' | 'Enterprise';
  overrides?: GatewayOverride[];
  userId?: string | null;
  protectedWords?: string[];
}

export interface GatewayTimings {
  validate: number;
  detect: number;
  policy: number;
  vaultSave: number;
  vault_save: number;
  llm: number;
  restore: number;
  vaultRemove: number;
  vault_remove: number;
  auditWrites: number;
  audit_writes: number;
  total: number;
  attempts: number;
  [key: string]: number;
}

export interface GatewayDeps {
  llm: (
    sanitizedPrompt: string
  ) => Promise<string | { text: string; model?: string; attempts?: number }>;
  vaultStore: VaultStore;
  auditStore: AuditStore;
  waitUntil?: (promise: Promise<unknown>) => void;
}

export interface GatewayFinding {
  type: DetectionType;
  start: number;
  end: number;
  confidence: number;
  action: Action;
  reason: string;
}

export type GatewayResult =
  | {
      status: 'preview';
      requestId: string;
      decision: string;
      risk: RiskScore;
      findings: GatewayFinding[];
      sanitizedPreview: string;
      prompt?: string;
      timings?: GatewayTimings;
    }
  | {
      status: 'ok';
      answer: string;
      risk: RiskScore;
      sanitizedPrompt: string;
      tokenMap: { token: string; type: string }[];
      timings?: GatewayTimings;
      model?: string;
      attempts?: number;
    }
  | {
      status: 'blocked';
      reasons: string[];
      risk: RiskScore;
      timings?: GatewayTimings;
    }
  | {
      status: 'bad_input';
      message: string;
      timings?: GatewayTimings;
    }
  | {
      status: 'error';
      message: string;
      timings?: GatewayTimings;
    };
