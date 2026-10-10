import crypto from 'node:crypto';

export function encryptField(text: string): string {
  const keyBase64 = process.env.FIELD_ENCRYPTION_KEY;
  if (!keyBase64) throw new Error('Missing FIELD_ENCRYPTION_KEY');
  const key = Buffer.from(keyBase64, 'base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const tag = cipher.getAuthTag();
  
  return `${iv.toString('base64')}:${encrypted}:${tag.toString('base64')}`;
}

export function decryptField(encryptedStr: string): string {
  const keyBase64 = process.env.FIELD_ENCRYPTION_KEY;
  if (!keyBase64) throw new Error('Missing FIELD_ENCRYPTION_KEY');
  const key = Buffer.from(keyBase64, 'base64');
  
  const [ivBase64, ciphertext, tagBase64] = encryptedStr.split(':');
  const iv = Buffer.from(ivBase64, 'base64');
  const tag = Buffer.from(tagBase64, 'base64');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
