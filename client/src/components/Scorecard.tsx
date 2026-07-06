import type { TrackedInstance } from '../types';
import { abbreviatePath, formatUptime, formatTokens } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';
import { AutoYesToggle } from './AutoYesToggle';
import { PermissionBadge } from './PermissionBadge';

interface ScorecardProps {
  instance: TrackedInstance;
  onReply: (sessionId: string, text: string) => void;
  onAutoYesToggle: (sessionId: string, enabled: boolean) => void;
  onViewPrompt: (instance: TrackedInstance) => void;
  onCancel?: (instance: TrackedInstance) => void;
  onStop?: (instance: TrackedInstance) => void;
  onViewPermissions?: (instance: TrackedInstance) => void;
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

export function Scorecard({ instance, onReply, onAutoYesToggle, onViewPrompt, onCancel, onStop, onViewPermissions, onDragStart }: ScorecardProps) {
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
          value={instance.modelDisplayName || instance.model || 'Unknown'}
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
        {instance.permissionLevel && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 flex-shrink-0">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </span>
            <span className="text-gray-500 w-16 flex-shrink-0">Perms</span>
            <PermissionBadge
              level={instance.permissionLevel}
              ruleCount={instance.permissionRuleCount}
              onClick={() => onViewPermissions?.(instance)}
            />
          </div>
        )}
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

        {/* Context Window Bar */}
        {instance.contextWindowPercent != null && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 flex-shrink-0">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6" />
              </svg>
            </span>
            <span className="text-gray-500 w-16 flex-shrink-0">Context</span>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 bg-gray-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    instance.contextWindowPercent > 50
                      ? 'bg-green-500'
                      : instance.contextWindowPercent >= 20
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${instance.contextWindowPercent}%` }}
                />
              </div>
              <span className="text-gray-300 text-xs flex-shrink-0">{instance.contextWindowPercent}%</span>
            </div>
          </div>
        )}

        {/* PR Badge */}
        {instance.linkedPR && (
          <a href="#" className="block">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 flex-shrink-0">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v12m0 0a3 3 0 103 3V6a3 3 0 10-3-3m12 12a3 3 0 10-3-3V6a3 3 0 103-3" />
                </svg>
              </span>
              <span className="text-gray-500 w-16 flex-shrink-0">PR</span>
              <span className="text-gray-300 truncate flex items-center gap-1.5">
                <span>PR #{instance.linkedPR.number}</span>
                {instance.linkedPR.reviewState === 'approved' && (
                  <span className="flex items-center gap-0.5 text-green-400">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs">Approved</span>
                  </span>
                )}
                {instance.linkedPR.reviewState === 'changes_requested' && (
                  <span className="flex items-center gap-0.5 text-red-400">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-xs">Changes</span>
                  </span>
                )}
                {instance.linkedPR.reviewState === 'pending' && (
                  <span className="flex items-center gap-0.5 text-yellow-400">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs">Pending</span>
                  </span>
                )}
                {instance.linkedPR.reviewState === 'draft' && (
                  <span className="flex items-center gap-0.5 text-gray-400">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="text-xs">Draft</span>
                  </span>
                )}
              </span>
            </div>
          </a>
        )}

        {/* Worktree Indicator */}
        {instance.worktree && (
          <InfoRow
            icon={
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v12m6-6v6m0 0l-3-3m3 3l3-3m3-9v12" />
              </svg>
            }
            label="WT"
            value={`${instance.worktree.name}@${instance.worktree.branch}`}
          />
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
      <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
        <AutoYesToggle
          enabled={instance.autoYes}
          onChange={(enabled) => onAutoYesToggle(instance.sessionId, enabled)}
        />
        <div className="flex gap-2">
          <button
            onClick={() => onCancel?.(instance)}
            title="Cancel current operation (Ctrl+C)"
            className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-400 hover:border-orange-500/50 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
          <button
            onClick={() => onStop?.(instance)}
            title="Stop and exit Claude session"
            className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-400 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
            </svg>
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}
