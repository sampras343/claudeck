import { useCallback, useEffect, useRef, useState } from 'react';
import type { TrackedInstance } from '../types';
import type { useWebSocket } from './useWebSocket';

export function useInstances(ws: ReturnType<typeof useWebSocket>) {
  const [instanceMap, setInstanceMap] = useState<Map<string, TrackedInstance>>(new Map());
  const { send, subscribe } = ws;

  useEffect(() => {
    const unsubs = [
      subscribe('instances:snapshot', (msg: { instances: TrackedInstance[] }) => {
        const map = new Map<string, TrackedInstance>();
        for (const inst of msg.instances) {
          map.set(inst.sessionId, inst);
        }
        setInstanceMap(map);
      }),
      subscribe('instance:update', (msg: { instance: TrackedInstance }) => {
        setInstanceMap((prev) => {
          const next = new Map(prev);
          next.set(msg.instance.sessionId, msg.instance);
          return next;
        });
      }),
      subscribe('instance:remove', (msg: { sessionId: string }) => {
        setInstanceMap((prev) => {
          const next = new Map(prev);
          next.delete(msg.sessionId);
          return next;
        });
      }),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [subscribe]);

  const instances = Array.from(instanceMap.values());
  const waitingInstances = instances.filter((i) => i.status === 'waiting');

  const sendReply = useCallback(
    (sessionId: string, text: string) => {
      send({
        type: 'reply',
        sessionId,
        text,
        requestId: crypto.randomUUID(),
      });
    },
    [send],
  );

  const setAutoYes = useCallback(
    (sessionId: string, enabled: boolean) => {
      send({ type: 'autoyes:set', sessionId, enabled });
    },
    [send],
  );

  return { instances, waitingInstances, sendReply, setAutoYes };
}
