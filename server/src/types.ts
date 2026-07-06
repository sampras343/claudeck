export interface SessionEntry {
  pid: number;
  sessionId: string;
  cwd: string;
  startedAt: number;
  procStart: string;
  version: string;
  peerProtocol: number;
  kind: 'interactive' | 'bg';
  entrypoint: string;
  name?: string;
  nameSource?: string;
  status: 'idle' | 'busy' | 'waiting';
  updatedAt: number;
  statusUpdatedAt: number;
  waitingFor?: string;
  agent?: string;
  jobId?: string;
}

export interface JobState {
  state: 'working' | 'blocked' | 'done' | 'running';
  tempo?: string;
  detail: string;
  needs?: string;
  tokens?: number;
  children?: Array<{ id: string; href: string; kind: string }>;
  name?: string;
  nameSource?: string;
  sessionId: string;
  resumeSessionId?: string;
  daemonShort?: string;
  cwd: string;
  createdAt: string;
  updatedAt: string;
  respawnFlags?: string[];
  intent?: string;
  backend?: string;
  template?: string;
  inFlight?: { tasks: number; queued: number; kinds: string[] };
}

export interface RosterWorker {
  pid: number;
  procStart: string;
  sessionId: string;
  rendezvousSock: string;
  ptySock: string;
  cliVersion: string;
  startedAt: number;
  attempt: number;
  cwd: string;
  dispatch: {
    proto: number;
    short: string;
    nonce: string;
    sessionId: string;
    createdAt: number;
    source: string;
    cwd: string;
    launch: {
      mode: string;
      flagArgs?: string[];
      sessionId?: string;
      transcriptPath?: string;
      args?: string[];
    };
    env?: Record<string, string>;
    respawnFlags?: string[];
    seed?: { intent: string };
  };
  rvAuth: string;
  ptyAuth: string;
}

export interface RosterData {
  proto: number;
  supervisorPid: number;
  updatedAt: number;
  workers: Record<string, RosterWorker>;
}

export type SafetyLevel = 'SAFE' | 'MODERATE' | 'RISKY' | 'DANGEROUS';

export type PermissionLevel = 'RESTRICTIVE' | 'MODERATE' | 'PERMISSIVE' | 'UNRESTRICTED';

export type PermissionCategory = 'unrestricted' | 'dangerous' | 'risky' | 'moderate' | 'safe' | 'web' | 'file-broad' | 'file-narrow';

export interface ParsedPermissionRule {
  raw: string;
  tool: string;
  pattern?: string;
  category: PermissionCategory;
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

export interface SafetyAssessment {
  level: SafetyLevel;
  reason: string;
  command?: string;
  toolName?: string;
}

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

export interface StatusLineData {
  model?: { display_name?: string };
  context_window?: { remaining_percentage?: number };
  workspace?: { repo?: { owner?: string; name?: string } };
  pr?: { number?: number; review_state?: string };
  worktree?: { name?: string; branch?: string };
  session_name?: string;
  agent?: { name?: string; type?: string };
}

export interface SearchResult {
  sessionId: string;
  cwd: string;
  timestamp: number;
  role: string;
  snippet: string;
  score: number;
}

export interface WebhookConfig {
  url: string;
  events: string[];
  format: 'slack' | 'discord' | 'generic';
}

export interface Group {
  id: string;
  name: string;
  collapsed: boolean;
  instanceIds: string[];
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

export interface Notification {
  id: string;
  type: 'input-needed' | 'auto-approved' | 'relay-result' | 'error';
  sessionId: string;
  instanceName: string;
  message: string;
  timestamp: number;
  safetyLevel?: SafetyLevel;
}
