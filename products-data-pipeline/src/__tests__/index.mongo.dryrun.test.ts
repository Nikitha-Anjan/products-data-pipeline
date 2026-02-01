import { exec } from 'child_process';
import path from 'path';

const root = path.resolve(__dirname, '../../');

function run(cmd: string, opts = {}) {
  return new Promise<{ stdout: string; stderr: string; code: number }>((resolve, reject) => {
    const p = exec(cmd, { cwd: root, ...opts }, (err, stdout, stderr) => {
      if (err && (err as any).code != null) {
        // still resolve so tests can inspect stdout/stderr
        resolve({ stdout, stderr, code: (err as any).code });
        return;
      }
      resolve({ stdout, stderr, code: 0 });
    });
    // safety: kill if it takes too long
    const to = setTimeout(() => {
      p.kill('SIGKILL');
      resolve({ stdout: '', stderr: 'timeout', code: 124 });
    }, 30000);
    p.on('close', () => clearTimeout(to));
  });
}

describe('index.ts --mongo --dry-run', () => {
  jest.setTimeout(40000);

  it('runs in dry-run mode and prints stats', async () => {
    // Run the npm script using the project npm (dev deps might not be installed in every env).
    // Use the start:mongo script which already exists. Pass --dry-run to avoid real DB calls.
    const cmd = 'npm run start:mongo -- --dry-run';
    const { stdout, stderr, code } = await run(cmd);
  // Expect process to exit 0 and to have Stats printed
  expect(code).toBe(0);
  expect(stderr).toBeFalsy();
  expect(stdout).toContain('Stats:');
  expect(stdout).toMatch(/totalRows/);
  expect(stdout).toMatch(/10002/);
  });
});
