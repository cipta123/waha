import { Conversation } from '../lib/api';
import { classNames, formatTime } from '../lib/utils';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  loading: boolean;
  searchTerm: string;
}

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  loading,
  searchTerm,
}: ConversationListProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      {loading ? (
        <p className="px-6 py-4 text-sm text-slate-500">Loading conversations…</p>
      ) : conversations.length === 0 ? (
        <p className="px-6 py-4 text-sm text-slate-500">
          {searchTerm.trim() ? "No conversations match your search." : "No conversations yet."}
        </p>
      ) : (
        conversations.map((conversation) => (
          <button
            key={conversation.id}
            className={classNames(
              "flex w-full flex-col gap-1 border-b border-slate-100 px-6 py-4 text-left hover:bg-slate-50",
              conversation.id === selectedConversationId && "bg-blue-50 hover:bg-blue-50",
            )}
            onClick={() => onSelectConversation(conversation.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={classNames(
                  "font-medium truncate",
                  conversation.unreadCount > 0 ? "text-slate-900" : "text-slate-900"
                )}>
                  {conversation.title ?? conversation.waChatId}
                </span>
                {/* AI/Human Mode Badge */}
                <span className={classNames(
                  "flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded",
                  conversation.mode === 'ai' 
                    ? "bg-blue-100 text-blue-700" 
                    : "bg-green-100 text-green-700"
                )}>
                  {conversation.mode === 'ai' ? '🤖' : '👤'}
                </span>
                {conversation.unreadCount > 0 && (
                  <span className="flex-shrink-0 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-green-500 text-white text-xs font-bold">
                    {conversation.unreadCount}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
                {conversation.lastMessageAt ? formatTime(conversation.lastMessageAt.toString()) : ""}
              </span>
            </div>
            {conversation.lastMessage ? (
               <p className="line-clamp-1 text-sm text-slate-500">
                 {conversation.lastMessage.direction === 'outgoing' && 'You: '}
                 {conversation.lastMessage.text}
               </p>
             ) : (
               <p className="text-sm text-slate-400 italic">No messages</p>
             )}
          </button>
        ))
      )}
    </div>
  );
}
