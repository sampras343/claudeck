import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { InstanceRegistry } from './InstanceRegistry.js';
import type { InputRelay } from './InputRelay.js';
import { assessSafety } from './SafetyAssessor.js';
import type { TrackedInstance, AutoYesLogEntry, Notification } from '../types.js';

export class AutoYesManager extends EventEmitter {
  private log: AutoYesLogEntry[] = [];
  private pendingChecks = new Set<string>();
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
    } else {
      this.enabledSessions.delete(sessionId);
    }
  }

  isEnabled(sessionId: string): boolean {
    return this.enabledSessions.has(sessionId);
  }

  getLog(): AutoYesLogEntry[] {
    return [...this.log];
  }

  private async processInstances(instances: TrackedInstance[]): Promise<void> {
    for (const instance of instances) {
      if (
        instance.status === 'waiting' &&
        instance.autoYes &&
        instance.needs
      ) {
        // Create a unique key for this waiting state to prevent duplicates
        const checkKey = `${instance.sessionId}:${instance.needs}`;
        if (this.pendingChecks.has(checkKey)) continue;
        this.pendingChecks.add(checkKey);

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
          // Auto-approve
          try {
            await this.inputRelay.sendReply(instance, 'yes');
            entry.action = 'auto-approved';
          } catch (err) {
            entry.action = 'deferred-to-user';
            entry.reason = `Relay failed: ${(err as Error).message}`;
          }
        } else {
          // RISKY or DANGEROUS: defer to user
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

        // Clean up pending check after the instance state moves on
        // Use a timeout to allow the state to settle
        setTimeout(() => {
          this.pendingChecks.delete(checkKey);
        }, 5000);
      }
    }
  }
}
