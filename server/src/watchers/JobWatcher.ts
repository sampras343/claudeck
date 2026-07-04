import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import chokidar, { type FSWatcher } from 'chokidar';
import { JOBS_DIR } from '../config.js';
import type { JobState } from '../types.js';

export class JobWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;

  start(): void {
    // Ensure directory exists before watching
    if (!fs.existsSync(JOBS_DIR)) {
      fs.mkdirSync(JOBS_DIR, { recursive: true });
    }

    this.watcher = chokidar.watch(JOBS_DIR, {
      persistent: true,
      ignoreInitial: false,
      depth: 1,
    });

    this.watcher.on('add', (filePath: string) => {
      if (path.basename(filePath) === 'state.json') this.handleFile(filePath);
    });
    this.watcher.on('change', (filePath: string) => {
      if (path.basename(filePath) === 'state.json') this.handleFile(filePath);
    });
    this.watcher.on('unlink', (filePath: string) => {
      if (path.basename(filePath) === 'state.json') this.handleUnlink(filePath);
    });
    this.watcher.on('error', (err: unknown) => {
      console.error('[JobWatcher] error:', err instanceof Error ? err.message : err);
    });
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  private extractJobId(filePath: string): string | null {
    // Path pattern: ~/.claude/jobs/<jobId>/state.json
    const dir = path.dirname(filePath);
    const jobId = path.basename(dir);
    return jobId || null;
  }

  private handleFile(filePath: string): void {
    const jobId = this.extractJobId(filePath);
    if (!jobId) return;

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data: JobState = JSON.parse(raw);
      this.emit('job:update', jobId, data);
    } catch {
      // File may be partially written; ignore parse errors
    }
  }

  private handleUnlink(filePath: string): void {
    const jobId = this.extractJobId(filePath);
    if (!jobId) return;
    this.emit('job:remove', jobId);
  }
}
