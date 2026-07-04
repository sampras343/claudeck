import { useEffect, useRef, useState, useCallback } from 'react';
import type { TrackedInstance } from '../types';
import { SafetyBadge } from './SafetyBadge';

interface AskUserPrompt {
  type: 'ask-user';
  questions: Array<{
    question: string;
    header: string;
    options: Array<{ label: string; description: string }>;
    multiSelect: boolean;
  }>;
}

interface ToolPermissionPrompt {
  type: 'tool-permission';
  toolName: string;
  input: Record<string, string>;
}

interface FreeTextPrompt {
  type: 'free-text';
  text: string;
}

type PendingPrompt = AskUserPrompt | ToolPermissionPrompt | FreeTextPrompt | { type: 'unknown' };

interface InputPromptModalProps {
  instance: TrackedInstance | null;
  isOpen: boolean;
  onClose: () => void;
  onReply: (sessionId: string, text: string) => void;
  onAllowAlways?: (sessionId: string, toolPattern: string) => void;
}

export function InputPromptModal({ instance, isOpen, onClose, onReply, onAllowAlways }: InputPromptModalProps) {
  const [customText, setCustomText] = useState('');
  const [prompt, setPrompt] = useState<PendingPrompt | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const fetchPrompt = useCallback(async (sessionId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/instances/${sessionId}/prompt`);
      if (res.ok) {
        setPrompt(await res.json());
      }
    } catch {
      // fall back to basic view
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && instance) {
      setCustomText('');
      setPrompt(null);
      fetchPrompt(instance.sessionId);
    }
  }, [isOpen, instance?.sessionId, fetchPrompt]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && !loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, loading]);

  if (!isOpen || !instance) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const reply = (text: string) => {
    onReply(instance.sessionId, text);
    onClose();
  };

  const handleSendCustom = () => {
    if (customText.trim()) {
      reply(customText.trim());
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-xl border border-gray-700 bg-gray-900 shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-100 truncate">{instance.name}</h2>
            {instance.safetyLevel && <SafetyBadge level={instance.safetyLevel} />}
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
              <span className="ml-3 text-sm text-gray-400">Loading prompt...</span>
            </div>
          ) : prompt?.type === 'ask-user' ? (
            <AskUserView prompt={prompt} onReply={reply} />
          ) : prompt?.type === 'tool-permission' ? (
            <ToolPermissionView prompt={prompt} instance={instance} onReply={reply} onAllowAlways={onAllowAlways} />
          ) : prompt?.type === 'free-text' ? (
            <FreeTextView prompt={prompt} />
          ) : (
            <div className="rounded-lg bg-gray-800 p-4">
              <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap break-all">
                {instance.needs || 'Waiting for input...'}
              </pre>
            </div>
          )}

          {instance.safetyLevel === 'DANGEROUS' && (
            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5">
              <p className="text-sm font-medium text-red-400">This operation is potentially destructive</p>
            </div>
          )}
        </div>

        {/* Footer — custom input always available */}
        <div className="border-t border-gray-800 px-5 py-4 flex-shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendCustom(); }}
              placeholder="Type a custom response..."
              className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
            />
            <button
              onClick={handleSendCustom}
              disabled={!customText.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── AskUserQuestion view ─────────────────────────────────── */

function AskUserView({ prompt, onReply }: { prompt: AskUserPrompt; onReply: (text: string) => void }) {
  return (
    <div className="space-y-4">
      {prompt.questions.map((q, qi) => (
        <div key={qi}>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">{q.header}</p>
          <p className="text-sm text-gray-200 mb-3">{q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt, oi) => (
              <button
                key={oi}
                onClick={() => onReply(opt.label)}
                className="w-full text-left rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 hover:border-blue-500/50 hover:bg-gray-750 transition-colors group"
              >
                <span className="text-sm font-medium text-gray-100 group-hover:text-blue-400 transition-colors">
                  {opt.label}
                </span>
                {opt.description && (
                  <span className="block text-xs text-gray-500 mt-0.5">{opt.description}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Tool permission view ──────────────────────────────────── */

function ToolPermissionView({
  prompt,
  instance,
  onReply,
  onAllowAlways,
}: {
  prompt: ToolPermissionPrompt;
  instance: TrackedInstance;
  onReply: (text: string) => void;
  onAllowAlways?: (sessionId: string, pattern: string) => void;
}) {
  const command = prompt.input.command ?? prompt.input.file_path ?? JSON.stringify(prompt.input);
  const baseCmd = typeof command === 'string' ? command.split(/\s+/)[0] : '';

  const handleAllowAlways = () => {
    if (onAllowAlways && baseCmd) {
      onAllowAlways(instance.sessionId, `${prompt.toolName}(${baseCmd}:*)`);
    }
    onReply('yes');
  };

  const handleAllowTool = () => {
    if (onAllowAlways) {
      onAllowAlways(instance.sessionId, prompt.toolName);
    }
    onReply('yes');
  };

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">
        {prompt.toolName} Permission
      </p>
      {prompt.input.description && (
        <p className="text-sm text-gray-400 mb-2">{prompt.input.description}</p>
      )}
      <div className="rounded-lg bg-gray-800 p-4 max-h-48 overflow-auto mb-4">
        <pre className="font-mono text-sm text-amber-300 whitespace-pre-wrap break-all">{command}</pre>
      </div>
      <div className="space-y-2">
        <div className="flex gap-2">
          <button onClick={() => onReply('yes')} className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors">
            Allow once
          </button>
          <button onClick={() => onReply('no')} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors">
            Deny
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAllowAlways} className="flex-1 rounded-lg border border-green-600/40 bg-green-600/10 px-3 py-2 text-sm font-medium text-green-400 hover:bg-green-600/20 transition-colors truncate" title={`Always allow ${prompt.toolName}(${baseCmd}:*)`}>
            Always allow <span className="font-mono text-xs">{baseCmd}</span>
          </button>
          <button onClick={handleAllowTool} className="flex-1 rounded-lg border border-blue-600/40 bg-blue-600/10 px-3 py-2 text-sm font-medium text-blue-400 hover:bg-blue-600/20 transition-colors truncate" title={`Always allow all ${prompt.toolName} commands`}>
            Always allow <span className="font-mono text-xs">{prompt.toolName}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Free-text assistant question view ─────────────────────── */

function FreeTextView({ prompt }: { prompt: FreeTextPrompt }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">Claude is asking</p>
      <div className="rounded-lg bg-gray-800 p-4 max-h-60 overflow-auto prose prose-invert prose-sm">
        <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap break-words">{prompt.text}</pre>
      </div>
    </div>
  );
}
