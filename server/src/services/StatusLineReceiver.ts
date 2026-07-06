import { EventEmitter } from 'events';
import type { StatusLineData } from '../types.js';

export class StatusLineReceiver extends EventEmitter {
  private data = new Map<string, StatusLineData>();

  receive(data: StatusLineData): void {
    const sessionName = data.session_name;
    if (!sessionName) return;

    this.data.set(sessionName, data);
    this.emit('status-line:update', sessionName, data);
  }

  getForSession(sessionName: string): StatusLineData | null {
    return this.data.get(sessionName) ?? null;
  }
}
