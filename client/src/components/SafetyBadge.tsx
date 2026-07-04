import type { SafetyLevel } from '../types';

interface SafetyBadgeProps {
  level: SafetyLevel;
}

export function SafetyBadge({ level }: SafetyBadgeProps) {
  const config: Record<SafetyLevel, string> = {
    SAFE: 'bg-green-500/20 text-green-400 border-green-500/30',
    MODERATE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    RISKY: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    DANGEROUS: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config[level]}`}
    >
      {level}
    </span>
  );
}
