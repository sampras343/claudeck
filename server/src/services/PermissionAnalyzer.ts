import fs from 'fs';
import path from 'path';
import { CLAUDE_DIR } from '../config.js';
import type { PermissionLevel, PermissionCategory, ParsedPermissionRule, PermissionProfile } from '../types.js';

const DANGEROUS_PATTERNS = [
  /\brm\s*-(rf|fr)\b/,
  /\bgit\s+push\s+.*(-f|--force)\b/,
  /\bgit\s+reset\s+--hard\b/,
  /\bgit\s+clean\s+-f\b/,
  /\bsudo\b/,
  /\bdd\b/,
  /\bmkfs\b/,
  /\.ssh\b/,
  /\.aws\b/,
  /\.gnupg\b/,
  /\bDROP\b/i,
  /\bDELETE\b/i,
  /\bTRUNCATE\b/i,
];

const RISKY_PATTERNS = [
  /\brm\b/,
  /\bgit\s+push\b/,
  /\bcurl\b/,
  /\bwget\b/,
  /\bdocker\b/,
  /\bpodman\b/,
  /\bkubectl\b/,
  /\bssh\b/,
  /\bscp\b/,
  /\bkill\b/,
  /\bpkill\b/,
  /\bnpm\s+publish\b/,
  /\bchmod\b/,
  /\bchown\b/,
];

const MODERATE_PATTERNS = [
  /\bnpm\s+(install|ci|run|test)\b/,
  /\bgo\s+(build|test|mod)\b/,
  /\bmake\b/,
  /\bgit\s+(add|commit|checkout|switch|stash)\b/,
  /\bmkdir\b/,
  /\bcp\b/,
  /\bmv\b/,
  /\bpython\b/,
  /\bnode\b/,
  /\bsed\b/,
  /\bawk\b/,
];

const SAFE_PATTERNS = [
  /\b(ls|cat|head|tail|wc|file|stat)\b/,
  /\bgrep\b/,
  /\bfind\b/,
  /\bgit\s+(status|log|diff|branch|show|rev-parse)\b/,
  /\btsc\b/,
  /\b(which|type|pwd|echo|printf)\b/,
  /--version\b/,
];

const CATEGORY_POINTS: Record<PermissionCategory, number> = {
  unrestricted: 50,
  dangerous: 25,
  'file-broad': 20,
  risky: 15,
  moderate: 8,
  web: 5,
  'file-narrow': 3,
  safe: 2,
};

function parseToolAndPattern(raw: string): { tool: string; pattern?: string } {
  const match = raw.match(/^(\w+)\((.+)\)$/);
  if (match) {
    return { tool: match[1], pattern: match[2] };
  }
  return { tool: raw };
}

function classifyRule(tool: string, pattern?: string): { category: PermissionCategory; points: number } {
  if (tool === 'WebSearch' || tool === 'WebFetch') {
    return { category: 'web', points: CATEGORY_POINTS.web };
  }

  if (!pattern) {
    return { category: 'unrestricted', points: CATEGORY_POINTS.unrestricted };
  }

  if (pattern === '*') {
    return { category: 'unrestricted', points: CATEGORY_POINTS.unrestricted };
  }

  if (tool === 'Read' || tool === 'Write' || tool === 'Edit') {
    const isBroad = /\/\/home\/[^/]+\/\*\*$/.test(pattern) || pattern === '//**';
    return {
      category: isBroad ? 'file-broad' : 'file-narrow',
      points: CATEGORY_POINTS[isBroad ? 'file-broad' : 'file-narrow'],
    };
  }

  if (tool === 'WebSearch' || tool === 'WebFetch') {
    return { category: 'web', points: CATEGORY_POINTS.web };
  }

  const textToCheck = `${tool} ${pattern}`;

  for (const p of DANGEROUS_PATTERNS) {
    if (p.test(textToCheck)) {
      return { category: 'dangerous', points: CATEGORY_POINTS.dangerous };
    }
  }

  for (const p of SAFE_PATTERNS) {
    if (p.test(textToCheck)) {
      return { category: 'safe', points: CATEGORY_POINTS.safe };
    }
  }

  for (const p of MODERATE_PATTERNS) {
    if (p.test(textToCheck)) {
      return { category: 'moderate', points: CATEGORY_POINTS.moderate };
    }
  }

  for (const p of RISKY_PATTERNS) {
    if (p.test(textToCheck)) {
      return { category: 'risky', points: CATEGORY_POINTS.risky };
    }
  }

  return { category: 'moderate', points: CATEGORY_POINTS.moderate };
}

export function parsePermissionRule(
  raw: string,
  source: 'global' | 'project-shared' | 'project-local',
): ParsedPermissionRule {
  const { tool, pattern } = parseToolAndPattern(raw);
  const { category, points } = classifyRule(tool, pattern);

  let adjustedPoints = points;
  if (pattern && pattern.endsWith(':*') && category !== 'unrestricted') {
    adjustedPoints = Math.ceil(points * 1.5);
  }

  return { raw, tool, pattern, category, points: adjustedPoints, source };
}

function readAllowList(filePath: string): string[] {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return data?.permissions?.allow ?? [];
  } catch {
    return [];
  }
}

export function readMergedPermissions(cwd: string): {
  global: string[];
  projectShared: string[];
  projectLocal: string[];
} {
  return {
    global: readAllowList(path.join(CLAUDE_DIR, 'settings.json')),
    projectShared: readAllowList(path.join(cwd, '.claude', 'settings.json')),
    projectLocal: readAllowList(path.join(cwd, '.claude', 'settings.local.json')),
  };
}

function scoreToLevel(score: number): PermissionLevel {
  if (score <= 20) return 'RESTRICTIVE';
  if (score <= 60) return 'MODERATE';
  if (score <= 120) return 'PERMISSIVE';
  return 'UNRESTRICTED';
}

function applyEscalation(rules: ParsedPermissionRule[], baseLevel: PermissionLevel): PermissionLevel {
  const levels: PermissionLevel[] = ['RESTRICTIVE', 'MODERATE', 'PERMISSIVE', 'UNRESTRICTED'];
  let floor = levels.indexOf(baseLevel);

  for (const rule of rules) {
    if (rule.category === 'unrestricted') {
      floor = Math.max(floor, 3); // UNRESTRICTED
    } else if (rule.category === 'file-broad') {
      floor = Math.max(floor, 2); // PERMISSIVE
    } else if (rule.category === 'dangerous') {
      floor = Math.max(floor, 2); // PERMISSIVE
    }
  }

  return levels[floor];
}

export function analyzePermissions(cwd: string): PermissionProfile {
  const sources = readMergedPermissions(cwd);

  const rules: ParsedPermissionRule[] = [
    ...sources.global.map(r => parsePermissionRule(r, 'global')),
    ...sources.projectShared.map(r => parsePermissionRule(r, 'project-shared')),
    ...sources.projectLocal.map(r => parsePermissionRule(r, 'project-local')),
  ];

  const score = rules.reduce((sum, r) => sum + r.points, 0);
  const baseLevel = scoreToLevel(score);
  const level = applyEscalation(rules, baseLevel);

  return { level, score, ruleCount: rules.length, rules, sources };
}

export function computePermissionLevel(cwd: string): { level: PermissionLevel; ruleCount: number } {
  const { level, ruleCount } = analyzePermissions(cwd);
  return { level, ruleCount };
}
