import { Detection } from '../detectors/types';
import { InjectionDetectionResult } from '../detectors/injection';
import {
  Policy,
  PolicyDecision,
  PolicyItem,
  PolicyEvaluationResult,
} from './types';
import { computeRisk, RISK_WEIGHTS } from './risk';

export * from './types';
export * from './presets';
export * from './risk';
export * from './apply';

/**
 * Evaluates detections and prompt injection telemetry against a security policy.
 *
 * Enforces mode rules:
 * - Unknown types default to stricter of mask or block depending on mode (strict => block, balanced/lenient => mask).
 * - Strict mode upgrades mask to block for high-weight types (weight >= 70).
 * - Lenient mode downgrades mask to tokenize for low-weight types (weight <= 40).
 *
 * Decision hierarchy:
 * 1. 'block' if any item has action 'block' OR injection.score >= policy.injectionThreshold.
 * 2. 'review' if policy.reviewRequired AND (findings > 0 OR injection.score > 0).
 * 3. 'sanitize' if any sanitize actions ('mask' or 'tokenize') remain.
 * 4. 'allow' otherwise.
 *
 * Fail closed:
 * Returns 'block' with critical risk if policy is missing, null, or if evaluation throws.
 */
export function evaluate(
  detections: Detection[] = [],
  injection?: InjectionDetectionResult | null,
  policy?: Policy | null
): PolicyEvaluationResult {
  try {
    if (!policy || !policy.rules || !policy.mode) {
      return {
        decision: 'block',
        items: [],
        risk: {
          score: 100,
          level: 'critical',
          reasons: ['Policy missing or invalid: defaulting to fail-closed block'],
        },
      };
    }

    const items: PolicyItem[] = [];
    const validDetections = Array.isArray(detections) ? detections : [];

    for (const det of validDetections) {
      // 1. Resolve base action from policy rules, or default based on mode
      let action = policy.rules[det.type];

      if (!action) {
        // Unknown types default to stricter of mask or block depending on mode
        action = policy.mode === 'strict' ? 'block' : 'mask';
      }

      const weight = RISK_WEIGHTS[det.type] ?? 30;

      // 2. Mode adjustments
      if (policy.mode === 'strict') {
        // Strict mode upgrades mask to block for high-weight types (weight >= 70)
        if (action === 'mask' && weight >= 70) {
          action = 'block';
        }
      } else if (policy.mode === 'lenient') {
        // Lenient mode downgrades mask to tokenize for low-weight types (weight <= 40)
        if (action === 'mask' && weight <= 40) {
          action = 'tokenize';
        }
      }

      const reason = `Policy action '${action}' applied for detection type '${det.type}'`;

      items.push({
        detection: det,
        action,
        reason,
      });
    }

    const risk = computeRisk(validDetections, injection);
    const injectionScore = injection?.score ?? 0;

    // 3. Resolve decision
    let decision: PolicyDecision;

    const hasBlockAction = items.some((item) => item.action === 'block');
    const injectionBlocked =
      policy.injectionThreshold !== undefined &&
      injectionScore >= policy.injectionThreshold;

    if (hasBlockAction || injectionBlocked) {
      decision = 'block';
    } else if (
      policy.reviewRequired &&
      (items.length > 0 || injectionScore > 0)
    ) {
      decision = 'review';
    } else if (
      items.some(
        (item) => item.action === 'mask' || item.action === 'tokenize'
      )
    ) {
      decision = 'sanitize';
    } else {
      decision = 'allow';
    }

    return {
      decision,
      items,
      risk,
    };
  } catch {
    // Fail-closed fallback
    return {
      decision: 'block',
      items: [],
      risk: {
        score: 100,
        level: 'critical',
        reasons: ['Policy evaluation error: defaulting to fail-closed block'],
      },
    };
  }
}

export default evaluate;
