import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import type { InstanceRegistry } from '../services/InstanceRegistry.js';
import type { GroupManager } from '../services/GroupManager.js';
import type { InputRelay } from '../services/InputRelay.js';
import type { AutoYesManager } from '../services/AutoYesManager.js';
import type { NotificationDispatcher } from '../services/NotificationDispatcher.js';
import type { TrackedInstance, AutoYesLogEntry, Notification } from '../types.js';
import type { ServerMessage, ClientMessage } from './protocol.js';

export class WebSocketHandler {
  constructor(
    private wss: WebSocketServer,
    private registry: InstanceRegistry,
    private groupManager: GroupManager,
    private inputRelay: InputRelay,
    private autoYesManager: AutoYesManager,
    _reserved?: unknown,
    private notificationDispatcher?: NotificationDispatcher,
  ) {
    this.setup();
  }

  private setup(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      // Send initial snapshots
      this.send(ws, {
        type: 'instances:snapshot',
        instances: this.registry.getAll(),
      });

      this.send(ws, {
        type: 'groups:snapshot',
        groups: this.groupManager.getAll(),
      });

      // Handle incoming messages
      ws.on('message', (data: Buffer | string) => {
        try {
          const msg: ClientMessage = JSON.parse(data.toString());
          this.handleMessage(ws, msg);
        } catch {
          // Ignore malformed messages
        }
      });
    });

    // Subscribe to registry changes
    this.registry.on('instances:changed', (instances: TrackedInstance[]) => {
      for (const instance of instances) {
        this.broadcast({
          type: 'instance:update',
          instance,
        });
      }
    });

    // Subscribe to auto-yes events
    this.autoYesManager.on('autoyes:action', (entry: AutoYesLogEntry) => {
      this.broadcast({
        type: 'autoyes:log',
        entry,
      });
    });

    this.autoYesManager.on('notification', (notification: Notification) => {
      this.broadcast({
        type: 'notification',
        notification,
      });
      // Also dispatch to webhooks
      if (this.notificationDispatcher) {
        this.notificationDispatcher.dispatch(notification);
      }
    });

    // Dispatch notifications when instances start waiting
    this.registry.on('instances:changed', (instances: TrackedInstance[]) => {
      if (!this.notificationDispatcher) return;
      for (const instance of instances) {
        if (instance.status === 'waiting' && instance.needs && !instance.autoYes) {
          const notification: Notification = {
            id: `waiting-${instance.sessionId}-${Date.now()}`,
            type: 'input-needed',
            sessionId: instance.sessionId,
            instanceName: instance.name,
            message: `Instance is waiting for input: ${instance.needs}`,
            timestamp: Date.now(),
            safetyLevel: instance.safetyLevel,
          };
          this.notificationDispatcher.dispatch(notification);
        }
      }
    });
  }

  private async handleMessage(ws: WebSocket, msg: ClientMessage): Promise<void> {
    switch (msg.type) {
      case 'reply': {
        const instance = this.registry.getBySessionId(msg.sessionId);
        if (!instance) {
          this.send(ws, {
            type: 'relay:result',
            requestId: msg.requestId,
            result: {
              success: false,
              method: 'pty',
              error: `Instance not found: ${msg.sessionId}`,
            },
          });
          return;
        }
        const result = await this.inputRelay.sendReply(instance, msg.text);
        this.send(ws, {
          type: 'relay:result',
          requestId: msg.requestId,
          result,
        });
        break;
      }

      case 'autoyes:set': {
        this.registry.setAutoYes(msg.sessionId, msg.enabled);
        this.autoYesManager.setAutoYes(msg.sessionId, msg.enabled);
        break;
      }

      case 'group:create': {
        const group = this.groupManager.create(msg.name);
        this.broadcast({ type: 'group:update', group });
        break;
      }

      case 'group:update': {
        try {
          const group = this.groupManager.update(msg.groupId, msg.updates);
          this.broadcast({ type: 'group:update', group });
        } catch {
          // Group not found
        }
        break;
      }

      case 'group:delete': {
        try {
          this.groupManager.delete(msg.groupId);
          this.broadcast({ type: 'group:remove', groupId: msg.groupId });
        } catch {
          // Group not found
        }
        break;
      }

      case 'group:assign': {
        try {
          if (msg.groupId) {
            this.groupManager.addInstance(msg.groupId, msg.sessionId);
          } else {
            const currentGroup = this.groupManager.getGroupForInstance(msg.sessionId);
            if (currentGroup) {
              this.groupManager.removeInstance(currentGroup, msg.sessionId);
            }
          }
          this.registry.setGroup(msg.sessionId, msg.groupId);

          // Broadcast updated groups
          for (const group of this.groupManager.getAll()) {
            this.broadcast({ type: 'group:update', group });
          }
        } catch {
          // Group not found
        }
        break;
      }

      case 'allow-always': {
        const inst = this.registry.getBySessionId(msg.sessionId);
        if (inst) {
          this.addPermission(inst.cwd, msg.toolPattern);
        }
        break;
      }

      case 'ping': {
        this.send(ws, { type: 'pong' });
        break;
      }
    }
  }

  private addPermission(cwd: string, pattern: string): void {
    const settingsPath = path.join(cwd, '.claude', 'settings.local.json');
    let settings: { permissions?: { allow?: string[] } } = {};
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch {
      // file doesn't exist or is malformed — start fresh
    }
    if (!settings.permissions) settings.permissions = {};
    if (!settings.permissions.allow) settings.permissions.allow = [];
    if (!settings.permissions.allow.includes(pattern)) {
      settings.permissions.allow.push(pattern);
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
    }
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  private broadcast(msg: ServerMessage): void {
    const payload = JSON.stringify(msg);
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }
}
