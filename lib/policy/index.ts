/**
 * YapShield - Policy Engine
 * Defines and evaluates security policies, guardrails, and compliance rules.
 */

export interface PolicyRule {
  id: string;
  name: string;
  enabled: boolean;
  action: 'block' | 'sanitize' | 'warn' | 'allow';
}

export async function evaluatePolicy(content: string, rules?: PolicyRule[]) {
  const activeRules = (rules || []).filter((r) => r.enabled);
  const violations: string[] = [];

  for (const rule of activeRules) {
    if (rule.action === 'block' && content.toLowerCase().includes('jailbreak')) {
      violations.push(rule.name);
    }
  }

  return {
    allowed: violations.length === 0,
    violations,
  };
}
