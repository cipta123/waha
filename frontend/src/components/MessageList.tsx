import { RefObject, UIEvent } from 'react';
import { Conversation, Message } from '../lib/api';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  loadingMessages: boolean;
  loadingOlderMessages: boolean;
  selectedConversation: Conversation | null;
  onScroll: (e: UIEvent<HTMLDivElement>) => void;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onReply: (message: Message) => void;
  onImageClick: (url: string) => void;
}

export function MessageList({
  messages,
  loadingMessages,
  loadingOlderMessages,
  selectedConversation,
  onScroll,
  messagesContainerRef,
  messagesEndRef,
  openMenuId,
  setOpenMenuId,
  onReply,
  onImageClick,
}: MessageListProps) {
  return (
    <div 
        ref={messagesContainerRef} 
        className="flex-1 overflow-y-auto px-6 py-4" 
        onScroll={onScroll}
    >
      {loadingMessages ? (
        <p className="text-sm text-slate-500">Loading messages…</p>
      ) : selectedConversation ? (
        <ol className="flex flex-col gap-3">
          {/* Loading indicator for older messages */}
          {loadingOlderMessages && (
            <li className="flex justify-center py-2">
              <span className="text-xs text-slate-500">Loading older messages...</span>
            </li>
          )}
          
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              onReply={onReply}
              onImageClick={onImageClick}
            />
          ))}
          {/* Invisible element at the end for auto-scroll */}
          <div ref={messagesEndRef} />
        </ol>
      ) : (
        <div className="flex h-full items-center justify-center text-slate-500">
          Select a conversation to start chatting
        </div>
      )}
    </div>
  );
}
