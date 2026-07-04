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
