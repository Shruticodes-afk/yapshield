import { AuditRow, AuditAction } from './types';

export interface AuditStore {
  latest(): Promise<AuditRow | null>;
  insert(row: AuditRow): Promise<void>;
  all(): Promise<AuditRow[]>;
}

/**
 * Normalizes an audit row to ensure both camelCase and snake_case properties
 * are cleanly populated and formatted.
 */
export function normalizeRow(
  raw: Partial<AuditRow> & Record<string, unknown>
): AuditRow {
  const prevHash = (raw.prevHash ?? raw.prev_hash ?? 'GENESIS') as string;
  const riskScore = Number(raw.riskScore ?? raw.risk_score ?? 0);
  const maskedPrompt = String(raw.maskedPrompt ?? raw.masked_prompt ?? '');
  const userId = (raw.userId ?? raw.user_id ?? null) as string | null;
  const overrideCount = Number(raw.overrideCount ?? raw.override_count ?? 0);
  const action = (raw.action as AuditAction) || 'scan';
  const decision = String(raw.decision ?? 'allow');
  const hash = String(raw.hash ?? '');
  const id = typeof raw.id === 'number' ? raw.id : undefined;

  const rawDate = (raw.createdAt ?? raw.created_at ?? new Date()) as unknown;
  const createdAt =
    rawDate instanceof Date
      ? rawDate.toISOString()
      : new Date(String(rawDate)).toISOString();

  return {
    id,
    userId,
    user_id: userId,
    action,
    categories: Array.isArray(raw.categories)
      ? (raw.categories as string[])
      : [],
    riskScore,
    risk_score: riskScore,
    decision,
    maskedPrompt,
    masked_prompt: maskedPrompt,
    overrideCount,
    override_count: overrideCount,
    prevHash,
    prev_hash: prevHash,
    hash,
    createdAt,
    created_at: createdAt,
  };
}

/**
 * In-memory implementation of AuditStore for automated testing and local execution.
 */
export class InMemoryAuditStore implements AuditStore {
  public rows: AuditRow[] = [];
  private nextId = 1;

  async latest(): Promise<AuditRow | null> {
    if (this.rows.length === 0) {
      return null;
    }
    return this.rows[this.rows.length - 1];
  }

  async insert(row: AuditRow): Promise<void> {
    const assignedId = row.id ?? this.nextId++;
    const normalized = normalizeRow({
      ...row,
      id: assignedId,
    });
    this.rows.push(normalized);
  }

  async all(): Promise<AuditRow[]> {
    return this.rows;
  }

  clear(): void {
    this.rows = [];
    this.nextId = 1;
  }
}
