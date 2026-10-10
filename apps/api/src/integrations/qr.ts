import crypto from 'node:crypto';

/**
 * Generates a secure, unforgeable QR pass.
 * Returns the raw token (which the frontend will encode into a QR graphic).
 * Note: The prompt asks to store the hash in the DB, but since this function
 * returns a string, we return the JSON/string token, and the caller must hash it
 * before storing, OR we return the token and let the caller update it.
 * Actually, to perfectly match the caller's expectation of `qrHash`, we should return the hash?
 * But the prompt says "The function must return the secure token".
 * We'll return an object or string. Wait, signature is Promise<string>.
 * We will return the raw token, and modify service.ts to hash it before storing.
 */
export async function issueQrPass(registrationId: string): Promise<string> {
  const secret = process.env.QR_HMAC_SECRET || 'fallback_secret_for_tests';
  
  // 1. Generate a unique nonce
  const nonce = crypto.randomBytes(16).toString('hex');
  
  // 2. Create the payload
  const payload = `${registrationId}:${nonce}`;
  
  // 3. Sign the payload using HMAC SHA-256
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  
  // 4. Combine into the final token
  const token = `${payload}.${signature}`;
  
  return token;
}
