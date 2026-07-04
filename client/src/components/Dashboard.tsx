import { useState } from 'react';
import type { Group, TrackedInstance } from '../types';
import { GroupSection } from './GroupSection';
import { Scorecard } from './Scorecard';

interface DashboardProps {
  instances: TrackedInstance[];
  groups: Group[];
  onReply: (sessionId: string, text: string) => void;
  onAutoYesToggle: (sessionId: string, enabled: boolean) => void;
  onToggleGroupCollapse: (groupId: string) => void;
  onAssignInstance: (sessionId: string, groupId: string | null) => void;
  onViewPrompt: (instance: TrackedInstance) => void;
}

export function Dashboard({
  instances,
  groups,
  onReply,
  onAutoYesToggle,
  onToggleGroupCollapse,
  onAssignInstance,
  onViewPrompt,
}: DashboardProps) {
  const [ungroupedDragOver, setUngroupedDragOver] = useState(false);

  // Compute which instances belong to which group
  const groupedSessionIds = new Set<string>();
  for (const group of groups) {
    for (const id of group.instanceIds) {
      groupedSessionIds.add(id);
    }
  }
  // Also respect instance.groupId
  for (const inst of instances) {
    if (inst.groupId) {
      groupedSessionIds.add(inst.sessionId);
    }
  }

  const ungroupedInstances = instances.filter(
    (i) => !groupedSessionIds.has(i.sessionId) && !i.groupId,
  );

  const getGroupInstances = (group: Group): TrackedInstance[] => {
    const idSet = new Set(group.instanceIds);
    return instances.filter((i) => idSet.has(i.sessionId) || i.groupId === group.id);
  };

  if (instances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <svg className="h-16 w-16 text-gray-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p className="text-lg text-gray-500">No active Claude instances detected</p>
        <p className="text-sm text-gray-600 mt-1">Instances will appear here when Claude Code CLI is running</p>
      </div>
    );
  }

  const handleUngroupedDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setUngroupedDragOver(true);
  };

  const handleUngroupedDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setUngroupedDragOver(false);
  };

  const handleUngroupedDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setUngroupedDragOver(false);
    const sessionId = e.dataTransfer.getData('text/plain');
    if (sessionId) {
      onAssignInstance(sessionId, null);
    }
  };

  return (
    <div className="space-y-6 p-4 max-w-screen-2xl mx-auto">
      {/* Grouped Sections */}
      {groups.map((group) => (
        <GroupSection
          key={group.id}
          group={group}
          instances={getGroupInstances(group)}
          onToggleCollapse={onToggleGroupCollapse}
          onReply={onReply}
          onAutoYesToggle={onAutoYesToggle}
          onViewPrompt={onViewPrompt}
          onDrop={(sessionId, groupId) => onAssignInstance(sessionId, groupId)}
        />
      ))}

      {/* Ungrouped Section */}
      <div
        className={`rounded-xl border transition-colors ${
          ungroupedDragOver ? 'border-blue-500/50 border-dashed bg-blue-500/5' : 'border-gray-800'
        }`}
        onDragOver={handleUngroupedDragOver}
        onDragLeave={handleUngroupedDragLeave}
        onDrop={handleUngroupedDrop}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="text-sm font-semibold text-gray-200">
            {groups.length > 0 ? 'Ungrouped' : 'All Instances'}
          </span>
          <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
            {ungroupedInstances.length}
          </span>
          {ungroupedInstances.filter((i) => i.status === 'waiting').length > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
              {ungroupedInstances.filter((i) => i.status === 'waiting').length} waiting
            </span>
          )}
        </div>
        <div className="px-4 pb-4">
          {ungroupedInstances.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {ungroupedInstances.map((inst) => (
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
            groups.length > 0 && (
              <p className="py-6 text-center text-sm text-gray-600">
                All instances are assigned to groups
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
