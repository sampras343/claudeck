import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StatusLineReceiver } from '../services/StatusLineReceiver.js';
import type { StatusLineData } from '../types.js';

describe('StatusLineReceiver', () => {
  describe('receive()', () => {
    it('stores data retrievable by session name', () => {
      const receiver = new StatusLineReceiver();
      const data: StatusLineData = {
        session_name: 'test-session',
        model: { display_name: 'claude-sonnet' },
      };

      receiver.receive(data);

      const stored = receiver.getForSession('test-session');
      assert.deepStrictEqual(stored, data);
    });

    it('emits status-line:update event with session name and data', () => {
      const receiver = new StatusLineReceiver();
      const data: StatusLineData = {
        session_name: 'my-session',
        context_window: { remaining_percentage: 85 },
      };

      let emittedName: string | undefined;
      let emittedData: StatusLineData | undefined;

      receiver.on('status-line:update', (name: string, d: StatusLineData) => {
        emittedName = name;
        emittedData = d;
      });

      receiver.receive(data);

      assert.strictEqual(emittedName, 'my-session');
      assert.deepStrictEqual(emittedData, data);
    });

    it('ignores data without session_name', () => {
      const receiver = new StatusLineReceiver();
      const data: StatusLineData = {
        model: { display_name: 'claude-opus' },
      };

      let eventFired = false;
      receiver.on('status-line:update', () => {
        eventFired = true;
      });

      receiver.receive(data);
      assert.strictEqual(eventFired, false);
    });

    it('overwrites previous data for the same session name', () => {
      const receiver = new StatusLineReceiver();
      const data1: StatusLineData = {
        session_name: 'sess-1',
        context_window: { remaining_percentage: 90 },
      };
      const data2: StatusLineData = {
        session_name: 'sess-1',
        context_window: { remaining_percentage: 42 },
      };

      receiver.receive(data1);
      receiver.receive(data2);

      const stored = receiver.getForSession('sess-1');
      assert.deepStrictEqual(stored, data2);
    });
  });

  describe('getForSession()', () => {
    it('returns stored data for a known session', () => {
      const receiver = new StatusLineReceiver();
      const data: StatusLineData = {
        session_name: 'known-session',
        pr: { number: 42, review_state: 'approved' },
      };

      receiver.receive(data);
      const result = receiver.getForSession('known-session');
      assert.notStrictEqual(result, null);
      assert.strictEqual(result!.pr?.number, 42);
    });

    it('returns null for unknown session', () => {
      const receiver = new StatusLineReceiver();
      const result = receiver.getForSession('nonexistent');
      assert.strictEqual(result, null);
    });
  });
});
