import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const ownershipPath = path.join(rootDir, 'ownership.json');

try {
  const data = JSON.parse(fs.readFileSync(ownershipPath, 'utf8'));
  console.log('Ownership map loaded successfully.');
  console.log('Registered parts:', Object.keys(data.parts).join(', '));
  // A proper verifier would check modified files in git status against the globs here,
  // but for the scaffold, just validating the JSON is valid is a good start.
  process.exit(0);
} catch (e) {
  console.error('Failed to parse ownership.json:', e);
  process.exit(1);
}
