/**
 * YapShield - Security & AI Gateway
 *
 * Implements the core secure gateway pipeline:
 * 1. Validates prompt lengths and boundaries.
 * 2. Runs comprehensive entity and prompt injection detectors.
 * 3. Evaluates against security policy presets (Student, Developer, Enterprise).
 * 4. In 'preview' mode: computes preview findings and sanitized placeholder text without writing to Vault.
 * 5. In 'send' mode: applies safe overrides, blocks violations, sanitizes via Vault AES tokenization,
 *    forwards to downstream LLM, restores tokens in the model response, and records hash-chained audit trails.
 * 6. FAILS CLOSED on any internal error without forwarding or leaking prompts.
 */

import crypto from 'node:crypto';
import { detectAll } from '../detectors';
import { detectInjection } from '../detectors/injection';
import { evaluate, applyPolicy, PRESETS, PolicyItem } from '../policy';
import { restore } from '../vault';
import { writeAudit } from '../audit';
import {
  GatewayInput,
  GatewayDeps,
  GatewayResult,
  GatewayFinding,
} from './types';

export * from './types';
export * from './gemini';

/**
 * Builds a sanitized text preview for preview mode or audit masking
 * without modifying or saving anything in the VaultStore.
 */
function buildSanitizedPreview(prompt: string, items: PolicyItem[]): string {
  if (!prompt || !items || items.length === 0) {
    return prompt;
  }

  const sortedByStart = [...items].sort(
    (a, b) => a.detection.start - b.detection.start
  );
  const valueToToken = new Map<string, string>();
  const typeCounters: Record<string, number> = {};
  const itemReplacements = new Map<PolicyItem, string | null>();

  for (const item of sortedByStart) {
    const det = item.detection;

    if (item.action === 'tokenize') {
      const key = `${det.type}:${det.value}`;
      let token = valueToToken.get(key);
      if (!token) {
        typeCounters[det.type] = (typeCounters[det.type] || 0) + 1;
        token = `[${det.type.toUpperCase()}_${typeCounters[det.type]}]`;
        valueToToken.set(key, token);
      }
      itemReplacements.set(item, token);
    } else if (item.action === 'mask') {
      itemReplacements.set(item, `[REDACTED_${det.type.toUpperCase()}]`);
    } else if (item.action === 'block') {
      itemReplacements.set(item, `[BLOCKED_${det.type.toUpperCase()}]`);
    } else {
      itemReplacements.set(item, null);
    }
  }

  const sortedForReplacement = [...items].sort(
    (a, b) => b.detection.start - a.detection.start
  );

  let preview = prompt;
  for (const item of sortedForReplacement) {
    const replacement = itemReplacements.get(item);
    if (replacement !== null && replacement !== undefined) {
      preview =
        preview.slice(0, item.detection.start) +
        replacement +
        preview.slice(item.detection.end);
    }
  }

  return preview;
}

/**
 * Core Gateway Execution Pipeline
 */
export async function runGateway(
  input: GatewayInput,
  deps: GatewayDeps
): Promise<GatewayResult> {
  try {
    // 1. Validation: non-empty string, max 20,000 characters
    if (
      !input ||
      typeof input.prompt !== 'string' ||
      input.prompt.trim().length === 0 ||
      input.prompt.length > 20000
    ) {
      return {
        status: 'bad_input',
        message:
          'Prompt must be a non-empty string and cannot exceed 20,000 characters.',
      };
    }

    if (input.mode !== 'preview' && input.mode !== 'send') {
      return {
        status: 'bad_input',
        message: "Mode must be either 'preview' or 'send'.",
      };
    }

    // 2. Pick policy preset (defaults to Student)
    const policyKey = input.policyName || 'Student';
    const policy = PRESETS[policyKey] || PRESETS.Student;

    const requestId = crypto.randomUUID();

    // 3. Mode: Preview
    if (input.mode === 'preview') {
      const detections = detectAll(input.prompt);
      const injection = detectInjection(input.prompt);
      const evaluation = evaluate(detections, injection, policy);

      const findings: GatewayFinding[] = evaluation.items.map((i) => ({
        type: i.detection.type,
        start: i.detection.start,
        end: i.detection.end,
        confidence: i.detection.confidence,
        action: i.action,
        reason: i.reason,
      }));

      // Built WITHOUT touching or writing anything to the Vault
      const sanitizedPreview = buildSanitizedPreview(
        input.prompt,
        evaluation.items
      );

      // Record audit row with action 'scan'
      const categories = Array.from(new Set(findings.map((f) => f.type)));
      await writeAudit(
        {
          userId: input.userId ?? null,
          action: 'scan',
          categories,
          riskScore: evaluation.risk.score,
          decision: evaluation.decision,
          maskedPrompt: sanitizedPreview,
          overrideCount: 0,
        },
        deps.auditStore
      );

      return {
        status: 'preview',
        requestId,
        decision: evaluation.decision,
        risk: evaluation.risk,
        findings,
        sanitizedPreview,
        prompt: input.prompt,
      };
    }

    // 4. Mode: Send
    // ALWAYS re-run detection on the server (never trust client findings)
    const detections = detectAll(input.prompt);
    const injection = detectInjection(input.prompt);
    const evaluation = evaluate(detections, injection, policy);

    const items: PolicyItem[] = [...evaluation.items];
    let overridesAppliedCount = 0;
    const appliedOverrideCategories: string[] = [];

    // Apply user overrides if present
    if (input.overrides && input.overrides.length > 0) {
      for (const override of input.overrides) {
        const matchingItem = items.find(
          (item) =>
            item.detection.type === override.type &&
            item.detection.start === override.start &&
            item.detection.end === override.end
        );

        if (matchingItem) {
          // Blocked items cannot be overridden
          if (matchingItem.action === 'block') {
            continue;
          }

          // Reason must be non-empty
          if (!override.reason || override.reason.trim().length === 0) {
            continue;
          }

          matchingItem.action = override.action;
          matchingItem.reason = `Override (${override.reason.trim()}): ${override.action}`;
          overridesAppliedCount++;
          appliedOverrideCategories.push(override.type);
        }
      }

      // Record audit row with action 'override' per override batch
      if (overridesAppliedCount > 0) {
        const overridePreview = buildSanitizedPreview(input.prompt, items);
        await writeAudit(
          {
            userId: input.userId ?? null,
            action: 'override',
            categories: Array.from(new Set(appliedOverrideCategories)),
            riskScore: evaluation.risk.score,
            decision: 'override',
            maskedPrompt: overridePreview,
            overrideCount: overridesAppliedCount,
          },
          deps.auditStore
        );
      }
    }

    // Recheck decision after overrides
    const hasBlockedItem = items.some((item) => item.action === 'block');
    const injectionScore = injection?.score ?? 0;
    const injectionBlocked =
      policy.injectionThreshold !== undefined &&
      injectionScore >= policy.injectionThreshold;

    const isBlocked = hasBlockedItem || injectionBlocked;

    // If blocked: return blocked status, record audit row, do NOT call LLM
    if (isBlocked) {
      const blockedPreview = buildSanitizedPreview(input.prompt, items);
      const blockedCategories = Array.from(
        new Set(
          items
            .filter((i) => i.action === 'block')
            .map((i) => i.detection.type)
        )
      );

      await writeAudit(
        {
          userId: input.userId ?? null,
          action: 'block',
          categories: blockedCategories,
          riskScore: evaluation.risk.score,
          decision: 'block',
          maskedPrompt: blockedPreview,
          overrideCount: overridesAppliedCount,
        },
        deps.auditStore
      );

      return {
        status: 'blocked',
        reasons: evaluation.risk.reasons,
        risk: evaluation.risk,
      };
    }

    // Otherwise: create sanitized prompt with applyPolicy
    const { sanitized, tokenMap } = await applyPolicy(
      input.prompt,
      items,
      requestId,
      deps.vaultStore
    );

    // Call LLM with sanitized prompt
    const modelResponse = await deps.llm(sanitized);

    // Restore tokens in model response
    const restoredAnswer = await restore(
      modelResponse,
      requestId,
      deps.vaultStore
    );

    // Write audit row with action 'forward'
    const forwardCategories = Array.from(
      new Set(items.map((i) => i.detection.type))
    );
    await writeAudit(
      {
        userId: input.userId ?? null,
        action: 'forward',
        categories: forwardCategories,
        riskScore: evaluation.risk.score,
        decision: evaluation.decision,
        maskedPrompt: sanitized,
        overrideCount: overridesAppliedCount,
      },
      deps.auditStore
    );

    return {
      status: 'ok',
      answer: restoredAnswer,
      risk: evaluation.risk,
      sanitizedPrompt: sanitized,
      tokenMap,
    };
  } catch {
    // FAIL CLOSED: any error returns safe error status without forwarding raw prompt
    return {
      status: 'error',
      message: 'Request blocked for safety',
    };
  }
}

export default runGateway;
