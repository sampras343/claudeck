import type { PermissionLevel } from '../types';
import { permissionLevelColor } from '../utils/formatters';

interface PermissionBadgeProps {
  level: PermissionLevel;
  ruleCount?: number;
  onClick?: () => void;
}

export function PermissionBadge({ level, ruleCount, onClick }: PermissionBadgeProps) {
  const colors = permissionLevelColor(level);
  const className = `inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${colors} ${onClick ? 'cursor-pointer hover:brightness-125 transition-all' : ''}`;

  const content = (
    <>
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      {level}
      {ruleCount != null && (
        <span className="opacity-60">({ruleCount})</span>
      )}
    </>
  );

  if (onClick) {
    return <button onClick={onClick} className={className}>{content}</button>;
  }
  return <span className={className}>{content}</span>;
}
