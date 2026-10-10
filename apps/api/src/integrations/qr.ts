import crypto from 'node:crypto';

/**
 * STUB: Replaced by Part 4
 * Signature to keep:
 * issueQrPass(registrationId: string) -> Promise<string>
 */
export async function issueQrPass(registrationId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const qrTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  
  // In the stub, we just return the hash to be stored. Part 4 will handle the actual implementation.
  return qrTokenHash;
}
