import type {
  TrackedInstance,
  Group,
  Notification,
  AutoYesLogEntry,
  InputRelayResult,
} from '../types.js';

export type ServerMessage =
  | { type: 'instances:snapshot'; instances: TrackedInstance[] }
  | { type: 'instance:update'; instance: TrackedInstance }
  | { type: 'instance:remove'; sessionId: string }
  | { type: 'groups:snapshot'; groups: Group[] }
  | { type: 'group:update'; group: Group }
  | { type: 'group:remove'; groupId: string }
  | { type: 'notification'; notification: Notification }
  | { type: 'autoyes:log'; entry: AutoYesLogEntry }
  | { type: 'relay:result'; requestId: string; result: InputRelayResult }
  | { type: 'pong' };

export type ClientMessage =
  | { type: 'reply'; sessionId: string; text: string; requestId: string }
  | { type: 'autoyes:set'; sessionId: string; enabled: boolean }
  | { type: 'group:create'; name: string }
  | { type: 'group:update'; groupId: string; updates: { name?: string; collapsed?: boolean } }
  | { type: 'group:delete'; groupId: string }
  | { type: 'group:assign'; sessionId: string; groupId: string | null }
  | { type: 'allow-always'; sessionId: string; toolPattern: string }
  | { type: 'ping' };
