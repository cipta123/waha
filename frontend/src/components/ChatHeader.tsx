import { Conversation, SessionSummary } from '../lib/api';
import { classNames } from '../lib/utils';

interface ChatHeaderProps {
  selectedConversation: Conversation | null;
  sessions: SessionSummary[];
  onToggleAiMode: (mode: 'ai' | 'human') => void;
  onBack?: () => void;
}

export function ChatHeader({
  selectedConversation,
  sessions,
  onToggleAiMode,
  onBack,
}: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3 relative z-10">
      <div className="flex items-start gap-3 flex-1">
        {/* Back Button (Mobile Only) */}
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-2 -ml-2 rounded-full text-slate-500 hover:bg-slate-200 self-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}

        <div className="flex-1">
          <p className="text-xs uppercase text-slate-500">Conversation</p>
          <h1 className="text-xl font-semibold">
            {selectedConversation ? selectedConversation.title ?? selectedConversation.waChatId : "Select a conversation"}
          </h1>

          {/* AI Mode Toggle */}
          {selectedConversation && (
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                <span className="text-xs font-medium text-slate-600">AI Mode:</span>
                <button
                  onClick={() => onToggleAiMode(selectedConversation.mode === 'ai' ? 'human' : 'ai')}
                  className={classNames(
                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                    selectedConversation.mode === 'ai' ? "bg-blue-600" : "bg-slate-300"
                  )}
                >
                  <span
                    className={classNames(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      selectedConversation.mode === 'ai' ? "translate-x-5" : "translate-x-1"
                    )}
                  />
                </button>
                <span className={classNames(
                  "text-xs font-semibold",
                  selectedConversation.mode === 'ai' ? "text-blue-600" : "text-slate-600"
                )}>
                  {selectedConversation.mode === 'ai' ? 'ON' : 'OFF'}
                </span>
              </div>
              {selectedConversation.mode === 'ai' && selectedConversation.lastAiReplyAt && (
                <span className="text-xs text-slate-500 hidden sm:inline">
                  Last AI: {new Date(selectedConversation.lastAiReplyAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600">
        {sessions.map((session, index) => (
          <span
            key={session.id ?? session.session ?? `session-${index}`}
            className="rounded-full border border-slate-300 px-3 py-1"
          >
            {session.session ?? session.id}: {session.status ?? "unknown"}
          </span>
        ))}

      </div>
    </header>
  );
}
