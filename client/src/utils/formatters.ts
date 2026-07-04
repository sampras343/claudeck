import type { SafetyLevel } from '../types';

export function abbreviatePath(cwd: string): string {
  const home = '/home/' + cwd.split('/').filter(Boolean)[1] || '';
  let path = cwd;
  if (home && cwd.startsWith(home)) {
    path = '~' + cwd.slice(home.length);
  }
  const segments = path.split('/').filter(Boolean);
  if (segments.length <= 2) return path;
  const last2 = segments.slice(-2).join('/');
  return path.startsWith('~') ? '~/' + last2 : last2;
}

export function formatUptime(startedAt: number): string {
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - startedAt) / 1000));

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    const val = tokens / 1_000_000;
    return val % 1 === 0 ? `${val}M` : `${val.toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    const val = tokens / 1_000;
    return val % 1 === 0 ? `${val}K` : `${val.toFixed(1)}K`;
  }
  return String(tokens);
}

export function formatTimestamp(ts: number): string {
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - ts) / 1000));

  if (diff < 60) return 'just now';

  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function safetyColor(level: SafetyLevel): string {
  switch (level) {
    case 'SAFE':
      return 'text-green-400 bg-green-500/20 border-green-500/30';
    case 'MODERATE':
      return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    case 'RISKY':
      return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
    case 'DANGEROUS':
      return 'text-red-400 bg-red-500/20 border-red-500/30';
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'idle':
      return 'text-gray-400';
    case 'busy':
      return 'text-blue-500';
    case 'waiting':
      return 'text-amber-500';
    default:
      return 'text-gray-400';
  }
}
