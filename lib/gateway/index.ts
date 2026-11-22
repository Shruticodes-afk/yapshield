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
import { performance } from 'node:perf_hooks';
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
  GatewayTimings,
} from './types';
import {
  GatewayStage,
  isPotentiallySensitive,
  SensitiveLogContext,
} from './logger';
import { classifyGatewayError } from './errors';

export * from './types';
export * from './gemini';
export * from './logger';
export * from './rateLimit';
export * from './errors';

function round(val: number): number {
  return Math.round(val * 100) / 100;
}

function buildTimingsObject(raw: {
  validate: number;
  detect: number;
  policy: number;
  vaultSave: number;
  llm: number;
  restore: number;
  vaultRemove: number;
  auditWrites: number;
  total: number;
  attempts: number;
}): GatewayTimings {
  return {
    validate: round(raw.validate),
    detect: round(raw.detect),
    policy: round(raw.policy),
    vaultSave: round(raw.vaultSave),
    vault_save: round(raw.vaultSave),
    'vault save': round(raw.vaultSave),
    llm: round(raw.llm),
    restore: round(raw.restore),
    vaultRemove: round(raw.vaultRemove),
    vault_remove: round(raw.vaultRemove),
    'vault remove': round(raw.vaultRemove),
    auditWrites: round(raw.auditWrites),
    audit_writes: round(raw.auditWrites),
    'audit writes': round(raw.auditWrites),
    total: round(raw.total),
    attempts: raw.attempts,
  };
}

/**
 * Logs gateway errors with privacy guarantees:
 * In every catch block, calls console.error('[gateway]', ...) with the stage label.
 * If the error message could contain sensitive data, logs only error.name and the stage.
 */
export function logGatewayError(
  stage: GatewayStage,
  error: unknown,
  context?: SensitiveLogContext
): void {
  const isSensitive = isPotentiallySensitive(error, stage, context);

  if (isSensitive) {
    console.error(
      '[gateway]',
      stage,
      error instanceof Error ? error.name : 'unknown error'
    );
  } else {
    console.error(
      '[gateway]',
      stage,
      error instanceof Error
        ? error.name + ': ' + error.message
        : 'unknown error'
    );
  }
}

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
  const tStart = performance.now();
  let tValidate = 0;
  let tDetect = 0;
  let tPolicy = 0;
  let tVaultSave = 0;
  let tLlm = 0;
  let tRestore = 0;
  let tVaultRemove = 0;
  let tAuditWrites = 0;
  let answeredModel: string | undefined;
  let attemptCount = 0;

  let stage: GatewayStage = 'validate';
  let sanitizedPrompt = '';
  let hasTokenize = false;
  let requestId = '';

  try {
    // 1. Validation: non-empty string, max 20,000 characters
    stage = 'validate';
    const tValStart = performance.now();
    if (
      !input ||
      typeof input.prompt !== 'string' ||
      input.prompt.trim().length === 0 ||
      input.prompt.length > 20000
    ) {
      tValidate += performance.now() - tValStart;
      return {
        status: 'bad_input',
        message:
          'Prompt must be a non-empty string and cannot exceed 20,000 characters.',
        timings: buildTimingsObject({
          validate: tValidate,
          detect: 0,
          policy: 0,
          vaultSave: 0,
          llm: 0,
          restore: 0,
          vaultRemove: 0,
          auditWrites: 0,
          total: performance.now() - tStart,
          attempts: 0,
        }),
      };
    }

    if (input.mode !== 'preview' && input.mode !== 'send') {
      tValidate += performance.now() - tValStart;
      return {
        status: 'bad_input',
        message: "Mode must be either 'preview' or 'send'.",
        timings: buildTimingsObject({
          validate: tValidate,
          detect: 0,
          policy: 0,
          vaultSave: 0,
          llm: 0,
          restore: 0,
          vaultRemove: 0,
          auditWrites: 0,
          total: performance.now() - tStart,
          attempts: 0,
        }),
      };
    }
    tValidate += performance.now() - tValStart;

    // 2. Pick policy preset (defaults to Student)
    stage = 'policy';
    const tPolStart = performance.now();
    const policyKey = input.policyName || 'Student';
    const policy = PRESETS[policyKey] || PRESETS.Student;
    requestId = crypto.randomUUID();
    tPolicy += performance.now() - tPolStart;

    // 3. Mode: Preview
    if (input.mode === 'preview') {
      stage = 'detect';
      const tDetStart = performance.now();
      const detOptions =
        input.protectedWords && input.protectedWords.length > 0
          ? { keywords: input.protectedWords }
          : undefined;
      const detections = detectAll(input.prompt, detOptions);
      const injection = detectInjection(input.prompt);
      tDetect += performance.now() - tDetStart;

      stage = 'policy';
      const tPolEvalStart = performance.now();
      const evaluation = evaluate(detections, injection, policy);
      tPolicy += performance.now() - tPolEvalStart;

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
      stage = 'audit';
      const tAudStart = performance.now();
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
      tAuditWrites += performance.now() - tAudStart;

      const timings = buildTimingsObject({
        validate: tValidate,
        detect: tDetect,
        policy: tPolicy,
        vaultSave: 0,
        llm: 0,
        restore: 0,
        vaultRemove: 0,
        auditWrites: tAuditWrites,
        total: performance.now() - tStart,
        attempts: 0,
      });

      // Log numbers and stage names only, never prompt content
      console.log('[gateway] timings', {
        validate: timings.validate,
        detect: timings.detect,
        policy: timings.policy,
        vaultSave: timings.vaultSave,
        llm: timings.llm,
        restore: timings.restore,
        vaultRemove: timings.vaultRemove,
        auditWrites: timings.auditWrites,
        total: timings.total,
      });

      return {
        status: 'preview',
        requestId,
        decision: evaluation.decision,
        risk: evaluation.risk,
        findings,
        sanitizedPreview,
        prompt: input.prompt,
        timings,
      };
    }

    // 4. Mode: Send
    // ALWAYS re-run detection on the server (never trust client findings)
    stage = 'detect';
    const tDetStart = performance.now();
    const detOptions =
      input.protectedWords && input.protectedWords.length > 0
        ? { keywords: input.protectedWords }
        : undefined;
    const detections = detectAll(input.prompt, detOptions);
    const injection = detectInjection(input.prompt);
    tDetect += performance.now() - tDetStart;

    stage = 'policy';
    const tPolEvalStart = performance.now();
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
    }

    // Recheck decision after overrides
    const hasBlockedItem = items.some((item) => item.action === 'block');
    const injectionScore = injection?.score ?? 0;
    const injectionBlocked =
      policy.injectionThreshold !== undefined &&
      injectionScore >= policy.injectionThreshold;

    const isBlocked = hasBlockedItem || injectionBlocked;
    tPolicy += performance.now() - tPolEvalStart;

    // If blocked: return blocked status, record audit row, do NOT call LLM
    if (isBlocked) {
      stage = 'audit';
      const tAudStart = performance.now();
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
      tAuditWrites += performance.now() - tAudStart;

      const timings = buildTimingsObject({
        validate: tValidate,
        detect: tDetect,
        policy: tPolicy,
        vaultSave: 0,
        llm: 0,
        restore: 0,
        vaultRemove: 0,
        auditWrites: tAuditWrites,
        total: performance.now() - tStart,
        attempts: 0,
      });

      console.log('[gateway] timings', {
        validate: timings.validate,
        detect: timings.detect,
        policy: timings.policy,
        vaultSave: timings.vaultSave,
        llm: timings.llm,
        restore: timings.restore,
        vaultRemove: timings.vaultRemove,
        auditWrites: timings.auditWrites,
        total: timings.total,
      });

      return {
        status: 'blocked',
        reasons: evaluation.risk.reasons,
        risk: evaluation.risk,
        timings,
      };
    }

    // Check if any items need tokenization (vault storage)
    hasTokenize = items.some((item) => item.action === 'tokenize');

    // Optimization 2a: Run independent operations in parallel with Promise.all
    // (for example the audit 'override' write and the vault save)
    stage = 'vault';
    const overrideAuditPromise = (async () => {
      if (overridesAppliedCount > 0) {
        const tAudStart = performance.now();
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
        tAuditWrites += performance.now() - tAudStart;
      }
    })();

    const vaultSavePromise = (async () => {
      // Optimization 2f: If prompt has no sensitive findings requiring tokenization,
      // skip vault writes entirely!
      if (!hasTokenize) {
        const res = await applyPolicy(
          input.prompt,
          items,
          requestId,
          undefined
        );
        return res;
      }

      const tVaultStart = performance.now();
      const res = await applyPolicy(
        input.prompt,
        items,
        requestId,
        deps.vaultStore
      );
      tVaultSave += performance.now() - tVaultStart;
      return res;
    })();

    const [, policyResult] = await Promise.all([
      overrideAuditPromise,
      vaultSavePromise,
    ]);

    const { sanitized, tokenMap } = policyResult;
    sanitizedPrompt = sanitized;

    // Hard time cap: enforce an overall deadline of 25 seconds for a send request
    // using AbortController across all Gemini attempts and fallback
    const abortController = new AbortController();
    const deadlineTimer = setTimeout(() => {
      const timeoutErr = new Error(
        'Request timed out: overall deadline of 25 seconds exceeded'
      );
      timeoutErr.name = 'TimeoutError';
      abortController.abort(timeoutErr);
    }, 25000);

    let completed = false;
    try {
      // Call LLM with sanitized prompt
      stage = 'llm';
      const tLlmStart = performance.now();

      const llmCallPromise = deps.llm(sanitized, {
        signal: abortController.signal,
      });

      const abortPromise = new Promise<never>((_, reject) => {
        if (abortController.signal.aborted) {
          const timeoutErr = new Error(
            'Request timed out: overall deadline of 25 seconds exceeded'
          );
          timeoutErr.name = 'TimeoutError';
          reject(timeoutErr);
          return;
        }
        abortController.signal.addEventListener(
          'abort',
          () => {
            const timeoutErr = new Error(
              'Request timed out: overall deadline of 25 seconds exceeded'
            );
            timeoutErr.name = 'TimeoutError';
            reject(timeoutErr);
          },
          { once: true }
        );
      });

      const llmResult = await Promise.race([llmCallPromise, abortPromise]);
      tLlm = performance.now() - tLlmStart;

      let modelResponse: string;
      if (typeof llmResult === 'string') {
        modelResponse = llmResult;
        answeredModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
        attemptCount = 1;
      } else if (typeof llmResult === 'object' && llmResult !== null) {
        modelResponse = llmResult.text;
        answeredModel =
          llmResult.model || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
        attemptCount =
          typeof llmResult.attempts === 'number' ? llmResult.attempts : 1;
      } else {
        modelResponse = String(llmResult);
        answeredModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
        attemptCount = 1;
      }

      // Restore tokens in model response
      stage = 'restore';
      let restoredAnswer = modelResponse;
      if (hasTokenize) {
        const tRestoreStart = performance.now();
        restoredAnswer = await restore(
          modelResponse,
          requestId,
          deps.vaultStore
        );
        tRestore = performance.now() - tRestoreStart;
      }

      completed = true;

      const timings = buildTimingsObject({
        validate: tValidate,
        detect: tDetect,
        policy: tPolicy,
        vaultSave: tVaultSave,
        llm: tLlm,
        restore: tRestore,
        vaultRemove: tVaultRemove,
        auditWrites: tAuditWrites,
        total: performance.now() - tStart,
        attempts: attemptCount,
      });

      // Optimization 2b: Move non-critical work (the audit 'forward' write and vaultStore.remove)
      // to run after the response is sent using waitUntil from @vercel/functions with a safe fallback
      // to a normal await when it is unavailable.
      const forwardCategories = Array.from(
        new Set(items.map((i) => i.detection.type))
      );

      const backgroundTask = async () => {
        // 1. Audit 'forward' write
        const tAudStart = performance.now();
        try {
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
        } catch (auditErr) {
          logGatewayError('audit', auditErr);
        }
        const audDur = performance.now() - tAudStart;
        tAuditWrites += audDur;
        timings.auditWrites = round(tAuditWrites);
        timings.audit_writes = timings.auditWrites;
        timings['audit writes'] = timings.auditWrites;

        // 2. Vault removal cleanup
        if (hasTokenize) {
          const tRemStart = performance.now();
          try {
            await deps.vaultStore.remove(requestId);
          } catch {
            // Ignore vault removal error to avoid crashing background work
          }
          const remDur = performance.now() - tRemStart;
          tVaultRemove += remDur;
          timings.vaultRemove = round(tVaultRemove);
          timings.vault_remove = timings.vaultRemove;
          timings['vault remove'] = timings.vaultRemove;
        }

        // Log final timings (numbers and stage names only, never prompt content)
        console.log('[gateway] timings', {
          validate: timings.validate,
          detect: timings.detect,
          policy: timings.policy,
          vaultSave: timings.vaultSave,
          llm: timings.llm,
          restore: timings.restore,
          vaultRemove: timings.vaultRemove,
          auditWrites: timings.auditWrites,
          total: round(performance.now() - tStart),
          attempts: timings.attempts,
        });
      };

      let scheduled = false;
      if (deps.waitUntil && typeof deps.waitUntil === 'function') {
        try {
          deps.waitUntil(backgroundTask());
          scheduled = true;
        } catch {
          scheduled = false;
        }
      } else if (process.env.NODE_ENV !== 'test') {
        try {
          const { waitUntil } = await import('@vercel/functions');
          if (typeof waitUntil === 'function') {
            waitUntil(backgroundTask());
            scheduled = true;
          }
        } catch {
          scheduled = false;
        }
      }

      if (!scheduled) {
        // Safe fallback to normal await when waitUntil is unavailable
        await backgroundTask();
      }

      return {
        status: 'ok',
        answer: restoredAnswer,
        risk: evaluation.risk,
        sanitizedPrompt: sanitized,
        tokenMap,
        timings,
        model: answeredModel,
        attempts: attemptCount,
      };
    } finally {
      clearTimeout(deadlineTimer);
      if (!completed && hasTokenize) {
        try {
          await deps.vaultStore.remove(requestId);
        } catch {
          // Ignore vault removal error to avoid masking original failure
        }
      }
    }
  } catch (error) {
    // FAIL CLOSED: any error returns safe error status without forwarding raw prompt
    logGatewayError(stage, error, {
      prompt: input?.prompt,
      sanitized: sanitizedPrompt,
    });

    const errorInfo = classifyGatewayError(error, stage);
    console.error('[gateway]', stage, errorInfo.code);

    return {
      status: 'error',
      code: errorInfo.code,
      reason: errorInfo.reason,
      message: errorInfo.message,
      timings: buildTimingsObject({
        validate: tValidate,
        detect: tDetect,
        policy: tPolicy,
        vaultSave: tVaultSave,
        llm: tLlm,
        restore: tRestore,
        vaultRemove: tVaultRemove,
        auditWrites: tAuditWrites,
        total: performance.now() - tStart,
        attempts: attemptCount,
      }),
    };
  }
}

export default runGateway;
