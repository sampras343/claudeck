export type SafetyLevel = 'SAFE' | 'MODERATE' | 'RISKY' | 'DANGEROUS';

export interface TrackedInstance {
  pid: number;
  sessionId: string;
  shortId?: string;
  cwd: string;
  name: string;
  status: 'idle' | 'busy' | 'waiting';
  kind: 'interactive' | 'bg';
  version: string;
  startedAt: number;
  updatedAt: number;
  waitingFor?: string;
  needs?: string;
  tokens?: number;
  jobState?: string;
  children?: Array<{ id: string; href: string; kind: string }>;
  model?: string;
  groupId?: string;
  autoYes: boolean;
  safetyLevel?: SafetyLevel;
}

export interface Group {
  id: string;
  name: string;
  collapsed: boolean;
  instanceIds: string[];
}

export interface Notification {
  id: string;
  type: 'input-needed' | 'auto-approved' | 'relay-result' | 'error';
  sessionId: string;
  instanceName: string;
  message: string;
  timestamp: number;
  safetyLevel?: SafetyLevel;
}

export interface AutoYesLogEntry {
  sessionId: string;
  instanceName: string;
  timestamp: number;
  needs: string;
  safetyLevel: SafetyLevel;
  action: 'auto-approved' | 'deferred-to-user';
  reason: string;
}

export interface InputRelayResult {
  success: boolean;
  method: 'rendezvous' | 'pty';
  error?: string;
}

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
