import net from 'net';
import fs from 'fs';
import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import type { RosterWatcher } from '../watchers/RosterWatcher.js';
import type { TrackedInstance, InputRelayResult } from '../types.js';
import { CLAUDE_DIR } from '../config.js';
import { extractPendingPrompt } from './PromptExtractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PTY_INJECT_SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'pty-inject.py');

export class InputRelay {
  constructor(private rosterWatcher: RosterWatcher) {}

  async sendReply(instance: TrackedInstance, text: string): Promise<InputRelayResult> {
    return this.sendViaPty(instance, text);
  }

  sendSignal(pid: number, action: 'cancel' | 'stop'): InputRelayResult {
    try {
      if (action === 'cancel') {
        process.kill(pid, 'SIGINT');
      } else {
        process.kill(pid, 'SIGTERM');
      }
      return { success: true, method: 'pty' };
    } catch (err) {
      return { success: false, method: 'pty', error: (err as Error).message };
    }
  }

  private async sendViaPty(instance: TrackedInstance, text: string): Promise<InputRelayResult> {
    const prompt = extractPendingPrompt(instance.sessionId, instance.cwd);

    if (prompt.type === 'ask-user') {
      const allOptions = prompt.questions.flatMap(q => q.options);
      const idx = allOptions.findIndex(o => o.label === text);
      if (idx >= 0) {
        return this.sendPtyKeystrokes(instance.pid, 'select', idx);
      }
      return this.sendPtyKeystrokes(instance.pid, 'select-other', allOptions.length, text);
    }

    if (prompt.type === 'tool-permission') {
      if (text === 'yes') {
        return this.sendPtyKeystrokes(instance.pid, 'select', 0);
      }
      if (text === 'no') {
        const lastIdx = (prompt.options?.length ?? 3) - 1;
        return this.sendPtyKeystrokes(instance.pid, 'select', lastIdx);
      }
      if (prompt.options?.length) {
        const idx = prompt.options.findIndex(o => o.value === text);
        if (idx >= 0) {
          return this.sendPtyKeystrokes(instance.pid, 'select', idx);
        }
      }
      return this.sendPtyRaw(instance.pid, text);
    }

    // Free-text or unknown: send as typed text
    return this.sendPtyRaw(instance.pid, text);
  }

  private sendPtyRaw(pid: number, text: string): Promise<InputRelayResult> {
    return new Promise((resolve) => {
      execFile('python3', [PTY_INJECT_SCRIPT, String(pid), '--raw', text], { timeout: 5000 }, (err, stdout, stderr) => {
        if (err) {
          resolve({ success: false, method: 'pty', error: stderr.trim() || err.message });
          return;
        }
        resolve(stdout.trim().startsWith('OK') ? { success: true, method: 'pty' } : { success: false, method: 'pty', error: stdout.trim() });
      });
    });
  }

  private sendPtyKeystrokes(pid: number, mode: 'select' | 'select-other', index: number, customText?: string): Promise<InputRelayResult> {
    const args = [PTY_INJECT_SCRIPT, String(pid), '--select', String(index)];
    if (mode === 'select-other' && customText) {
      args.push('--other-text', customText);
    }
    return new Promise((resolve) => {
      execFile('python3', args, { timeout: 5000 }, (err, stdout, stderr) => {
        if (err) {
          resolve({ success: false, method: 'pty', error: stderr.trim() || err.message });
          return;
        }
        resolve(stdout.trim().startsWith('OK') ? { success: true, method: 'pty' } : { success: false, method: 'pty', error: stdout.trim() });
      });
    });
  }

  private getSupervisorPid(): number | null {
    try {
      const raw = fs.readFileSync(path.join(CLAUDE_DIR, 'daemon.status.json'), 'utf-8');
      const data = JSON.parse(raw);
      return data.supervisorPid ?? null;
    } catch {
      return null;
    }
  }

  private sendViaRendezvous(shortId: string, text: string): Promise<InputRelayResult> {
    return new Promise((resolve) => {
      const worker = this.rosterWatcher.getWorker(shortId);
      if (!worker) {
        resolve({ success: false, method: 'rendezvous', error: `No roster worker found for shortId: ${shortId}` });
        return;
      }

      const supervisorPid = this.getSupervisorPid();
      if (!supervisorPid) {
        resolve({ success: false, method: 'rendezvous', error: 'Could not read supervisor PID from daemon.status.json' });
        return;
      }

      const { rendezvousSock, rvAuth } = worker;
      const socket = new net.Socket();
      let resolved = false;

      const finish = (result: InputRelayResult) => {
        if (!resolved) {
          resolved = true;
          resolve(result);
          socket.destroy();
        }
      };

      socket.on('error', (err) => {
        finish({ success: false, method: 'rendezvous', error: `Socket error: ${err.message}` });
      });

      socket.on('data', (data) => {
        for (const line of data.toString().split('\n').filter(Boolean)) {
          try {
            const msg = JSON.parse(line);
            if (msg.type === 'reply-rejected' || msg.type === 'auth-rejected') {
              finish({ success: false, method: 'rendezvous', error: `Worker rejected: ${msg.type}` });
            }
          } catch { /* ignore */ }
        }
      });

      socket.connect(rendezvousSock, () => {
        socket.write(JSON.stringify({ proto: 1, role: 'supervisor', supervisorPid, auth: rvAuth }) + '\n');
        socket.write(JSON.stringify({ type: 'reply', text }) + '\n');
        setTimeout(() => finish({ success: true, method: 'rendezvous' }), 500);
      });

      setTimeout(() => finish({ success: false, method: 'rendezvous', error: 'Connection timeout' }), 3000);
    });
  }
}
