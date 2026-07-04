import { useCallback, useEffect, useRef, useState } from 'react';
import type { Notification } from '../types';
import type { useWebSocket } from './useWebSocket';

const MAX_VISIBLE = 5;
const AUTO_DISMISS_MS = 8000;

export function useNotifications(ws: ReturnType<typeof useWebSocket>) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const { subscribe } = ws;

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const scheduleAutoDismiss = useCallback(
    (id: string) => {
      const timer = setTimeout(() => {
        dismiss(id);
      }, AUTO_DISMISS_MS);
      timersRef.current.set(id, timer);
    },
    [dismiss],
  );

  const addLocal = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp'>) => {
      const n: Notification = {
        ...notification,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };
      setNotifications((prev) => {
        const next = [n, ...prev];
        // Auto-dismiss excess notifications
        if (next.length > MAX_VISIBLE) {
          const removed = next.slice(MAX_VISIBLE);
          for (const r of removed) {
            const timer = timersRef.current.get(r.id);
            if (timer) {
              clearTimeout(timer);
              timersRef.current.delete(r.id);
            }
          }
          return next.slice(0, MAX_VISIBLE);
        }
        return next;
      });
      scheduleAutoDismiss(n.id);
    },
    [scheduleAutoDismiss],
  );

  useEffect(() => {
    const unsub = subscribe('notification', (msg: { notification: Notification }) => {
      const n = msg.notification;
      setNotifications((prev) => {
        const next = [n, ...prev];
        if (next.length > MAX_VISIBLE) {
          const removed = next.slice(MAX_VISIBLE);
          for (const r of removed) {
            const timer = timersRef.current.get(r.id);
            if (timer) {
              clearTimeout(timer);
              timersRef.current.delete(r.id);
            }
          }
          return next.slice(0, MAX_VISIBLE);
        }
        return next;
      });
      scheduleAutoDismiss(n.id);
    });

    return unsub;
  }, [subscribe, scheduleAutoDismiss]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return { notifications, dismiss, addLocal };
}
