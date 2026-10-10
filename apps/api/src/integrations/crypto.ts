/**
 * STUB: Replaced by Part 2
 * Signature to keep:
 * encryptField(text: string) -> string
 * decryptField(hash: string) -> string
 */
export function encryptField(text: string): string {
  // Simple base64 encoding for the stub
  return Buffer.from(text).toString('base64');
}

export function decryptField(encrypted: string): string {
  return Buffer.from(encrypted, 'base64').toString('ascii');
}
