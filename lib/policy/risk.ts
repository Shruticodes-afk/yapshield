import { Detection, DetectionType } from '../detectors/types';
import { InjectionDetectionResult } from '../detectors/injection';
import { RiskScore } from './types';

/**
 * Base security risk weight per entity type (0 - 100).
 */
export const RISK_WEIGHTS: Record<DetectionType, number> = {
  private_key: 100,
  api_key: 90,
  credit_card: 85,
  aadhaar: 85,
  jwt: 80,
  high_entropy_secret: 70,
  pan: 70,
  upi: 50,
  ifsc: 40,
  phone: 35,
  email: 30,
  person: 25,
  keyword: 40,
};

const TYPE_NAMES: Record<DetectionType, string> = {
  aadhaar: 'Aadhaar number',
  credit_card: 'Credit card number',
  api_key: 'API key',
  jwt: 'JSON Web Token',
  private_key: 'Private key',
  upi: 'UPI ID',
  pan: 'PAN card number',
  ifsc: 'IFSC code',
  phone: 'Phone number',
  email: 'Email address',
  high_entropy_secret: 'High-entropy secret',
  person: 'Person name',
  keyword: 'Confidential keyword',
};

/**
 * Computes an overall composite risk score based on detected sensitive entities
 * and prompt injection telemetry.
 *
 * NOTE: Reasons must NEVER contain raw sensitive values.
 */
export function computeRisk(
  detections: Detection[] = [],
  injection?: InjectionDetectionResult | null
): RiskScore {
  const reasons: string[] = [];

  // 1. Calculate weighted item risks scaled by confidence
  const itemScores = (detections || []).map((d) => {
    const baseWeight = RISK_WEIGHTS[d.type] ?? 30;
    return baseWeight * (d.confidence ?? 1.0);
  });

  itemScores.sort((a, b) => b - a);

  let detectionRisk = 0;
  if (itemScores.length > 0) {
    detectionRisk = itemScores[0];
    for (let i = 1; i < itemScores.length; i++) {
      detectionRisk += itemScores[i] * 0.2;
    }
  }

  // 2. Count findings by type for reasons
  const typeCounts = new Map<DetectionType, number>();
  for (const d of detections || []) {
    typeCounts.set(d.type, (typeCounts.get(d.type) || 0) + 1);
  }

  typeCounts.forEach((count, type) => {
    const label = TYPE_NAMES[type] || type;
    reasons.push(`${label} found (${count})`);
  });

  // 3. Integrate prompt injection risks
  const injectionScore = injection?.score || 0;
  let totalRisk = detectionRisk;

  if (injectionScore > 0) {
    totalRisk =
      Math.max(totalRisk, injectionScore) +
      (totalRisk > 0 ? Math.min(totalRisk, injectionScore) * 0.25 : 0);

    if (injection?.matches && injection.matches.length > 0) {
      const distinctCategories = Array.from(
        new Set(injection.matches.map((m) => m.category))
      );
      for (const cat of distinctCategories) {
        const readableCat = cat.replace(/_/g, ' ');
        reasons.push(`Possible prompt injection: ${readableCat}`);
      }
    } else {
      reasons.push(`Possible prompt injection detected (score: ${injectionScore})`);
    }
  }

  const score = Math.min(100, Math.max(0, Math.round(totalRisk)));

  let level: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (score >= 85) {
    level = 'critical';
  } else if (score >= 60) {
    level = 'high';
  } else if (score >= 30) {
    level = 'medium';
  }

  return {
    score,
    level,
    reasons,
  };
}

export default computeRisk;
