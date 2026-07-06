import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { InputRelay } from '../services/InputRelay.js';

// Minimal stub for RosterWatcher dependency (InputRelay constructor requires it)
const stubRosterWatcher = {
  getWorker: () => null,
} as any;

describe('InputRelay', () => {
  describe('sendSignal()', () => {
    let relay: InputRelay;

    beforeEach(() => {
      relay = new InputRelay(stubRosterWatcher);
    });

    it('sends SIGINT for cancel action', () => {
      const calls: Array<{ pid: number; signal: string }> = [];
      const origKill = process.kill;

      // Monkey-patch process.kill to capture calls without actually sending signals
      (process as any).kill = (pid: number, signal: string) => {
        calls.push({ pid, signal });
      };

      try {
        const result = relay.sendSignal(99999, 'cancel');
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.method, 'pty');
        assert.strictEqual(calls.length, 1);
        assert.strictEqual(calls[0].pid, 99999);
        assert.strictEqual(calls[0].signal, 'SIGINT');
      } finally {
        (process as any).kill = origKill;
      }
    });

    it('sends SIGTERM for stop action', () => {
      const calls: Array<{ pid: number; signal: string }> = [];
      const origKill = process.kill;

      (process as any).kill = (pid: number, signal: string) => {
        calls.push({ pid, signal });
      };

      try {
        const result = relay.sendSignal(99999, 'stop');
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.method, 'pty');
        assert.strictEqual(calls.length, 1);
        assert.strictEqual(calls[0].pid, 99999);
        assert.strictEqual(calls[0].signal, 'SIGTERM');
      } finally {
        (process as any).kill = origKill;
      }
    });

    it('returns error result for a dead/nonexistent pid', () => {
      // PID -1 is guaranteed to fail with ESRCH or EPERM
      const result = relay.sendSignal(-1, 'cancel');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.method, 'pty');
      assert.ok(result.error, 'expected an error message');
      assert.ok(result.error!.length > 0);
    });
  });
});
