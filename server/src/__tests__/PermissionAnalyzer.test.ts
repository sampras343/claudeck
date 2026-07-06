import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parsePermissionRule } from '../services/PermissionAnalyzer.js';

describe('PermissionAnalyzer', () => {
  describe('parsePermissionRule', () => {
    it('classifies bare tool name as unrestricted', () => {
      const rule = parsePermissionRule('Bash', 'global');
      assert.strictEqual(rule.tool, 'Bash');
      assert.strictEqual(rule.pattern, undefined);
      assert.strictEqual(rule.category, 'unrestricted');
      assert.strictEqual(rule.points, 50);
    });

    it('classifies Bash(*) as unrestricted', () => {
      const rule = parsePermissionRule('Bash(*)', 'global');
      assert.strictEqual(rule.category, 'unrestricted');
      assert.strictEqual(rule.points, 50);
    });

    it('classifies WebSearch as web', () => {
      const rule = parsePermissionRule('WebSearch', 'global');
      assert.strictEqual(rule.category, 'web');
    });

    it('classifies WebFetch domain as web', () => {
      const rule = parsePermissionRule('WebFetch(domain:github.com)', 'global');
      assert.strictEqual(rule.category, 'web');
      assert.strictEqual(rule.points, 5);
    });

    it('classifies Read(//home/user/**) as file-broad', () => {
      const rule = parsePermissionRule('Read(//home/sacm/**)', 'global');
      assert.strictEqual(rule.category, 'file-broad');
      assert.strictEqual(rule.points, 20);
    });

    it('classifies Read for specific project path as file-narrow', () => {
      const rule = parsePermissionRule('Read(//home/sacm/projects/myapp/src/**)', 'project-shared');
      assert.strictEqual(rule.category, 'file-narrow');
      assert.strictEqual(rule.source, 'project-shared');
    });

    it('classifies dangerous bash patterns', () => {
      const rule = parsePermissionRule('Bash(sudo apt:*)', 'global');
      assert.strictEqual(rule.category, 'dangerous');
    });

    it('classifies risky bash patterns', () => {
      const rule = parsePermissionRule('Bash(git push:*)', 'global');
      assert.strictEqual(rule.category, 'risky');
    });

    it('classifies moderate bash patterns', () => {
      const rule = parsePermissionRule('Bash(npm install:*)', 'project-local');
      assert.strictEqual(rule.category, 'moderate');
      assert.strictEqual(rule.source, 'project-local');
    });

    it('classifies safe bash patterns', () => {
      const rule = parsePermissionRule('Bash(git log:*)', 'global');
      assert.strictEqual(rule.category, 'safe');
    });

    it('applies wildcard multiplier for :* patterns', () => {
      const narrow = parsePermissionRule('Bash(git log)', 'global');
      const wild = parsePermissionRule('Bash(git log:*)', 'global');
      assert.ok(wild.points > narrow.points);
    });

    it('preserves raw string and source', () => {
      const rule = parsePermissionRule('Bash(npm install:*)', 'project-local');
      assert.strictEqual(rule.raw, 'Bash(npm install:*)');
      assert.strictEqual(rule.source, 'project-local');
    });
  });

  describe('scoring levels', () => {
    it('empty rules yield RESTRICTIVE via low score', () => {
      const rules: ReturnType<typeof parsePermissionRule>[] = [];
      const score = rules.reduce((sum, r) => sum + r.points, 0);
      assert.strictEqual(score, 0);
      assert.ok(score <= 20);
    });

    it('a few safe rules stay RESTRICTIVE', () => {
      const rules = [
        parsePermissionRule('Bash(git log:*)', 'global'),
        parsePermissionRule('Bash(git status:*)', 'global'),
        parsePermissionRule('Bash(ls:*)', 'global'),
      ];
      const score = rules.reduce((sum, r) => sum + r.points, 0);
      assert.ok(score <= 20, `Expected score <= 20, got ${score}`);
    });

    it('broad permissions yield high score', () => {
      const rules = [
        parsePermissionRule('Read(//home/sacm/**)', 'global'),
        parsePermissionRule('Bash(git push:*)', 'global'),
        parsePermissionRule('Bash(docker:*)', 'global'),
        parsePermissionRule('Bash(curl:*)', 'global'),
        parsePermissionRule('WebSearch', 'global'),
        parsePermissionRule('Bash(npm install:*)', 'global'),
        parsePermissionRule('Bash(npm run:*)', 'global'),
      ];
      const score = rules.reduce((sum, r) => sum + r.points, 0);
      assert.ok(score > 60, `Expected score > 60, got ${score}`);
    });

    it('unrestricted rule scores 50', () => {
      const rule = parsePermissionRule('Bash', 'global');
      assert.strictEqual(rule.points, 50);
    });
  });

  describe('escalation', () => {
    it('bare Bash has unrestricted category', () => {
      const rule = parsePermissionRule('Bash', 'global');
      assert.strictEqual(rule.category, 'unrestricted');
    });

    it('Read(//home/user/**) has file-broad category', () => {
      const rule = parsePermissionRule('Read(//home/sacm/**)', 'global');
      assert.strictEqual(rule.category, 'file-broad');
    });

    it('dangerous rule has dangerous category', () => {
      const rule = parsePermissionRule('Bash(sudo:*)', 'global');
      assert.strictEqual(rule.category, 'dangerous');
    });
  });
});
