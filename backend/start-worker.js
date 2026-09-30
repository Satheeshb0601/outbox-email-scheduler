#!/usr/bin/env node
/**
 * Start script that launches both backend worker and API server
 * Usage: node start-worker.js
 */
const { spawn } = require('child_process');
const path = require('path');

const workerProc = spawn('npx', ['ts-node', 'src/workers/emailWorker.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env },
});

workerProc.on('error', (err) => {
  console.error('Worker process error:', err);
});

workerProc.on('exit', (code) => {
  console.log(`Worker process exited with code ${code}`);
  if (code !== 0) {
    setTimeout(() => {
      console.log('Restarting worker...');
    }, 5000);
  }
});

process.on('SIGTERM', () => {
  workerProc.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', () => {
  workerProc.kill('SIGINT');
  process.exit(0);
});
