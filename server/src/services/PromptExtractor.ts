import fs from 'fs';
import path from 'path';
import { PROJECTS_DIR } from '../config.js';

export interface AskUserPrompt {
  type: 'ask-user';
  toolUseId: string;
  questions: Array<{
    question: string;
    header: string;
    options: Array<{ label: string; description: string }>;
    multiSelect: boolean;
  }>;
}

export interface ToolPermissionPrompt {
  type: 'tool-permission';
  toolName: string;
  toolUseId: string;
  input: Record<string, unknown>;
}

export interface FreeTextPrompt {
  type: 'free-text';
  text: string;
}

export type PendingPrompt = AskUserPrompt | ToolPermissionPrompt | FreeTextPrompt | { type: 'unknown' };

function encodeCwd(cwd: string): string {
  return cwd.replace(/[/_]/g, '-');
}

export function extractPendingPrompt(sessionId: string, cwd: string): PendingPrompt {
  const projectDir = path.join(PROJECTS_DIR, encodeCwd(cwd));
  const transcriptPath = path.join(projectDir, `${sessionId}.jsonl`);

  if (!fs.existsSync(transcriptPath)) {
    return { type: 'unknown' };
  }

  const raw = fs.readFileSync(transcriptPath, 'utf-8');
  const lines = raw.trimEnd().split('\n');

  // Read from the end to find the latest pending prompt
  const tail = lines.slice(-30);

  let lastAssistantToolUse: ToolPermissionPrompt | AskUserPrompt | null = null;
  let lastAssistantText: string | null = null;

  for (const line of tail) {
    try {
      const entry = JSON.parse(line);
      const msg = entry.message;
      if (!msg) continue;

      if (msg.role === 'assistant' && Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'tool_use') {
            if (block.name === 'AskUserQuestion') {
              lastAssistantToolUse = {
                type: 'ask-user',
                toolUseId: block.id,
                questions: block.input?.questions ?? [],
              };
              lastAssistantText = null;
            } else {
              lastAssistantToolUse = {
                type: 'tool-permission',
                toolName: block.name,
                toolUseId: block.id,
                input: block.input ?? {},
              };
              lastAssistantText = null;
            }
          } else if (block.type === 'text' && block.text) {
            lastAssistantText = block.text;
            lastAssistantToolUse = null;
          }
        }
      }

      // If a user tool_result follows the tool_use, the prompt was already answered
      if (msg.role === 'user' && Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'tool_result' && lastAssistantToolUse && block.tool_use_id === lastAssistantToolUse.toolUseId) {
            lastAssistantToolUse = null;
          }
        }
      }
    } catch {
      // skip malformed lines
    }
  }

  if (lastAssistantToolUse) return lastAssistantToolUse;
  if (lastAssistantText) return { type: 'free-text', text: lastAssistantText };
  return { type: 'unknown' };
}
