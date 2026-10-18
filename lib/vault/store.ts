/**
 * Vault Storage Interface & In-Memory Implementation
 *
 * Defines the contract for storing and retrieving tokenized secrets
 * and provides an in-memory store for development and testing.
 */

export interface VaultStoreEntry {
  requestId: string;
  token: string;
  encryptedValue: string;
  expiresAt: Date;
}

export interface VaultStore {
  save(
    entries: {
      requestId: string;
      token: string;
      encryptedValue: string;
      expiresAt: Date;
    }[]
  ): Promise<void>;

  load(requestId: string): Promise<{ token: string; encryptedValue: string }[]>;

  remove(requestId: string): Promise<void>;
}

/**
 * In-memory implementation of VaultStore suitable for testing and caching.
 */
export class InMemoryVaultStore implements VaultStore {
  private store = new Map<string, VaultStoreEntry[]>();

  async save(
    entries: {
      requestId: string;
      token: string;
      encryptedValue: string;
      expiresAt: Date;
    }[]
  ): Promise<void> {
    for (const entry of entries) {
      const existing = this.store.get(entry.requestId) || [];
      existing.push(entry);
      this.store.set(entry.requestId, existing);
    }
  }

  async load(requestId: string): Promise<{ token: string; encryptedValue: string }[]> {
    const entries = this.store.get(requestId) || [];
    const now = new Date();
    // Filter out expired items
    const valid = entries.filter((e) => e.expiresAt > now);
    return valid.map(({ token, encryptedValue }) => ({ token, encryptedValue }));
  }

  async remove(requestId: string): Promise<void> {
    this.store.delete(requestId);
  }

  clear(): void {
    this.store.clear();
  }
}
