import { useState } from 'react';
import type { Group, TrackedInstance } from '../types';
import { Scorecard } from './Scorecard';

interface GroupSectionProps {
  group: Group;
  instances: TrackedInstance[];
  onToggleCollapse: (groupId: string) => void;
  onReply: (sessionId: string, text: string) => void;
  onAutoYesToggle: (sessionId: string, enabled: boolean) => void;
  onViewPrompt: (instance: TrackedInstance) => void;
  onDrop: (sessionId: string, groupId: string) => void;
}

export function GroupSection({
  group,
  instances,
  onToggleCollapse,
  onReply,
  onAutoYesToggle,
  onViewPrompt,
  onDrop,
}: GroupSectionProps) {
  const [dragOver, setDragOver] = useState(false);
  const waitingCount = instances.filter((i) => i.status === 'waiting').length;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if leaving the container (not entering a child)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const sessionId = e.dataTransfer.getData('text/plain');
    if (sessionId) {
      onDrop(sessionId, group.id);
    }
  };

  return (
    <div
      className={`rounded-xl border transition-colors ${
        dragOver ? 'border-blue-500/50 border-dashed bg-blue-500/5' : 'border-gray-800'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <button
        onClick={() => onToggleCollapse(group.id)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-900/50 rounded-t-xl transition-colors"
      >
        <svg
          className={`h-4 w-4 text-gray-500 transition-transform ${group.collapsed ? '' : 'rotate-90'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-semibold text-gray-200">{group.name}</span>
        <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
          {instances.length}
        </span>
        {waitingCount > 0 && (
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
            {waitingCount} waiting
          </span>
        )}
      </button>

      {/* Body */}
      {!group.collapsed && (
        <div className="px-4 pb-4">
          {instances.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {instances.map((inst) => (
                <Scorecard
                  key={inst.sessionId}
                  instance={inst}
                  onReply={onReply}
                  onAutoYesToggle={onAutoYesToggle}
                  onViewPrompt={onViewPrompt}
                />
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-gray-600">
              Drop instances here to add them to this group
            </p>
          )}
        </div>
      )}
    </div>
  );
}
