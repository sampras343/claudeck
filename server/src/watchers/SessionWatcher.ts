import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import chokidar, { type FSWatcher } from 'chokidar';
import { SESSIONS_DIR } from '../config.js';
import type { SessionEntry } from '../types.js';

export class SessionWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;

  start(): void {
    // Ensure directory exists before watching
    if (!fs.existsSync(SESSIONS_DIR)) {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    }

    this.watcher = chokidar.watch(SESSIONS_DIR, {
      persistent: true,
      ignoreInitial: false,
      depth: 0,
    });

    this.watcher.on('add', (filePath: string) => {
      if (filePath.endsWith('.json')) this.handleFile(filePath);
    });
    this.watcher.on('change', (filePath: string) => {
      if (filePath.endsWith('.json')) this.handleFile(filePath);
    });
    this.watcher.on('unlink', (filePath: string) => {
      if (filePath.endsWith('.json')) this.handleUnlink(filePath);
    });
    this.watcher.on('error', (err: unknown) => {
      console.error('[SessionWatcher] error:', err instanceof Error ? err.message : err);
    });
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  private extractPid(filePath: string): number | null {
    const basename = path.basename(filePath, '.json');
    const pid = parseInt(basename, 10);
    return isNaN(pid) ? null : pid;
  }

  private handleFile(filePath: string): void {
    const pid = this.extractPid(filePath);
    if (pid === null) return;

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data: SessionEntry = JSON.parse(raw);
      this.emit('session:update', pid, data);
    } catch {
      // File may be partially written; ignore parse errors
    }
  }

  private handleUnlink(filePath: string): void {
    const pid = this.extractPid(filePath);
    if (pid === null) return;
    this.emit('session:remove', pid);
  }
}
