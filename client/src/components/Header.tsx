import type { TrackedInstance } from '../types';

interface HeaderProps {
  instances: TrackedInstance[];
  waitingCount: number;
  onOpenGroupManager: () => void;
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

export function Header({ instances, waitingCount, onOpenGroupManager }: HeaderProps) {
  const idleCount = instances.filter((i) => i.status === 'idle').length;
  const busyCount = instances.filter((i) => i.status === 'busy').length;

  return (
    <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md">
      <div className="mx-auto flex items-center justify-between px-4 py-3 max-w-screen-2xl">
        {/* Left: Title */}
        <h1 className="text-lg font-bold text-gray-100">ClauDeck</h1>

        {/* Center: Stats */}
        <div className="hidden sm:flex items-center gap-2">
          <StatChip label="Total" value={instances.length} />
          <StatChip label="Idle" value={idleCount} />
          <StatChip label="Busy" value={busyCount} />
          <StatChip label="Waiting" value={waitingCount} highlight={waitingCount > 0} />
        </div>

        {/* Right: Actions */}
        <button
          onClick={onOpenGroupManager}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors"
        >
          Manage Groups
        </button>
      </div>
    </header>
  );
}
