import { EventEmitter } from 'events';
import { POLL_INTERVAL_MS } from '../config.js';
import type { SessionWatcher } from '../watchers/SessionWatcher.js';
import type { JobWatcher } from '../watchers/JobWatcher.js';
import type { RosterWatcher } from '../watchers/RosterWatcher.js';
import type { GroupManager } from './GroupManager.js';
import type { StatusLineReceiver } from './StatusLineReceiver.js';
import { assessSafety } from './SafetyAssessor.js';
import { computePermissionLevel } from './PermissionAnalyzer.js';
import type { TrackedInstance, SessionEntry, JobState } from '../types.js';

export class InstanceRegistry extends EventEmitter {
  private instances = new Map<string, TrackedInstance>();
  private sessions = new Map<string, SessionEntry & { pid: number }>();
  private jobs = new Map<string, JobState>();
  private autoYesSet = new Set<string>();
  private emitTimer: ReturnType<typeof setTimeout> | null = null;
  private livenessInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private sessionWatcher: SessionWatcher,
    private jobWatcher: JobWatcher,
    private rosterWatcher: RosterWatcher,
    private groupManager: GroupManager,
    private statusLineReceiver?: StatusLineReceiver,
  ) {
    super();
  }

  start(): void {
    this.sessionWatcher.on('session:update', (pid: number, entry: SessionEntry) => {
      this.sessions.set(entry.sessionId, { ...entry, pid });
      this.rebuildInstance(entry.sessionId);
    });

    this.sessionWatcher.on('session:remove', (pid: number) => {
      // Find session by pid and remove it
      for (const [sessionId, session] of this.sessions) {
        if (session.pid === pid) {
          this.sessions.delete(sessionId);
          this.instances.delete(sessionId);
          this.scheduleEmit();
          break;
        }
      }
    });

    this.jobWatcher.on('job:update', (jobId: string, jobState: JobState) => {
      this.jobs.set(jobId, jobState);
      // Rebuild any instance linked to this job
      for (const [sessionId, session] of this.sessions) {
        if (session.jobId === jobId || jobState.sessionId === session.sessionId) {
          this.rebuildInstance(sessionId);
        }
      }
    });

    this.jobWatcher.on('job:remove', (jobId: string) => {
      this.jobs.delete(jobId);
      // Rebuild any instance that was linked to this job
      for (const [sessionId, session] of this.sessions) {
        if (session.jobId === jobId) {
          this.rebuildInstance(sessionId);
        }
      }
    });

    this.rosterWatcher.on('roster:update', () => {
      // Rebuild all instances to pick up roster changes
      for (const sessionId of this.sessions.keys()) {
        this.rebuildInstance(sessionId);
      }
    });

    // Liveness check every POLL_INTERVAL_MS
    this.livenessInterval = setInterval(() => this.checkLiveness(), POLL_INTERVAL_MS);
  }

  getAll(): TrackedInstance[] {
    return Array.from(this.instances.values());
  }

  getBySessionId(sessionId: string): TrackedInstance | undefined {
    return this.instances.get(sessionId);
  }

  setAutoYes(sessionId: string, enabled: boolean): void {
    if (enabled) {
      this.autoYesSet.add(sessionId);
    } else {
      this.autoYesSet.delete(sessionId);
    }
    const instance = this.instances.get(sessionId);
    if (instance) {
      instance.autoYes = enabled;
      this.scheduleEmit();
    }
  }

  setGroup(sessionId: string, groupId: string | null): void {
    if (groupId) {
      this.groupManager.addInstance(groupId, sessionId);
    } else {
      // Remove from current group
      const currentGroupId = this.groupManager.getGroupForInstance(sessionId);
      if (currentGroupId) {
        this.groupManager.removeInstance(currentGroupId, sessionId);
      }
    }
    const instance = this.instances.get(sessionId);
    if (instance) {
      instance.groupId = groupId ?? undefined;
      this.scheduleEmit();
    }
  }

  private rebuildInstance(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Find matching job
    let matchedJob: JobState | undefined;
    if (session.jobId) {
      matchedJob = this.jobs.get(session.jobId);
    }
    if (!matchedJob) {
      // Try matching by sessionId in job
      for (const job of this.jobs.values()) {
        if (job.sessionId === session.sessionId) {
          matchedJob = job;
          break;
        }
      }
    }

    // Find roster info
    let shortId: string | undefined;
    let model: string | undefined;
    const rosterData = this.rosterWatcher.getData();
    if (rosterData) {
      for (const [sid, worker] of Object.entries(rosterData.workers)) {
        if (worker.sessionId === sessionId) {
          shortId = sid;
          // Parse model from dispatch.launch.flagArgs
          const flagArgs = worker.dispatch?.launch?.flagArgs;
          if (flagArgs) {
            const modelIdx = flagArgs.indexOf('--model');
            if (modelIdx !== -1 && modelIdx + 1 < flagArgs.length) {
              model = flagArgs[modelIdx + 1];
            }
          }
          break;
        }
      }
    }

    // Get group
    const groupId = this.groupManager.getGroupForInstance(sessionId);

    // Determine needs and safety level
    const needs = matchedJob?.needs ?? session.waitingFor;
    let safetyLevel = undefined;
    if (needs) {
      safetyLevel = assessSafety(needs).level;
    }

    const permResult = computePermissionLevel(session.cwd);

    const instance: TrackedInstance = {
      pid: session.pid,
      sessionId: session.sessionId,
      shortId,
      cwd: session.cwd,
      name: session.name ?? matchedJob?.name ?? `Instance ${session.pid}`,
      status: session.status,
      kind: session.kind,
      version: session.version,
      startedAt: session.startedAt,
      updatedAt: session.updatedAt,
      waitingFor: session.waitingFor,
      needs,
      tokens: matchedJob?.tokens,
      jobState: matchedJob?.state,
      children: matchedJob?.children,
      model,
      groupId: groupId ?? undefined,
      autoYes: this.autoYesSet.has(sessionId),
      safetyLevel,
      permissionLevel: permResult.level,
      permissionRuleCount: permResult.ruleCount,
    };

    // Merge status line data if available
    if (this.statusLineReceiver && session.name) {
      const statusLine = this.statusLineReceiver.getForSession(session.name);
      if (statusLine) {
        if (statusLine.context_window?.remaining_percentage != null) {
          instance.contextWindowPercent = statusLine.context_window.remaining_percentage;
        }
        if (statusLine.pr?.number != null && statusLine.pr?.review_state) {
          instance.linkedPR = {
            number: statusLine.pr.number,
            reviewState: statusLine.pr.review_state,
          };
        }
        if (statusLine.worktree?.name && statusLine.worktree?.branch) {
          instance.worktree = {
            name: statusLine.worktree.name,
            branch: statusLine.worktree.branch,
          };
        }
        if (statusLine.model?.display_name) {
          instance.modelDisplayName = statusLine.model.display_name;
        }
      }
    }

    this.instances.set(sessionId, instance);
    this.scheduleEmit();
  }

  private scheduleEmit(): void {
    if (this.emitTimer) return;
    this.emitTimer = setTimeout(() => {
      this.emitTimer = null;
      this.emit('instances:changed', this.getAll());
    }, 100);
  }

  private checkLiveness(): void {
    let changed = false;
    for (const [sessionId, instance] of this.instances) {
      try {
        process.kill(instance.pid, 0);
      } catch {
        // Process is dead
        this.instances.delete(sessionId);
        this.sessions.delete(sessionId);
        changed = true;
      }
    }
    if (changed) {
      this.scheduleEmit();
    }
  }
}
