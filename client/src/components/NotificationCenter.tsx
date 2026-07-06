import { useEffect, useState } from 'react';
import type { Notification } from '../types';
import { formatTimestamp } from '../utils/formatters';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  history: Notification[];
  onClearAll: () => void;
}

type FilterType = 'all' | 'input-needed' | 'auto-approved' | 'error';

const borderColors: Record<Notification['type'], string> = {
  'input-needed': 'border-l-amber-500',
  'auto-approved': 'border-l-green-500',
  error: 'border-l-red-500',
  'relay-result': 'border-l-blue-500',
};

const filterLabels: Record<FilterType, string> = {
  all: 'All',
  'input-needed': 'Input Needed',
  'auto-approved': 'Auto-approved',
  error: 'Errors',
};

export function NotificationCenter({ isOpen, onClose, history, onClearAll }: NotificationCenterProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = filter === 'all'
    ? history
    : history.filter((n) => n.type === filter);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 z-50 flex h-full w-96 flex-col border-l border-gray-800 bg-gray-900 shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-4">
          <h2 className="text-lg font-semibold text-gray-100">Notifications</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onClearAll}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
            >
              Clear all
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors"
              aria-label="Close panel"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-1 border-b border-gray-800 px-4 py-2">
          {(Object.keys(filterLabels) as FilterType[]).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === key
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
              }`}
            >
              {filterLabels[key]}
            </button>
          ))}
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-auto px-4 py-3">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">No notifications</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-lg border border-gray-800 border-l-4 bg-gray-800/50 px-3 py-2.5 ${borderColors[n.type]}`}
                >
                  <p className="text-sm font-medium text-gray-200 truncate">{n.instanceName}</p>
                  <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatTimestamp(n.timestamp)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
