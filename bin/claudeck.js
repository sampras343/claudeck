#!/usr/bin/env node

import { exec } from 'child_process';
import { platform } from 'os';

const PORT = process.env.PORT || '3200';
process.env.PORT = PORT;

const openBrowser = (url) => {
  const cmd = platform() === 'darwin' ? 'open' : platform() === 'win32' ? 'start' : 'xdg-open';
  exec(`${cmd} ${url}`, () => {});
};

// Wait for the server to log its listen message, then open the browser
const origWrite = process.stdout.write.bind(process.stdout);
let opened = false;
process.stdout.write = (chunk, ...args) => {
  const text = typeof chunk === 'string' ? chunk : chunk.toString();
  if (!opened && text.includes('Server listening')) {
    opened = true;
    openBrowser(`http://localhost:${PORT}`);
  }
  return origWrite(chunk, ...args);
};

await import('../server/dist/index.js');
