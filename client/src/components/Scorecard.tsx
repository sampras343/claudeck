import type { TrackedInstance } from '../types';
import { abbreviatePath, formatUptime, formatTokens } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';
import { AutoYesToggle } from './AutoYesToggle';

interface ScorecardProps {
  instance: TrackedInstance;
  onReply: (sessionId: string, text: string) => void;
  onAutoYesToggle: (sessionId: string, enabled: boolean) => void;
  onViewPrompt: (instance: TrackedInstance) => void;
  onDragStart?: (e: React.DragEvent, sessionId: string) => void;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500 flex-shrink-0">{icon}</span>
      <span className="text-gray-500 w-16 flex-shrink-0">{label}</span>
      <span className="text-gray-300 truncate">{value}</span>
    </div>
  );
}

export function Scorecard({ instance, onReply, onAutoYesToggle, onViewPrompt, onDragStart }: ScorecardProps) {
  const isWaiting = instance.status === 'waiting';

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', instance.sessionId);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(e, instance.sessionId);
      }}
      className={`rounded-xl border p-4 shadow-md transition-colors cursor-grab active:cursor-grabbing ${
        isWaiting
          ? 'bg-gray-900 border-amber-500/50 animate-pulse-amber'
          : 'bg-gray-900 border-gray-800 hover:border-gray-700'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-gray-100 truncate">{instance.name}</h3>
          <span className="flex-shrink-0 rounded-md bg-gray-800 px-1.5 py-0.5 text-xs text-gray-400 border border-gray-700">
            {instance.kind === 'bg' ? 'BG' : 'CLI'}
          </span>
        </div>
        <StatusBadge status={instance.status} />
      </div>

      {/* Body */}
      <div className="space-y-1.5">
        <InfoRow
          icon={
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
          label="Dir"
          value={abbreviatePath(instance.cwd)}
        />
        <InfoRow
          icon={
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
          label="Model"
          value={instance.model || 'Unknown'}
        />
        <InfoRow
          icon={
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
          }
          label="Version"
          value={instance.version}
        />
        <InfoRow
          icon={
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          label="Uptime"
          value={formatUptime(instance.startedAt)}
        />
        {instance.tokens != null && (
          <InfoRow
            icon={
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
            label="Tokens"
            value={formatTokens(instance.tokens)}
          />
        )}
        {instance.jobState && (
          <InfoRow
            icon={
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            label="Job"
            value={instance.jobState}
          />
        )}
        {instance.children && instance.children.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 flex-shrink-0">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </span>
            <span className="text-gray-500 w-16 flex-shrink-0">PRs</span>
            <div className="flex flex-wrap gap-1">
              {instance.children.map((child) => (
                <a
                  key={child.id}
                  href={child.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 hover:underline text-xs"
                >
                  {child.kind}#{child.id}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Waiting Banner */}
      {isWaiting && instance.needs && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
          <p className="text-xs text-amber-400 mb-2 truncate" title={instance.needs}>
            {instance.needs}
          </p>
          <button
            onClick={() => onViewPrompt(instance)}
            className="w-full rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500 transition-colors"
          >
            View & Respond
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-800">
        <AutoYesToggle
          enabled={instance.autoYes}
          onChange={(enabled) => onAutoYesToggle(instance.sessionId, enabled)}
        />
      </div>
    </div>
  );
}
