import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// 同时启动 vite 前端开发服务器和后端
const client = spawn('vite', [], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: 'true' },
});

const server = spawn('tsx', ['watch', 'server/dev.ts'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: 'true', PORT: '8788' },
});

let shuttingDown = false;
const cleanup = (exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  client.kill();
  server.kill();
  process.exitCode = exitCode;
};

for (const child of [client, server]) {
  child.once('error', (error) => {
    console.error('[dev] Failed to start service:', error.message);
    cleanup(1);
  });
  child.once('exit', (code) => cleanup(code || 1));
}

process.once('SIGINT', () => cleanup(0));
process.once('SIGTERM', () => cleanup(0));
process.once('exit', () => {
  client.kill();
  server.kill();
});
