import { formatTimestamp } from '../utils/formatters';
import type { Notification } from '../types';

interface ToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const borderColors: Record<Notification['type'], string> = {
  'input-needed': 'border-l-amber-500',
  'auto-approved': 'border-l-green-500',
  error: 'border-l-red-500',
  'relay-result': 'border-l-blue-500',
};

export function Toast({ notification, onDismiss }: ToastProps) {
  return (
    <div
      className={`animate-slide-in pointer-events-auto w-80 rounded-lg border border-gray-700 border-l-4 bg-gray-800 p-3 shadow-lg ${borderColors[notification.type]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-100">
            {notification.instanceName}
          </p>
          <p className="mt-0.5 text-sm text-gray-400 line-clamp-2">{notification.message}</p>
          <p className="mt-1 text-xs text-gray-500">{formatTimestamp(notification.timestamp)}</p>
        </div>
        <button
          onClick={() => onDismiss(notification.id)}
          className="flex-shrink-0 rounded p-0.5 text-gray-500 hover:bg-gray-700 hover:text-gray-300 transition-colors"
          aria-label="Dismiss notification"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ notifications, onDismiss }: ToastContainerProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-2">
      {notifications.map((n) => (
        <Toast key={n.id} notification={n} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
