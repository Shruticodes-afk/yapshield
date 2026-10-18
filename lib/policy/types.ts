import { Detection, DetectionType } from '../detectors/types';

export type Action = 'allow' | 'mask' | 'tokenize' | 'block';

export type Mode = 'strict' | 'balanced' | 'lenient';

export interface Policy {
  name: string;
  mode: Mode;
  rules: Partial<Record<DetectionType, Action>>;
  injectionThreshold: number;
  reviewRequired: boolean;
  keywords?: string[];
}

export type PolicyDecision = 'allow' | 'sanitize' | 'review' | 'block';

export interface PolicyItem {
  detection: Detection;
  action: Action;
  reason: string;
}

export interface RiskScore {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
}

export interface PolicyEvaluationResult {
  decision: PolicyDecision;
  items: PolicyItem[];
  risk: RiskScore;
}

export interface ApplyPolicyResult {
  sanitized: string;
  tokenMap: { token: string; type: string }[];
}
