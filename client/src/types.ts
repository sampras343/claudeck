export type SafetyLevel = 'SAFE' | 'MODERATE' | 'RISKY' | 'DANGEROUS';
export type PermissionLevel = 'RESTRICTIVE' | 'MODERATE' | 'PERMISSIVE' | 'UNRESTRICTED';

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
  contextWindowPercent?: number;
  linkedPR?: { number: number; reviewState: string };
  worktree?: { name: string; branch: string };
  modelDisplayName?: string;
  permissionLevel?: PermissionLevel;
  permissionRuleCount?: number;
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

export interface ParsedPermissionRule {
  raw: string;
  tool: string;
  pattern?: string;
  category: string;
  points: number;
  source: 'global' | 'project-shared' | 'project-local';
}

export interface PermissionProfile {
  level: PermissionLevel;
  score: number;
  ruleCount: number;
  rules: ParsedPermissionRule[];
  sources: {
    global: string[];
    projectShared: string[];
    projectLocal: string[];
  };
}

export interface SearchResult {
  sessionId: string;
  cwd: string;
  timestamp: number;
  role: string;
  snippet: string;
  score: number;
}
