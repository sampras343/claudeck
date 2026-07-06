import fs from 'fs';
import path from 'path';
import { CLAUDE_DIR } from '../config.js';
import type { Notification, WebhookConfig } from '../types.js';

const WEBHOOKS_PATH = path.join(CLAUDE_DIR, 'claupilot-webhooks.json');

export class NotificationDispatcher {
  private configs: WebhookConfig[] = [];

  constructor() {
    this.loadConfigs();
  }

  getConfigs(): WebhookConfig[] {
    return [...this.configs];
  }

  setConfigs(configs: WebhookConfig[]): void {
    this.configs = configs;
    this.saveConfigs();
  }

  async dispatch(notification: Notification): Promise<void> {
    for (const config of this.configs) {
      if (!config.events.includes(notification.type) && !config.events.includes('*')) {
        continue;
      }

      try {
        const body = this.formatPayload(notification, config.format);
        await fetch(config.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10000),
        });
      } catch (err) {
        console.error(
          `[NotificationDispatcher] Failed to dispatch to ${config.url}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  private formatPayload(notification: Notification, format: WebhookConfig['format']): unknown {
    switch (format) {
      case 'slack':
        return this.formatSlack(notification);
      case 'discord':
        return this.formatDiscord(notification);
      case 'generic':
      default:
        return notification;
    }
  }

  private formatSlack(notification: Notification): unknown {
    const levelEmoji: Record<string, string> = {
      SAFE: ':white_check_mark:',
      MODERATE: ':warning:',
      RISKY: ':x:',
      DANGEROUS: ':rotating_light:',
    };

    const emoji = notification.safetyLevel
      ? levelEmoji[notification.safetyLevel] ?? ':bell:'
      : ':bell:';

    return {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} *ClauPilot: ${notification.type}*\n${notification.message}`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Instance: *${notification.instanceName}* | Session: \`${notification.sessionId}\` | ${new Date(notification.timestamp).toISOString()}`,
            },
          ],
        },
      ],
    };
  }

  private formatDiscord(notification: Notification): unknown {
    const levelColor: Record<string, number> = {
      SAFE: 0x2ecc71,
      MODERATE: 0xf39c12,
      RISKY: 0xe74c3c,
      DANGEROUS: 0x8b0000,
    };

    return {
      embeds: [
        {
          title: `ClauPilot: ${notification.type}`,
          description: notification.message,
          color: notification.safetyLevel
            ? levelColor[notification.safetyLevel] ?? 0x3498db
            : 0x3498db,
          fields: [
            { name: 'Instance', value: notification.instanceName, inline: true },
            { name: 'Session', value: notification.sessionId, inline: true },
          ],
          timestamp: new Date(notification.timestamp).toISOString(),
        },
      ],
    };
  }

  private loadConfigs(): void {
    try {
      if (fs.existsSync(WEBHOOKS_PATH)) {
        const raw = fs.readFileSync(WEBHOOKS_PATH, 'utf-8');
        this.configs = JSON.parse(raw);
      }
    } catch {
      this.configs = [];
    }
  }

  private saveConfigs(): void {
    try {
      fs.mkdirSync(path.dirname(WEBHOOKS_PATH), { recursive: true });
      fs.writeFileSync(WEBHOOKS_PATH, JSON.stringify(this.configs, null, 2), 'utf-8');
    } catch (err) {
      console.error('[NotificationDispatcher] Failed to save webhook configs:', err);
    }
  }
}
