interface AutoYesToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function AutoYesToggle({ enabled, onChange }: AutoYesToggleProps) {
  return (
    <button
      type="button"
      className="flex items-center gap-2"
      onClick={() => onChange(!enabled)}
      aria-pressed={enabled}
      aria-label="Toggle auto-yes"
    >
      <div
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          enabled ? 'bg-green-600' : 'bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-4.5' : 'translate-x-0.5'
          }`}
        />
      </div>
      <span className="text-xs text-gray-400">Auto-Yes</span>
    </button>
  );
}
