import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  writeAudit,
  verifyChain,
  InMemoryAuditStore,
  AuditEntry,
} from '@/lib/audit';

describe('Audit Logging & Cryptographic Chain (/lib/audit)', () => {
  let store: InMemoryAuditStore;

  beforeEach(() => {
    store = new InMemoryAuditStore();
  });

  // ---------------------------------------------------------------------------
  // 1. Genesis Row
  // ---------------------------------------------------------------------------
  it('first row in the audit chain uses prev_hash = "GENESIS"', async () => {
    const entry: AuditEntry = {
      userId: 'usr_1',
      action: 'scan',
      categories: ['email', 'phone'],
      riskScore: 25,
      decision: 'sanitize',
      maskedPrompt: 'User [PERSON_1] sent inquiry with phone [PHONE_1]',
      overrideCount: 0,
      createdAt: new Date('2026-10-18T10:00:00.000Z'),
    };

    const row = await writeAudit(entry, store);

    expect(row.prevHash).toBe('GENESIS');
    expect(row.prev_hash).toBe('GENESIS');
    expect(row.hash).toBeDefined();
    expect(row.hash).toHaveLength(64); // SHA-256 hex string

    const result = await verifyChain(store);
    expect(result).toEqual({
      valid: true,
      checked: 1,
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Sequential Chain Verification
  // ---------------------------------------------------------------------------
  it('chain verifies correctly across multiple sequential audit entries', async () => {
    const entries: AuditEntry[] = [
      {
        userId: 'usr_1',
        action: 'scan',
        categories: ['email'],
        riskScore: 30,
        decision: 'sanitize',
        maskedPrompt: 'Inquiry with [EMAIL_1]',
        overrideCount: 0,
        createdAt: '2026-10-18T10:00:00.000Z',
      },
      {
        userId: 'usr_2',
        action: 'forward',
        categories: [],
        riskScore: 0,
        decision: 'allow',
        maskedPrompt: 'Normal message',
        overrideCount: 0,
        createdAt: '2026-10-18T10:01:00.000Z',
      },
      {
        userId: 'usr_3',
        action: 'block',
        categories: ['api_key'],
        riskScore: 90,
        decision: 'block',
        maskedPrompt: 'Blocked secret key attempt',
        overrideCount: 0,
        createdAt: '2026-10-18T10:02:00.000Z',
      },
      {
        userId: 'usr_4',
        action: 'override',
        categories: ['phone'],
        riskScore: 35,
        decision: 'allow',
        maskedPrompt: 'Override approved for [PHONE_1]',
        overrideCount: 1,
        createdAt: '2026-10-18T10:03:00.000Z',
      },
    ];

    const rows = [];
    for (const entry of entries) {
      rows.push(await writeAudit(entry, store));
    }

    // Verify linkage
    expect(rows[0].prevHash).toBe('GENESIS');
    expect(rows[1].prevHash).toBe(rows[0].hash);
    expect(rows[2].prevHash).toBe(rows[1].hash);
    expect(rows[3].prevHash).toBe(rows[2].hash);

    const verification = await verifyChain(store);
    expect(verification).toEqual({
      valid: true,
      checked: 4,
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Tamper Detection (Editing any field of any row fails at exactly that id)
  // ---------------------------------------------------------------------------
  describe('Tamper Detection across all entry fields', () => {
    async function setupFourRowChain(): Promise<InMemoryAuditStore> {
      const s = new InMemoryAuditStore();
      for (let i = 1; i <= 4; i++) {
        await writeAudit(
          {
            userId: `usr_${i}`,
            action: i === 3 ? 'block' : 'scan',
            categories: [`cat_${i}`],
            riskScore: i * 20,
            decision: i === 3 ? 'block' : 'sanitize',
            maskedPrompt: `Sanitized prompt #${i} with [TOKEN_${i}]`,
            overrideCount: i === 4 ? 2 : 0,
            createdAt: new Date(`2026-10-18T10:0${i}:00.000Z`),
          },
          s
        );
      }
      return s;
    }

    it('editing action on row 2 makes verifyChain fail at exactly id 2', async () => {
      const chainStore = await setupFourRowChain();
      const allRows = await chainStore.all();
      allRows[1].action = 'block';

      const result = await verifyChain(chainStore);
      expect(result).toEqual({
        valid: false,
        checked: 1,
        brokenAtId: 2,
      });
    });

    it('editing categories on row 2 makes verifyChain fail at exactly id 2', async () => {
      const chainStore = await setupFourRowChain();
      const allRows = await chainStore.all();
      allRows[1].categories = ['tampered_category'];

      const result = await verifyChain(chainStore);
      expect(result).toEqual({
        valid: false,
        checked: 1,
        brokenAtId: 2,
      });
    });

    it('editing riskScore on row 2 makes verifyChain fail at exactly id 2', async () => {
      const chainStore = await setupFourRowChain();
      const allRows = await chainStore.all();
      allRows[1].riskScore = 999;

      const result = await verifyChain(chainStore);
      expect(result).toEqual({
        valid: false,
        checked: 1,
        brokenAtId: 2,
      });
    });

    it('editing decision on row 2 makes verifyChain fail at exactly id 2', async () => {
      const chainStore = await setupFourRowChain();
      const allRows = await chainStore.all();
      allRows[1].decision = 'tampered_decision';

      const result = await verifyChain(chainStore);
      expect(result).toEqual({
        valid: false,
        checked: 1,
        brokenAtId: 2,
      });
    });

    it('editing maskedPrompt on row 2 makes verifyChain fail at exactly id 2', async () => {
      const chainStore = await setupFourRowChain();
      const allRows = await chainStore.all();
      allRows[1].maskedPrompt = 'Tampered prompt content';

      const result = await verifyChain(chainStore);
      expect(result).toEqual({
        valid: false,
        checked: 1,
        brokenAtId: 2,
      });
    });

    it('editing overrideCount on row 2 makes verifyChain fail at exactly id 2', async () => {
      const chainStore = await setupFourRowChain();
      const allRows = await chainStore.all();
      allRows[1].overrideCount = 88;

      const result = await verifyChain(chainStore);
      expect(result).toEqual({
        valid: false,
        checked: 1,
        brokenAtId: 2,
      });
    });

    it('editing createdAt on row 2 makes verifyChain fail at exactly id 2', async () => {
      const chainStore = await setupFourRowChain();
      const allRows = await chainStore.all();
      allRows[1].createdAt = '2019-01-01T00:00:00.000Z';

      const result = await verifyChain(chainStore);
      expect(result).toEqual({
        valid: false,
        checked: 1,
        brokenAtId: 2,
      });
    });

    it('editing prevHash on row 2 makes verifyChain fail at exactly id 2', async () => {
      const chainStore = await setupFourRowChain();
      const allRows = await chainStore.all();
      allRows[1].prevHash = 'bad_previous_hash_000000000000000000000000000000000000000000000';

      const result = await verifyChain(chainStore);
      expect(result).toEqual({
        valid: false,
        checked: 1,
        brokenAtId: 2,
      });
    });

    it('editing hash directly on row 3 makes verifyChain fail at exactly id 3', async () => {
      const chainStore = await setupFourRowChain();
      const allRows = await chainStore.all();
      allRows[2].hash = 'tampered_hash_value_11111111111111111111111111111111111111111111';

      const result = await verifyChain(chainStore);
      expect(result).toEqual({
        valid: false,
        checked: 2,
        brokenAtId: 3,
      });
    });

    it('editing field on row 1 makes verifyChain fail at exactly id 1', async () => {
      const chainStore = await setupFourRowChain();
      const allRows = await chainStore.all();
      allRows[0].riskScore = 5;

      const result = await verifyChain(chainStore);
      expect(result).toEqual({
        valid: false,
        checked: 0,
        brokenAtId: 1,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Deleting a Middle Row
  // ---------------------------------------------------------------------------
  it('deleting a middle row makes verifyChain fail at the severed link', async () => {
    // Write 4 rows
    for (let i = 1; i <= 4; i++) {
      await writeAudit(
        {
          userId: `usr_${i}`,
          action: 'scan',
          categories: [`cat_${i}`],
          riskScore: 20,
          decision: 'allow',
          maskedPrompt: `Clean prompt #${i}`,
          overrideCount: 0,
          createdAt: `2026-10-18T10:0${i}:00.000Z`,
        },
        store
      );
    }

    // Delete row 2 (index 1)
    const allRows = await store.all();
    const removed = allRows.splice(1, 1);
    expect(removed[0].id).toBe(2);

    // Row 3 (id: 3) now directly follows Row 1, but Row 3's prevHash references Row 2!
    const result = await verifyChain(store);
    expect(result).toEqual({
      valid: false,
      checked: 1,
      brokenAtId: 3,
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Defense in Depth: Rejection of Raw Sensitive Data in maskedPrompt
  // ---------------------------------------------------------------------------
  describe('Defense in Depth (Privacy Leak Rejection)', () => {
    it('maskedPrompt containing a raw email must be rejected by writeAudit', async () => {
      const leakEntry: AuditEntry = {
        userId: 'attacker_1',
        action: 'scan',
        categories: ['email'],
        riskScore: 50,
        decision: 'sanitize',
        maskedPrompt: 'Send all confidential reports to ceo@secretbank.com immediately',
        overrideCount: 0,
      };

      await expect(writeAudit(leakEntry, store)).rejects.toThrow(
        /Audit entry rejected.*sensitive data.*email/i
      );

      // Verify nothing was recorded to store
      expect(await store.all()).toHaveLength(0);
    });

    it('maskedPrompt containing a raw phone number must be rejected by writeAudit', async () => {
      const leakEntry: AuditEntry = {
        userId: 'user_1',
        action: 'scan',
        categories: ['phone'],
        riskScore: 40,
        decision: 'sanitize',
        maskedPrompt: 'Please reach me at 9876543210 regarding the claim',
        overrideCount: 0,
      };

      await expect(writeAudit(leakEntry, store)).rejects.toThrow(
        /Audit entry rejected.*sensitive data.*phone/i
      );
    });

    it('maskedPrompt containing a raw OpenAI API key must be rejected by writeAudit', async () => {
      const leakEntry: AuditEntry = {
        userId: 'user_dev',
        action: 'block',
        categories: ['api_key'],
        riskScore: 100,
        decision: 'block',
        maskedPrompt: 'key=' + ['sk', '-'].join('') + '1234567890abcdef1234567890abcdef',
        overrideCount: 0,
      };

      await expect(writeAudit(leakEntry, store)).rejects.toThrow(
        /Audit entry rejected.*sensitive data/i
      );
    });

    it('maskedPrompt with proper tokens ([EMAIL_1], [PHONE_1]) is accepted', async () => {
      const validEntry: AuditEntry = {
        userId: 'user_1',
        action: 'scan',
        categories: ['email', 'phone'],
        riskScore: 35,
        decision: 'sanitize',
        maskedPrompt: 'Contact [PERSON_1] at [EMAIL_1] or [PHONE_1].',
        overrideCount: 0,
      };

      await expect(writeAudit(validEntry, store)).resolves.toBeDefined();
      expect(await store.all()).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Concurrency Serialization
  // ---------------------------------------------------------------------------
  it('safely serializes concurrent writes preserving chain integrity', async () => {
    const concurrentCount = 10;
    const writePromises = [];

    for (let i = 0; i < concurrentCount; i++) {
      writePromises.push(
        writeAudit(
          {
            userId: `concurrent_user_${i}`,
            action: 'scan',
            categories: ['test'],
            riskScore: i * 5,
            decision: 'allow',
            maskedPrompt: `Concurrent prompt ${i}`,
            overrideCount: 0,
            createdAt: new Date(Date.now() + i * 1000),
          },
          store
        )
      );
    }

    const writtenRows = await Promise.all(writePromises);
    expect(writtenRows).toHaveLength(concurrentCount);

    const verification = await verifyChain(store);
    expect(verification).toEqual({
      valid: true,
      checked: concurrentCount,
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Atomic Store Append & Fallback Paths
  // ---------------------------------------------------------------------------
  describe('Atomic store.append and custom store fallback', () => {
    it('uses fallback latest + insert if store does not implement append', async () => {
      const rows: any[] = [];
      const legacyStore = {
        latest: vi.fn(async () => (rows.length > 0 ? rows[rows.length - 1] : null)),
        insert: vi.fn(async (row) => {
          rows.push(row);
        }),
        all: vi.fn(async () => rows),
      };

      const entry: AuditEntry = {
        userId: 'usr_legacy',
        action: 'scan',
        categories: ['email'],
        riskScore: 10,
        decision: 'allow',
        maskedPrompt: 'Hello [EMAIL_1]',
        overrideCount: 0,
      };

      const res = await writeAudit(entry, legacyStore);
      expect(legacyStore.latest).toHaveBeenCalled();
      expect(legacyStore.insert).toHaveBeenCalled();
      expect(res.prevHash).toBe('GENESIS');
      expect(rows).toHaveLength(1);
    });

    it('SupabaseAuditStore calls audit_append RPC and normalizes returned row', async () => {
      const { SupabaseAuditStore } = await import('@/lib/audit/supabaseStore');
      const supabaseModule = await import('@/lib/supabase');

      const mockRpc = vi.fn().mockResolvedValue({
        data: {
          id: 42,
          user_id: 'usr_rpc',
          action: 'scan',
          categories: ['email'],
          risk_score: 20,
          masked_prompt: 'Sanitized [EMAIL_1]',
          decision: 'sanitize',
          prev_hash: 'GENESIS',
          hash: 'abc123hash',
          created_at: '2026-10-18T10:00:00.000Z',
        },
        error: null,
      });

      const mockSupabase = {
        rpc: mockRpc,
      };

      const spy = vi
        .spyOn(supabaseModule, 'getServiceSupabase')
        .mockReturnValue(mockSupabase as any);

      try {
        const store = new SupabaseAuditStore();
        const row = await store.append({
          userId: 'usr_rpc',
          action: 'scan',
          categories: ['email'],
          riskScore: 20,
          decision: 'sanitize',
          maskedPrompt: 'Sanitized [EMAIL_1]',
          overrideCount: 2,
          createdAt: '2026-10-18T10:00:00.000Z',
        });

        expect(mockRpc).toHaveBeenCalledWith('audit_append', {
          p_action: 'scan',
          p_decision: 'sanitize',
          p_masked_prompt: 'Sanitized [EMAIL_1]',
          p_risk_score: 20,
          p_categories: ['email'],
          p_user_id: 'usr_rpc',
          p_override_count: 2,
          p_created_at: '2026-10-18T10:00:00.000Z',
        });
        expect(row.id).toBe(42);
        expect(row.hash).toBe('abc123hash');
        expect(row.overrideCount).toBe(2);
      } finally {
        spy.mockRestore();
      }
    });

    it('SupabaseAuditStore falls back gracefully when audit_append RPC is not found (code 42883)', async () => {
      const { SupabaseAuditStore } = await import('@/lib/audit/supabaseStore');
      const supabaseModule = await import('@/lib/supabase');

      const insertedRows: any[] = [];
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { code: '42883', message: 'function audit_append does not exist' },
      });

      const mockSupabase = {
        rpc: mockRpc,
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
          insert: vi.fn((rows: any[]) => {
            insertedRows.push(...rows);
            return Promise.resolve({ error: null });
          }),
        })),
      };

      const spy = vi
        .spyOn(supabaseModule, 'getServiceSupabase')
        .mockReturnValue(mockSupabase as any);

      try {
        const store = new SupabaseAuditStore();
        const row = await store.append({
          userId: 'usr_fallback',
          action: 'scan',
          categories: ['phone'],
          riskScore: 15,
          decision: 'allow',
          maskedPrompt: 'Clean text',
          overrideCount: 0,
        });

        expect(mockRpc).toHaveBeenCalled();
        expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
        expect(row.prevHash).toBe('GENESIS');
        expect(row.hash).toBeDefined();
        expect(insertedRows).toHaveLength(1);
      } finally {
        spy.mockRestore();
      }
    });
  });
});
