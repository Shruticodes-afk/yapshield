import crypto from 'node:crypto';

/**
 * Retrieves and validates the 32-byte encryption key from the VAULT_SECRET environment variable.
 * The secret must be a 64-character hexadecimal string.
 */
function getVaultKey(): Buffer {
  const secret = process.env.VAULT_SECRET;
  if (!secret) {
    throw new Error('VAULT_SECRET environment variable is missing.');
  }

  const key = Buffer.from(secret, 'hex');
  if (key.length !== 32) {
    throw new Error(
      `VAULT_SECRET must be a 64-character hex string representing exactly 32 bytes, received ${key.length} bytes.`
    );
  }

  return key;
}

/**
 * Encrypts a plaintext string using AES-256-GCM with a random 12-byte IV.
 *
 * @param plain - The plaintext string to encrypt
 * @returns Colon-separated base64 string formatted as "iv:authTag:ciphertext"
 */
export function encryptValue(plain: string): string {
  const key = getVaultKey();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
}

/**
 * Decrypts a colon-separated base64 payload ("iv:authTag:ciphertext") using AES-256-GCM.
 *
 * @param payload - The encrypted string containing IV, auth tag, and ciphertext
 * @returns The decrypted UTF-8 plaintext string
 */
export function decryptValue(payload: string): string {
  const key = getVaultKey();
  const parts = payload.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format. Expected "iv:authTag:ciphertext".');
  }

  const [ivB64, authTagB64, cipherB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(cipherB64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return decrypted.toString('utf8');
}
