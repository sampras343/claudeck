import { useCallback, useEffect, useState } from 'react';
import type { Group } from '../types';
import type { useWebSocket } from './useWebSocket';

export function useGroups(ws: ReturnType<typeof useWebSocket>) {
  const [groupMap, setGroupMap] = useState<Map<string, Group>>(new Map());
  const { send, subscribe } = ws;

  useEffect(() => {
    const unsubs = [
      subscribe('groups:snapshot', (msg: { groups: Group[] }) => {
        const map = new Map<string, Group>();
        for (const g of msg.groups) {
          map.set(g.id, g);
        }
        setGroupMap(map);
      }),
      subscribe('group:update', (msg: { group: Group }) => {
        setGroupMap((prev) => {
          const next = new Map(prev);
          next.set(msg.group.id, msg.group);
          return next;
        });
      }),
      subscribe('group:remove', (msg: { groupId: string }) => {
        setGroupMap((prev) => {
          const next = new Map(prev);
          next.delete(msg.groupId);
          return next;
        });
      }),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [subscribe]);

  const groups = Array.from(groupMap.values());

  const createGroup = useCallback(
    (name: string) => {
      send({ type: 'group:create', name });
    },
    [send],
  );

  const updateGroup = useCallback(
    (groupId: string, updates: { name?: string; collapsed?: boolean }) => {
      send({ type: 'group:update', groupId, updates });
    },
    [send],
  );

  const deleteGroup = useCallback(
    (groupId: string) => {
      send({ type: 'group:delete', groupId });
    },
    [send],
  );

  const assignInstance = useCallback(
    (sessionId: string, groupId: string | null) => {
      send({ type: 'group:assign', sessionId, groupId });
    },
    [send],
  );

  return { groups, createGroup, updateGroup, deleteGroup, assignInstance };
}
