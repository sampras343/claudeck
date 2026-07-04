import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { GROUPS_PATH } from '../config.js';
import type { Group } from '../types.js';

export class GroupManager {
  private groups: Group[] = [];

  constructor() {
    this.load();
  }

  getAll(): Group[] {
    return [...this.groups];
  }

  create(name: string): Group {
    const group: Group = {
      id: uuidv4(),
      name,
      collapsed: false,
      instanceIds: [],
    };
    this.groups.push(group);
    this.persist();
    return group;
  }

  update(id: string, updates: { name?: string; collapsed?: boolean }): Group {
    const group = this.groups.find((g) => g.id === id);
    if (!group) {
      throw new Error(`Group not found: ${id}`);
    }
    if (updates.name !== undefined) group.name = updates.name;
    if (updates.collapsed !== undefined) group.collapsed = updates.collapsed;
    this.persist();
    return group;
  }

  delete(id: string): void {
    const idx = this.groups.findIndex((g) => g.id === id);
    if (idx === -1) {
      throw new Error(`Group not found: ${id}`);
    }
    this.groups.splice(idx, 1);
    this.persist();
  }

  addInstance(groupId: string, sessionId: string): void {
    // Remove from any existing group first
    for (const group of this.groups) {
      const idx = group.instanceIds.indexOf(sessionId);
      if (idx !== -1) {
        group.instanceIds.splice(idx, 1);
      }
    }

    const group = this.groups.find((g) => g.id === groupId);
    if (!group) {
      throw new Error(`Group not found: ${groupId}`);
    }
    if (!group.instanceIds.includes(sessionId)) {
      group.instanceIds.push(sessionId);
    }
    this.persist();
  }

  removeInstance(groupId: string, sessionId: string): void {
    const group = this.groups.find((g) => g.id === groupId);
    if (!group) {
      throw new Error(`Group not found: ${groupId}`);
    }
    const idx = group.instanceIds.indexOf(sessionId);
    if (idx !== -1) {
      group.instanceIds.splice(idx, 1);
    }
    this.persist();
  }

  getGroupForInstance(sessionId: string): string | null {
    for (const group of this.groups) {
      if (group.instanceIds.includes(sessionId)) {
        return group.id;
      }
    }
    return null;
  }

  persist(): void {
    try {
      fs.writeFileSync(GROUPS_PATH, JSON.stringify(this.groups, null, 2), 'utf-8');
    } catch (err) {
      console.error('[GroupManager] Failed to persist groups:', err);
    }
  }

  load(): void {
    try {
      if (!fs.existsSync(GROUPS_PATH)) {
        this.groups = [];
        return;
      }
      const raw = fs.readFileSync(GROUPS_PATH, 'utf-8');
      this.groups = JSON.parse(raw);
    } catch {
      this.groups = [];
    }
  }
}
