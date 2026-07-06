import { useEffect, useState, useCallback } from 'react';
import type { PermissionProfile, ParsedPermissionRule } from '../types';
import { PermissionBadge } from './PermissionBadge';

interface PermissionDetailPanelProps {
  sessionId: string | null;
  instanceName?: string;
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  unrestricted: 'bg-red-400',
  dangerous: 'bg-red-400',
  'file-broad': 'bg-orange-400',
  risky: 'bg-orange-400',
  moderate: 'bg-yellow-400',
  web: 'bg-blue-400',
  'file-narrow': 'bg-green-400',
  safe: 'bg-green-400',
};

const SOURCE_LABELS: Record<string, string> = {
  global: 'Global',
  'project-shared': 'Project',
  'project-local': 'Project Local',
};

function RuleRow({ rule }: { rule: ParsedPermissionRule }) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-800/50">
      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${CATEGORY_COLORS[rule.category] ?? 'bg-gray-400'}`} />
      <code className="text-xs text-gray-300 truncate flex-1" title={rule.raw}>
        <span className="text-blue-400">{rule.tool}</span>
        {rule.pattern && (
          <span className="text-gray-500">({rule.pattern})</span>
        )}
      </code>
      <span className="text-[10px] text-gray-600 flex-shrink-0">{rule.category}</span>
    </div>
  );
}

function SourceSection({ label, rules }: { label: string; rules: ParsedPermissionRule[] }) {
  if (rules.length === 0) return null;
  return (
    <div className="mb-3">
      <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1.5 px-2">
        {label} <span className="text-gray-600">({rules.length})</span>
      </h4>
      <div className="space-y-0.5">
        {rules.map((rule, i) => <RuleRow key={i} rule={rule} />)}
      </div>
    </div>
  );
}

export function PermissionDetailPanel({ sessionId, instanceName, isOpen, onClose }: PermissionDetailPanelProps) {
  const [profile, setProfile] = useState<PermissionProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async (sid: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/instances/${sid}/permissions`);
      if (res.ok) {
        setProfile(await res.json());
      }
    } catch {
      // fall back to empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && sessionId) {
      setProfile(null);
      fetchProfile(sessionId);
    }
  }, [isOpen, sessionId, fetchProfile]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen || !sessionId) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const globalRules = profile?.rules.filter(r => r.source === 'global') ?? [];
  const projectRules = profile?.rules.filter(r => r.source === 'project-shared') ?? [];
  const localRules = profile?.rules.filter(r => r.source === 'project-local') ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-xl border border-gray-700 bg-gray-900 shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <svg className="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-100 truncate">
              {instanceName ?? 'Permissions'}
            </h2>
            {profile && <PermissionBadge level={profile.level} />}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors flex-shrink-0" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto min-h-0 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500" />
              <span className="ml-3 text-sm text-gray-400">Loading permissions...</span>
            </div>
          ) : profile ? (
            <>
              {/* Score summary */}
              <div className="mb-4 rounded-lg bg-gray-800/50 p-3 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  <span className="font-medium text-gray-300">{profile.ruleCount}</span> rules across{' '}
                  {[globalRules.length > 0 && 'global', projectRules.length > 0 && 'project', localRules.length > 0 && 'local'].filter(Boolean).join(', ')} settings
                </div>
                <div className="text-xs text-gray-500">
                  Score: <span className="font-mono text-gray-400">{profile.score}</span>
                </div>
              </div>

              {/* Legend */}
              <div className="mb-4 flex flex-wrap gap-3 text-[10px] text-gray-500 px-2">
                {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                  <span key={cat} className="flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
                    {cat}
                  </span>
                ))}
              </div>

              {/* Rules by source */}
              <SourceSection label={SOURCE_LABELS.global} rules={globalRules} />
              <SourceSection label={SOURCE_LABELS['project-shared']} rules={projectRules} />
              <SourceSection label={SOURCE_LABELS['project-local']} rules={localRules} />

              {profile.ruleCount === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No explicit permissions configured.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Could not load permissions.</p>
          )}
        </div>
      </div>
    </div>
  );
}
