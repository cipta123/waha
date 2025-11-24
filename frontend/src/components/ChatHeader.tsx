import { Conversation, SessionSummary, User } from '../lib/api';
import { classNames } from '../lib/utils';
import { useState, useEffect, useRef } from 'react';

interface ChatHeaderProps {
  selectedConversation: Conversation | null;
  sessions: SessionSummary[];
  onToggleAiMode: (mode: 'ai' | 'human') => void;
  onBack?: () => void;
  onResolve?: (conversationId: string) => void;
  onTransfer?: (conversationId: string, toUserId: string) => void;
  onDelete?: (conversationId: string) => void;
  currentUserId?: string;
  agents?: User[];
}

export function ChatHeader({
  selectedConversation,
  sessions,
  onToggleAiMode,
  onBack,
  onResolve,
  onTransfer,
  onDelete,
  currentUserId,
  agents = [],
}: ChatHeaderProps) {
  const [showTransferDropdown, setShowTransferDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTransferDropdown(false);
      }
    };

    if (showTransferDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTransferDropdown]);

  const handleTransferToAgent = (toUserId: string) => {
    if (selectedConversation && onTransfer) {
      onTransfer(selectedConversation.id, toUserId);
      setShowTransferDropdown(false);
    }
  };
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3 relative z-20">
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
              
              {/* Action Buttons - Only show for human mode conversations assigned to current user */}
              {selectedConversation.mode === 'human' && 
               selectedConversation.owner?.id === currentUserId && (
                <div className="flex items-center gap-2">
                  {/* Transfer to Another Agent - Dropdown */}
                  {onTransfer && agents.length > 0 && (
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setShowTransferDropdown(!showTransferDropdown)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Transfer
                      </button>
                      
                      {/* Dropdown Menu */}
                      {showTransferDropdown && (
                        <div className="absolute top-full right-0 mt-1 w-56 bg-white rounded-md shadow-xl border border-slate-200 py-1" style={{ zIndex: 1000 }}>
                          <div className="px-3 py-2 text-xs font-semibold text-slate-500 border-b border-slate-200">
                            Transfer to:
                          </div>
                          {agents
                            .filter(agent => agent.id !== currentUserId)
                            .map(agent => (
                              <button
                                key={agent.id}
                                onClick={() => handleTransferToAgent(agent.id)}
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 transition-colors"
                              >
                                <div className="font-medium">{agent.fullName}</div>
                                <div className="text-xs text-slate-500">@{agent.username}</div>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Mark as Resolved */}
                  {onResolve && (
                    <button
                      onClick={() => onResolve(selectedConversation.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Resolve
                    </button>
                  )}
                </div>
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
