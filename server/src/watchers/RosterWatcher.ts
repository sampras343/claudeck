import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import chokidar, { type FSWatcher } from 'chokidar';
import { ROSTER_PATH } from '../config.js';
import type { RosterData, RosterWorker } from '../types.js';

export class RosterWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private data: RosterData | null = null;

  start(): void {
    const dir = path.dirname(ROSTER_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Try to read existing roster on start
    this.readRoster();

    this.watcher = chokidar.watch(ROSTER_PATH, {
      persistent: true,
      ignoreInitial: false,
    });

    this.watcher.on('add', () => this.handleChange());
    this.watcher.on('change', () => this.handleChange());
    this.watcher.on('error', (err: unknown) => {
      console.error('[RosterWatcher] error:', err instanceof Error ? err.message : err);
    });
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  getData(): RosterData | null {
    return this.data;
  }

  getWorker(shortId: string): RosterWorker | null {
    if (!this.data) return null;
    return this.data.workers[shortId] ?? null;
  }

  private readRoster(): void {
    try {
      if (!fs.existsSync(ROSTER_PATH)) return;
      const raw = fs.readFileSync(ROSTER_PATH, 'utf-8');
      this.data = JSON.parse(raw);
    } catch {
      // File may not exist or be partially written
    }
  }

  private handleChange(): void {
    try {
      const raw = fs.readFileSync(ROSTER_PATH, 'utf-8');
      const parsed: RosterData = JSON.parse(raw);
      this.data = parsed;
      this.emit('roster:update', parsed);
    } catch {
      // File may be partially written; ignore parse errors
    }
  }
}
