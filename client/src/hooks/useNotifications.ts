import { useCallback, useEffect, useRef, useState } from 'react';
import type { Notification } from '../types';
import type { useWebSocket } from './useWebSocket';

const MAX_VISIBLE = 5;
const MAX_HISTORY = 100;
const AUTO_DISMISS_MS = 8000;

export function useNotifications(ws: ReturnType<typeof useWebSocket>) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [history, setHistory] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const { subscribe } = ws;

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const playSound = useCallback((type: Notification['type']) => {
    if (muted) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.1;
      // Different frequencies for different types
      const freqs: Record<string, number> = {
        'input-needed': 880,
        'auto-approved': 440,
        'error': 220,
        'relay-result': 660,
      };
      osc.frequency.value = freqs[type] || 440;
      osc.type = 'sine';
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    } catch {
      // Audio not available
    }
  }, [muted]);

  const toggleMute = useCallback(() => {
    setMuted(prev => !prev);
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setUnreadCount(0);
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

      // Add to history
      setHistory((prev) => [n, ...prev].slice(0, MAX_HISTORY));
      setUnreadCount((prev) => prev + 1);
      playSound(n.type);

      // Show browser notification if window is not focused
      if ('Notification' in window && Notification.permission === 'granted' && !document.hasFocus()) {
        new window.Notification(`ClauPilot: ${n.instanceName}`, {
          body: n.message,
          tag: n.id,
        });
      }
    });

    return unsub;
  }, [subscribe, scheduleAutoDismiss, playSound]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return { notifications, history, unreadCount, muted, dismiss, addLocal, toggleMute, markAllRead, clearHistory };
}
