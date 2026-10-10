import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runScript(scriptPath: string) {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn('tsx', [scriptPath], { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Script ${scriptPath} failed with code ${code}`));
    });
  });
}

async function main() {
  console.log('Running all seeds...');
  await runScript('seed/p1-foundation.ts');
  console.log('All seeds completed successfully.');
}

main().catch(console.error);
