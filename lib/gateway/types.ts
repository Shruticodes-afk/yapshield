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
}

export interface GatewayDeps {
  llm: (sanitizedPrompt: string) => Promise<string>;
  vaultStore: VaultStore;
  auditStore: AuditStore;
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
    }
  | {
      status: 'ok';
      answer: string;
      risk: RiskScore;
      sanitizedPrompt: string;
      tokenMap: { token: string; type: string }[];
    }
  | {
      status: 'blocked';
      reasons: string[];
      risk: RiskScore;
    }
  | {
      status: 'bad_input';
      message: string;
    }
  | {
      status: 'error';
      message: string;
    };
