import { useState, useCallback } from 'react';
import type { TrackedInstance } from './types';
import { useWebSocket } from './hooks/useWebSocket';
import { useInstances } from './hooks/useInstances';
import { useGroups } from './hooks/useGroups';
import { useNotifications } from './hooks/useNotifications';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { InputPromptModal } from './components/InputPromptModal';
import { ToastContainer } from './components/Toast';
import { GroupManager } from './components/GroupManager';

export default function App() {
  const ws = useWebSocket();
  const { instances, waitingInstances, sendReply, setAutoYes } = useInstances(ws);
  const { groups, createGroup, updateGroup, deleteGroup, assignInstance } = useGroups(ws);
  const { notifications, dismiss } = useNotifications(ws);

  const [selectedInstance, setSelectedInstance] = useState<TrackedInstance | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);

  const handleViewPrompt = useCallback((instance: TrackedInstance) => {
    setSelectedInstance(instance);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setSelectedInstance(null);
  }, []);

  const handleReply = useCallback(
    (sessionId: string, text: string) => {
      sendReply(sessionId, text);
    },
    [sendReply],
  );

  const handleAllowAlways = useCallback(
    (sessionId: string, toolPattern: string) => {
      ws.send({ type: 'allow-always', sessionId, toolPattern });
    },
    [ws],
  );

  const handleAutoYesToggle = useCallback(
    (sessionId: string, enabled: boolean) => {
      setAutoYes(sessionId, enabled);
    },
    [setAutoYes],
  );

  const handleToggleGroupCollapse = useCallback(
    (groupId: string) => {
      const group = groups.find((g) => g.id === groupId);
      if (group) {
        updateGroup(groupId, { collapsed: !group.collapsed });
      }
    },
    [groups, updateGroup],
  );

  return (
    <div className="min-h-screen bg-gray-950">
      <Header
        instances={instances}
        waitingCount={waitingInstances.length}
        onOpenGroupManager={() => setGroupManagerOpen(true)}
      />

      <Dashboard
        instances={instances}
        groups={groups}
        onReply={handleReply}
        onAutoYesToggle={handleAutoYesToggle}
        onToggleGroupCollapse={handleToggleGroupCollapse}
        onAssignInstance={assignInstance}
        onViewPrompt={handleViewPrompt}
      />

      <InputPromptModal
        instance={selectedInstance}
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onReply={handleReply}
        onAllowAlways={handleAllowAlways}
      />

      <ToastContainer notifications={notifications} onDismiss={dismiss} />

      <GroupManager
        isOpen={groupManagerOpen}
        onClose={() => setGroupManagerOpen(false)}
        groups={groups}
        onCreateGroup={createGroup}
        onUpdateGroup={updateGroup}
        onDeleteGroup={deleteGroup}
      />

      {/* Connection status indicator */}
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            ws.connected ? 'bg-green-500' : 'bg-red-500 animate-pulse'
          }`}
        />
        <span className="text-xs text-gray-500">
          {ws.connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  );
}
