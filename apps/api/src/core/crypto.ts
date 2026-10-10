import crypto from 'node:crypto';
import type { AppConfig } from './config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const VERSION_PREFIX = 'v1:';

/** Encrypt a field value with AES-256-GCM. Format: "v1:iv:tag:ciphertext" (hex). */
export function encryptField(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/** Decrypt a field value encrypted with encryptField. */
export function decryptField(ciphertext: string, key: Buffer): string {
  if (!ciphertext.startsWith(VERSION_PREFIX)) {
    throw new Error('Unknown encryption version');
  }
  const parts = ciphertext.slice(VERSION_PREFIX.length).split(':');
  if (parts.length !== 3) throw new Error('Malformed encrypted field');

  const [ivHex, tagHex, dataHex] = parts as [string, string, string];
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data) + decipher.final('utf8');
}

/** HMAC-SHA256 blind index for lookups without decryption. */
export function hmacHash(value: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

/** HMAC-SHA256 sign (e.g. for QR tokens, OTP codes). */
export function hmacSign(value: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

/** Verify an HMAC signature with timing-safe comparison. */
export function hmacVerify(value: string, signature: string, secret: string): boolean {
  const expected = hmacSign(value, secret);
  return timingSafeEqual(expected, signature);
}

/** Timing-safe string comparison. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Generate a cryptographically random token (hex). */
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/** Generate a random N-digit OTP code. */
export function randomOtp(length = 6): string {
  const max = 10 ** length;
  const num = crypto.randomInt(0, max);
  return num.toString().padStart(length, '0');
}

/** SHA-256 hash (for session tokens stored in the DB). */
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/** Parse the FIELD_ENCRYPTION_KEY from base64. */
export function parseEncryptionKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, 'base64');
  if (key.length !== 32) {
    throw new Error(`FIELD_ENCRYPTION_KEY must be 32 bytes, got ${key.length}`);
  }
  return key;
}

export interface CryptoService {
  encrypt(plaintext: string): string;
  decrypt(ciphertext: string): string;
  usnBlindIndex(usn: string): string;
  hashOtp(code: string, userId: string, purpose: string): string;
  verifyOtp(code: string, hash: string, userId: string, purpose: string): boolean;
  signQr(payload: string): string;
  verifyQr(payload: string, signature: string): boolean;
  randomToken(bytes?: number): string;
  randomOtp(length?: number): string;
  sha256(input: string): string;
  signCsrf(sessionId: string): string;
  verifyCsrf(token: string, sessionId: string): boolean;
}

export function createCryptoService(config: AppConfig): CryptoService {
  const encKey = parseEncryptionKey(config.FIELD_ENCRYPTION_KEY);

  return {
    encrypt: (plaintext) => encryptField(plaintext, encKey),
    decrypt: (ciphertext) => decryptField(ciphertext, encKey),
    usnBlindIndex: (usn) => hmacHash(usn.toUpperCase(), config.USN_HASH_SECRET),
    hashOtp: (code, userId, purpose) =>
      hmacSign(`${code}:${userId}:${purpose}`, config.OTP_SECRET),
    verifyOtp: (code, hash, userId, purpose) =>
      hmacVerify(`${code}:${userId}:${purpose}`, hash, config.OTP_SECRET),
    signQr: (payload) => hmacSign(payload, config.QR_HMAC_SECRET),
    verifyQr: (payload, signature) => hmacVerify(payload, signature, config.QR_HMAC_SECRET),
    randomToken,
    randomOtp,
    sha256,
    signCsrf: (sessionId) => hmacSign(`csrf:${sessionId}`, config.CSRF_SECRET),
    verifyCsrf: (token, sessionId) =>
      hmacVerify(`csrf:${sessionId}`, token, config.CSRF_SECRET),
  };
}
