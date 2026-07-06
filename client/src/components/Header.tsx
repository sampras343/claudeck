import type { TrackedInstance } from '../types';
import { SearchBar } from './SearchBar';

interface HeaderProps {
  instances: TrackedInstance[];
  waitingCount: number;
  onOpenGroupManager: () => void;
  unreadCount: number;
  muted: boolean;
  onOpenNotifications: () => void;
  onToggleMute: () => void;
}

function StatChip({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${
        highlight
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
          : 'border-gray-700 bg-gray-800/50 text-gray-300'
      }`}
    >
      <span className="font-medium">{value}</span>
      <span className={highlight ? 'text-amber-400/70' : 'text-gray-500'}>{label}</span>
    </div>
  );
}

export function Header({ instances, waitingCount, onOpenGroupManager, unreadCount, muted, onOpenNotifications, onToggleMute }: HeaderProps) {
  const idleCount = instances.filter((i) => i.status === 'idle').length;
  const busyCount = instances.filter((i) => i.status === 'busy').length;

  return (
    <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md">
      <div className="mx-auto flex items-center justify-between px-4 py-3 max-w-screen-2xl">
        {/* Left: Title */}
        <h1 className="text-lg font-bold text-gray-100">ClauPilot</h1>

        {/* Center: Search + Stats */}
        <div className="hidden sm:flex items-center gap-4 flex-1 mx-4 justify-center">
          <SearchBar />
          <div className="flex items-center gap-2">
            <StatChip label="Total" value={instances.length} />
            <StatChip label="Idle" value={idleCount} />
            <StatChip label="Busy" value={busyCount} />
            <StatChip label="Waiting" value={waitingCount} highlight={waitingCount > 0} />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Mute toggle */}
          <button
            onClick={onToggleMute}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
            aria-label={muted ? 'Unmute notifications' : 'Mute notifications'}
            title={muted ? 'Unmute notifications' : 'Mute notifications'}
          >
            {muted ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>

          {/* Bell icon with unread badge */}
          <button
            onClick={onOpenNotifications}
            className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
            aria-label="Open notifications"
            title="Notifications"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Manage Groups */}
          <button
            onClick={onOpenGroupManager}
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors"
          >
            Manage Groups
          </button>
        </div>
      </div>
    </header>
  );
}
