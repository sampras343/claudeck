import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { InstanceRegistry } from './InstanceRegistry.js';
import type { InputRelay } from './InputRelay.js';
import { assessSafety } from './SafetyAssessor.js';
import type { TrackedInstance, AutoYesLogEntry, Notification } from '../types.js';

export class AutoYesManager extends EventEmitter {
  private log: AutoYesLogEntry[] = [];
  private lastHandledNeeds = new Map<string, string>();
  private enabledSessions = new Set<string>();

  constructor(
    private registry: InstanceRegistry,
    private inputRelay: InputRelay,
  ) {
    super();
    this.registry.on('instances:changed', (instances: TrackedInstance[]) => {
      this.processInstances(instances);
    });
  }

  setAutoYes(sessionId: string, enabled: boolean): void {
    if (enabled) {
      this.enabledSessions.add(sessionId);
      // Immediately process current state when toggled on
      const instance = this.registry.getBySessionId(sessionId);
      if (instance && instance.status === 'waiting' && instance.needs) {
        this.handleWaitingInstance(instance);
      }
    } else {
      this.enabledSessions.delete(sessionId);
      this.lastHandledNeeds.delete(sessionId);
    }
  }

  isEnabled(sessionId: string): boolean {
    return this.enabledSessions.has(sessionId);
  }

  getLog(): AutoYesLogEntry[] {
    return [...this.log];
  }

  private processInstances(instances: TrackedInstance[]): void {
    for (const instance of instances) {
      if (instance.status === 'waiting' && instance.autoYes && instance.needs) {
        this.handleWaitingInstance(instance);
      }
      if (instance.status !== 'waiting') {
        this.lastHandledNeeds.delete(instance.sessionId);
      }
    }
  }

  private async handleWaitingInstance(instance: TrackedInstance): Promise<void> {
    if (!instance.needs) return;

    // Skip if we already handled this exact prompt
    if (this.lastHandledNeeds.get(instance.sessionId) === instance.needs) return;
    this.lastHandledNeeds.set(instance.sessionId, instance.needs);

    const assessment = assessSafety(instance.needs);
    const entry: AutoYesLogEntry = {
      sessionId: instance.sessionId,
      instanceName: instance.name,
      timestamp: Date.now(),
      needs: instance.needs,
      safetyLevel: assessment.level,
      action: 'deferred-to-user',
      reason: assessment.reason,
    };

    if (assessment.level === 'SAFE' || assessment.level === 'MODERATE') {
      const result = await this.inputRelay.sendReply(instance, 'yes');
      if (result.success) {
        entry.action = 'auto-approved';
      } else {
        entry.reason = `Relay failed: ${result.error}`;
        // Allow retry on next state change
        this.lastHandledNeeds.delete(instance.sessionId);
      }
    } else {
      const notification: Notification = {
        id: uuidv4(),
        type: 'input-needed',
        sessionId: instance.sessionId,
        instanceName: instance.name,
        message: `${assessment.level} action requires approval: ${instance.needs}`,
        timestamp: Date.now(),
        safetyLevel: assessment.level,
      };
      this.emit('notification', notification);
    }

    this.log.push(entry);
    this.emit('autoyes:action', entry);
  }
}
