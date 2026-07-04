interface StatusBadgeProps {
  status: string;
}

const STATUS_CONFIG: Record<string, { dotClass: string; label: string; textClass: string }> = {
  idle: {
    dotClass: 'bg-gray-400',
    label: 'Idle',
    textClass: 'text-gray-400',
  },
  busy: {
    dotClass: 'bg-blue-500 animate-pulse',
    label: 'Busy',
    textClass: 'text-blue-400',
  },
  waiting: {
    dotClass: 'bg-amber-500 animate-pulse',
    label: 'Waiting',
    textClass: 'text-amber-400',
  },
};

const DEFAULT_CONFIG = {
  dotClass: 'bg-gray-500',
  label: 'Unknown',
  textClass: 'text-gray-500',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { dotClass, label, textClass } = STATUS_CONFIG[status] ?? DEFAULT_CONFIG;

  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
      <span className={`text-xs font-medium ${textClass}`}>{label}</span>
    </div>
  );
}
