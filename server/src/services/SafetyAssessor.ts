import type { SafetyLevel, SafetyAssessment } from '../types.js';

const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\brm\s+-(rf|fr)\b/, reason: 'Recursive forced deletion' },
  { pattern: /\bgit\s+push\s+.*(-f|--force)\b/, reason: 'Force push can rewrite remote history' },
  { pattern: /\bgit\s+reset\s+--hard\b/, reason: 'Hard reset discards uncommitted changes' },
  { pattern: /\bgit\s+clean\s+-f\b/, reason: 'Clean -f removes untracked files permanently' },
  { pattern: /\bsudo\b/, reason: 'Elevated privileges' },
  { pattern: /\bdd\b/, reason: 'Low-level disk write' },
  { pattern: /\bmkfs\b/, reason: 'Filesystem format command' },
  { pattern: /~\/\.ssh\//, reason: 'Accessing SSH credentials' },
  { pattern: /~\/\.aws\//, reason: 'Accessing AWS credentials' },
  { pattern: /~\/\.gnupg\//, reason: 'Accessing GPG keyring' },
  { pattern: /\bDROP\b/i, reason: 'Database DROP operation' },
  { pattern: /\bDELETE\b/i, reason: 'Database DELETE operation' },
  { pattern: /\bTRUNCATE\b/i, reason: 'Database TRUNCATE operation' },
];

const RISKY_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\brm\b/, reason: 'File deletion' },
  { pattern: /\bgit\s+push\b/, reason: 'Push to remote repository' },
  { pattern: /\bcurl\b/, reason: 'Network request via curl' },
  { pattern: /\bwget\b/, reason: 'Network download via wget' },
  { pattern: /\bdocker\b/, reason: 'Docker container operation' },
  { pattern: /\bpodman\b/, reason: 'Podman container operation' },
  { pattern: /\bkubectl\b/, reason: 'Kubernetes cluster operation' },
  { pattern: /\bssh\b/, reason: 'SSH remote connection' },
  { pattern: /\bscp\b/, reason: 'Secure copy to/from remote' },
  { pattern: /\bkill\b/, reason: 'Process termination' },
  { pattern: /\bpkill\b/, reason: 'Process termination by name' },
  { pattern: /\bnpm\s+publish\b/, reason: 'Publishing package to npm' },
  { pattern: /\bchmod\b/, reason: 'Changing file permissions' },
  { pattern: /\bchown\b/, reason: 'Changing file ownership' },
];

const MODERATE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bEdit\b/, reason: 'File edit tool' },
  { pattern: /\bWrite\b/, reason: 'File write tool' },
  { pattern: /\bnpm\s+(install|ci|run|test)\b/, reason: 'npm operation' },
  { pattern: /\bgo\s+(build|test|mod)\b/, reason: 'Go build/test operation' },
  { pattern: /\bmake\b/, reason: 'Make build command' },
  { pattern: /\bgit\s+(add|commit|checkout|switch|stash)\b/, reason: 'Git working tree operation' },
  { pattern: /\bmkdir\b/, reason: 'Directory creation' },
  { pattern: /\bcp\b/, reason: 'File copy' },
  { pattern: /\bmv\b/, reason: 'File move/rename' },
  { pattern: /\bpython\b/, reason: 'Python script execution' },
  { pattern: /\bnode\b/, reason: 'Node.js script execution' },
  { pattern: /\bsed\b/, reason: 'Stream editor' },
  { pattern: /\bawk\b/, reason: 'AWK text processing' },
];

const SAFE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bRead\b/, reason: 'Read-only file access' },
  { pattern: /\b(ls|cat|head|tail|wc|file|stat)\b/, reason: 'Read-only file inspection' },
  { pattern: /\bgrep\b/, reason: 'Text search' },
  { pattern: /\bfind\b(?!.*-delete)/, reason: 'File search (no delete)' },
  { pattern: /\bgit\s+(status|log|diff|branch|show|rev-parse)\b/, reason: 'Read-only git operation' },
  { pattern: /\btsc\s+--noEmit\b/, reason: 'TypeScript type check (no output)' },
  { pattern: /\b(which|type|pwd|echo|printf)\b/, reason: 'Read-only shell command' },
  { pattern: /--version\b/, reason: 'Version check' },
  { pattern: /-v\b/, reason: 'Version check' },
];

export function assessSafety(needs: string): SafetyAssessment {
  // Parse "approve <ToolName>: <details>" format
  const approveMatch = needs.match(/^approve\s+(\w+):\s*(.*)$/is);

  if (approveMatch) {
    const toolName = approveMatch[1];
    const details = approveMatch[2];
    const textToCheck = `${toolName} ${details}`;

    // Check DANGEROUS first
    for (const { pattern, reason } of DANGEROUS_PATTERNS) {
      if (pattern.test(textToCheck)) {
        return { level: 'DANGEROUS', reason, command: details, toolName };
      }
    }

    // Check SAFE before RISKY to catch read-only patterns
    for (const { pattern, reason } of SAFE_PATTERNS) {
      if (pattern.test(textToCheck)) {
        return { level: 'SAFE', reason, command: details, toolName };
      }
    }

    // Check MODERATE
    for (const { pattern, reason } of MODERATE_PATTERNS) {
      if (pattern.test(textToCheck)) {
        return { level: 'MODERATE', reason, command: details, toolName };
      }
    }

    // Check RISKY
    for (const { pattern, reason } of RISKY_PATTERNS) {
      if (pattern.test(textToCheck)) {
        return { level: 'RISKY', reason, command: details, toolName };
      }
    }

    // Default for approve-style: MODERATE (unknown tool/command)
    return {
      level: 'MODERATE',
      reason: 'Unknown tool or command, defaulting to moderate',
      command: details,
      toolName,
    };
  }

  // Free-text question (no "approve" prefix)
  // Check patterns against the raw text
  for (const { pattern, reason } of DANGEROUS_PATTERNS) {
    if (pattern.test(needs)) {
      return { level: 'DANGEROUS', reason };
    }
  }

  // Default to RISKY for free-text questions
  return {
    level: 'RISKY',
    reason: 'Free-text question requires user judgment',
  };
}
