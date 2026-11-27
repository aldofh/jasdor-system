import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = spawn(process.execPath, ['server/index.mjs'], {
  cwd: root,
  stdio: 'inherit',
});
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js'], {
  cwd: root,
  stdio: 'inherit',
});

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  server.kill();
  vite.kill();
  process.exitCode = code;
}

server.on('error', (error) => {
  console.error('Gagal menjalankan API server:', error);
  stop(1);
});
vite.on('error', (error) => {
  console.error('Gagal menjalankan Vite:', error);
  stop(1);
});
server.on('exit', (code) => {
  if (!stopping) stop(code ?? 1);
});
vite.on('exit', (code) => {
  if (!stopping) stop(code ?? 1);
});
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
