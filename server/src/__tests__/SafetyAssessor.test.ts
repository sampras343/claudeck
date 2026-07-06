import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assessSafety } from '../services/SafetyAssessor.js';

describe('SafetyAssessor', () => {
  describe('SAFE classifications', () => {
    it('classifies Read tool as SAFE', () => {
      const result = assessSafety('approve Read: /path/to/file');
      assert.strictEqual(result.level, 'SAFE');
      assert.strictEqual(result.toolName, 'Read');
    });

    it('classifies "ls -la" as SAFE', () => {
      const result = assessSafety('approve Bash: ls -la');
      assert.strictEqual(result.level, 'SAFE');
      assert.strictEqual(result.toolName, 'Bash');
    });

    it('classifies "grep -r pattern ." as SAFE', () => {
      const result = assessSafety('approve Bash: grep -r pattern .');
      assert.strictEqual(result.level, 'SAFE');
    });

    it('classifies "git status" as SAFE', () => {
      const result = assessSafety('approve Bash: git status');
      assert.strictEqual(result.level, 'SAFE');
    });

    it('classifies "git log --oneline" as SAFE', () => {
      const result = assessSafety('approve Bash: git log --oneline');
      assert.strictEqual(result.level, 'SAFE');
    });

    it('classifies "tsc --noEmit" as SAFE', () => {
      const result = assessSafety('approve Bash: tsc --noEmit');
      assert.strictEqual(result.level, 'SAFE');
    });
  });

  describe('MODERATE classifications', () => {
    it('classifies Edit tool as MODERATE', () => {
      const result = assessSafety('approve Edit: file.ts');
      assert.strictEqual(result.level, 'MODERATE');
      assert.strictEqual(result.toolName, 'Edit');
    });

    it('classifies "npm install express" as MODERATE', () => {
      const result = assessSafety('approve Bash: npm install express');
      assert.strictEqual(result.level, 'MODERATE');
    });

    it('classifies "git commit -m msg" as MODERATE', () => {
      const result = assessSafety("approve Bash: git commit -m 'msg'");
      assert.strictEqual(result.level, 'MODERATE');
    });
  });

  describe('RISKY classifications', () => {
    it('classifies "rm file.txt" as RISKY', () => {
      const result = assessSafety('approve Bash: rm file.txt');
      assert.strictEqual(result.level, 'RISKY');
    });

    it('classifies "git push origin main" as RISKY', () => {
      const result = assessSafety('approve Bash: git push origin main');
      assert.strictEqual(result.level, 'RISKY');
    });

    it('classifies "curl https://example.com" as RISKY', () => {
      const result = assessSafety('approve Bash: curl https://example.com');
      assert.strictEqual(result.level, 'RISKY');
    });
  });

  describe('DANGEROUS classifications', () => {
    it('classifies "rm -rf /tmp/test" as DANGEROUS', () => {
      const result = assessSafety('approve Bash: rm -rf /tmp/test');
      assert.strictEqual(result.level, 'DANGEROUS');
    });

    it('classifies "git push --force" as DANGEROUS', () => {
      const result = assessSafety('approve Bash: git push --force');
      assert.strictEqual(result.level, 'DANGEROUS');
    });

    it('classifies "sudo apt install pkg" as DANGEROUS', () => {
      const result = assessSafety('approve Bash: sudo apt install pkg');
      assert.strictEqual(result.level, 'DANGEROUS');
    });
  });

  describe('free-text questions', () => {
    it('classifies free-text question as RISKY by default', () => {
      const result = assessSafety('Should I refactor this module?');
      assert.strictEqual(result.level, 'RISKY');
      assert.strictEqual(result.reason, 'Free-text question requires user judgment');
      assert.strictEqual(result.command, undefined);
      assert.strictEqual(result.toolName, undefined);
    });
  });

  describe('assessment metadata', () => {
    it('includes command and toolName for approve-style inputs', () => {
      const result = assessSafety('approve Bash: ls -la');
      assert.strictEqual(result.command, 'ls -la');
      assert.strictEqual(result.toolName, 'Bash');
    });

    it('includes a reason string', () => {
      const result = assessSafety('approve Read: /path/to/file');
      assert.ok(result.reason.length > 0);
    });
  });
});
