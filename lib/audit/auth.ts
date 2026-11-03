import crypto from 'node:crypto';

/**
 * Validates the provided dashboard passcode against process.env.DASHBOARD_PASSCODE
 * using constant-time comparison to prevent timing side-channel attacks.
 */
export function verifyDashboardPasscode(
  providedPasscode: string | null | undefined
): boolean {
  const expectedPasscode = process.env.DASHBOARD_PASSCODE;
  if (!expectedPasscode || !providedPasscode) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedPasscode, 'utf8');
  const providedBuffer = Buffer.from(providedPasscode, 'utf8');

  // Prevent length-based timing leak by always executing timingSafeEqual
  if (expectedBuffer.length !== providedBuffer.length) {
    crypto.timingSafeEqual(expectedBuffer, expectedBuffer);
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

export default verifyDashboardPasscode;
