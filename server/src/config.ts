import os from 'os';
import path from 'path';

const HOME = os.homedir();

export const CLAUDE_DIR = path.join(HOME, '.claude');
export const SESSIONS_DIR = path.join(CLAUDE_DIR, 'sessions');
export const JOBS_DIR = path.join(CLAUDE_DIR, 'jobs');
export const ROSTER_PATH = path.join(CLAUDE_DIR, 'daemon', 'roster.json');
export const DAEMON_STATUS_PATH = path.join(CLAUDE_DIR, 'daemon.status.json');
export const CONTROL_KEY_PATH = path.join(CLAUDE_DIR, 'daemon', 'control.key');
export const TASKS_DIR = path.join(CLAUDE_DIR, 'tasks');
export const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');
export const GROUPS_PATH = path.join(CLAUDE_DIR, 'tracker-groups.json');

export const SERVER_PORT = parseInt(process.env.PORT || '3200', 10);
export const POLL_INTERVAL_MS = 5000;
export const WS_HEARTBEAT_MS = 10000;

export function getDaemonSocketDir(): string {
  const uid = process.getuid?.() ?? 1000;
  return `/tmp/cc-daemon-${uid}`;
}
