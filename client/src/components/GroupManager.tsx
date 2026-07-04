import { useEffect, useRef, useState } from 'react';
import type { Group } from '../types';

interface GroupManagerProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  onCreateGroup: (name: string) => void;
  onUpdateGroup: (groupId: string, updates: { name?: string }) => void;
  onDeleteGroup: (groupId: string) => void;
}

export function GroupManager({
  isOpen,
  onClose,
  groups,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
}: GroupManagerProps) {
  const [newGroupName, setNewGroupName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCreate = () => {
    const name = newGroupName.trim();
    if (name) {
      onCreateGroup(name);
      setNewGroupName('');
    }
  };

  const handleStartEdit = (group: Group) => {
    setEditingId(group.id);
    setEditName(group.name);
  };

  const handleSaveEdit = (groupId: string) => {
    const name = editName.trim();
    if (name) {
      onUpdateGroup(groupId, { name });
    }
    setEditingId(null);
  };

  const handleDelete = (groupId: string) => {
    if (confirmDeleteId === groupId) {
      onDeleteGroup(groupId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(groupId);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 z-50 flex h-full w-80 flex-col border-l border-gray-800 bg-gray-900 shadow-2xl animate-slide-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-4">
          <h2 className="text-lg font-semibold text-gray-100">Manage Groups</h2>
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

        {/* Create Group */}
        <div className="border-b border-gray-800 px-4 py-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
              placeholder="New group name..."
              className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
            />
            <button
              onClick={handleCreate}
              disabled={!newGroupName.trim()}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create
            </button>
          </div>
        </div>

        {/* Group List */}
        <div className="flex-1 overflow-auto px-4 py-3">
          {groups.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">No groups yet</p>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-800/50 px-3 py-2"
                >
                  {editingId === group.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(group.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={() => handleSaveEdit(group.id)}
                      autoFocus
                      className="flex-1 rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
                    />
                  ) : (
                    <span
                      className="flex-1 truncate text-sm text-gray-200 cursor-pointer"
                      onDoubleClick={() => handleStartEdit(group)}
                    >
                      {group.name}
                    </span>
                  )}
                  <button
                    onClick={() => handleStartEdit(group)}
                    className="rounded p-1 text-gray-500 hover:bg-gray-700 hover:text-gray-300 transition-colors"
                    aria-label={`Edit ${group.name}`}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(group.id)}
                    className={`rounded p-1 transition-colors ${
                      confirmDeleteId === group.id
                        ? 'bg-red-600 text-white hover:bg-red-500'
                        : 'text-gray-500 hover:bg-gray-700 hover:text-red-400'
                    }`}
                    aria-label={confirmDeleteId === group.id ? `Confirm delete ${group.name}` : `Delete ${group.name}`}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
