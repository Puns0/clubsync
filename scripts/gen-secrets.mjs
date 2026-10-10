import crypto from 'node:crypto';

console.log('--- Dev Secrets Generator ---\n');

console.log(`FIELD_ENCRYPTION_KEY=${crypto.randomBytes(32).toString('base64')}`);
console.log(`OTP_SECRET=${crypto.randomBytes(32).toString('hex')}`);
console.log(`QR_HMAC_SECRET=${crypto.randomBytes(32).toString('hex')}`);
console.log(`CSRF_SECRET=${crypto.randomBytes(32).toString('hex')}`);
console.log(`USN_HASH_SECRET=${crypto.randomBytes(32).toString('hex')}`);

console.log('\nCopy these values into your .env file.');
