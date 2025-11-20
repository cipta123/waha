"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchConversations,
  fetchHealth,
  fetchMessages,
  fetchSessions,
  sendTextMessage,
  type Conversation,
  type Message,
  type SessionSummary,
  type HealthResponse,
} from "@/lib/api";

function classNames(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function InboxPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [composerText, setComposerText] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref for auto-scroll to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const selectedConversation = useMemo(
    () => conversations.find((conv) => conv.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  useEffect(() => {
    void bootstrap();
  }, []);

  // Poll for new conversations every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const conversationsRes = await fetchConversations();
        setConversations(conversationsRes);
      } catch (err) {
        console.error('Failed to refresh conversations:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Poll for new messages in selected conversation every 3 seconds
  useEffect(() => {
    if (!selectedConversationId) return;

    const interval = setInterval(async () => {
      try {
        const data = await fetchMessages(selectedConversationId);
        setMessages(data);
      } catch (err) {
        console.error('Failed to refresh messages:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedConversationId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  async function bootstrap() {
    try {
      setLoadingConversations(true);
      const [healthRes, sessionsRes, conversationsRes] = await Promise.all([
        fetchHealth(),
        fetchSessions(),
        fetchConversations(),
      ]);
      setHealth(healthRes);
      setSessions(sessionsRes);
      setConversations(conversationsRes);
      if (conversationsRes.length > 0) {
        await selectConversation(conversationsRes[0].id);
      }
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setLoadingConversations(false);
    }
  }

  async function selectConversation(conversationId: string) {
    setSelectedConversationId(conversationId);
    setLoadingMessages(true);
    try {
      const data = await fetchMessages(conversationId);
      setMessages(data);
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function handleSend() {
    if (!selectedConversation?.waChatId || !composerText.trim()) {
      return;
    }
    const text = composerText.trim();
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      direction: "outgoing",
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setComposerText("");
    setSending(true);
    try {
      await sendTextMessage({
        chatId: selectedConversation.waChatId,
        text,
      });
    } catch (err) {
      console.error(err);
      setError((err as Error).message ?? "Failed to send message");
      // revert optimistic update
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
      setComposerText(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex h-screen min-h-[640px] w-full overflow-hidden">
      {/* Left rail */}
      <aside className="flex w-16 flex-col items-center gap-6 bg-slate-900 py-6 text-white">
        {/* Logo */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 font-semibold text-sm">
          WA
        </div>

        {/* Navigation Icons */}
        <nav className="flex flex-col gap-4">
          {/* Inbox */}
          <button 
            className="group relative flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            title="Inbox"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <span className="absolute left-full ml-2 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs">
              Inbox
            </span>
          </button>

          {/* Contacts */}
          <button 
            className="group relative flex h-10 w-10 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            title="Contacts"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="absolute left-full ml-2 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs">
              Contacts
            </span>
          </button>

          {/* Analytics */}
          <button 
            className="group relative flex h-10 w-10 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            title="Analytics"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="absolute left-full ml-2 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs">
              Analytics
            </span>
          </button>
        </nav>

        {/* Settings - Bottom section */}
        <div className="mt-auto flex flex-col gap-4">
          <button 
            className="group relative flex h-10 w-10 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            title="Settings"
            onClick={() => window.location.href = '/settings'}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="absolute left-full ml-2 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs">
              Settings
            </span>
          </button>

          {/* Health Status */}
          <div className="group relative flex h-10 w-10 items-center justify-center">
            <div className={`h-2 w-2 rounded-full ${health?.status === 'ok' ? 'bg-green-400' : 'bg-gray-400'}`} />
            <span className="absolute left-full ml-2 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs">
              {health ? `API ${health.status}` : "Loading"}
            </span>
          </div>
        </div>
      </aside>

      {/* Conversation list */}
      <section className="flex w-80 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Assigned</p>
            <h2 className="text-lg font-semibold">Inbox</h2>
          </div>
          <button
            className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
            onClick={() => bootstrap()}
            disabled={loadingConversations}
          >
            Refresh
          </button>
        </div>
        <div className="px-4 py-2">
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Search conversations"
            disabled
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <p className="px-6 py-4 text-sm text-slate-500">Loading conversations…</p>
          ) : conversations.length === 0 ? (
            <p className="px-6 py-4 text-sm text-slate-500">No conversations yet.</p>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                className={classNames(
                  "flex w-full flex-col gap-1 border-b border-slate-100 px-6 py-4 text-left hover:bg-slate-50",
                  conversation.id === selectedConversationId && "bg-blue-50 hover:bg-blue-50",
                )}
                onClick={() => selectConversation(conversation.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">
                    {conversation.title ?? conversation.waChatId}
                  </span>
                  <span className="text-xs text-slate-500">
                    {conversation.lastMessageAt
                      ? new Date(conversation.lastMessageAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                </div>
                {conversation.lastMessage ? (
                  <p className="truncate text-xs text-slate-500">
                    {conversation.lastMessage.direction === 'outgoing' && (
                      <span className="mr-1">✓</span>
                    )}
                    {conversation.lastMessage.text}
                  </p>
                ) : (
                  <p className="text-xs italic text-slate-400">No messages yet</p>
                )}
              </button>
            ))
          )}
        </div>
      </section>

      {/* Chat area */}
      <section className="flex min-w-0 flex-1 flex-col bg-slate-25">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
          <div>
            <p className="text-xs uppercase text-slate-500">Conversation</p>
            <h1 className="text-xl font-semibold">
              {selectedConversation ? selectedConversation.title ?? selectedConversation.waChatId : "Select a conversation"}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
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

        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 py-4">
          {loadingMessages ? (
            <p className="text-sm text-slate-500">Loading messages…</p>
          ) : selectedConversation ? (
            <ol className="flex flex-col gap-3">
              {messages.map((message) => (
                <li
                  key={message.id}
                  className={classNames(
                    "max-w-xl rounded-2xl px-4 py-3 text-sm shadow-sm",
                    message.direction === "outgoing"
                      ? "self-end rounded-br-sm bg-blue-600 text-white"
                      : "self-start rounded-bl-sm bg-white text-slate-900",
                  )}
                >
                  {message.direction === "incoming" && message.senderName && (
                    <p className="mb-1 text-xs font-semibold text-slate-500">{message.senderName}</p>
                  )}
                  <p>{message.text}</p>
                  <span className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {message.direction === "outgoing" && (
                      <span className="ml-1">
                        {message.ackStatus === 'read' && '✓✓'}
                        {message.ackStatus === 'delivered' && '✓✓'}
                        {message.ackStatus === 'sent' && '✓'}
                        {message.ackStatus === 'pending' && '🕐'}
                        {message.ackStatus === 'failed' && '❌'}
                      </span>
                    )}
                  </span>
                </li>
              ))}
              {/* Invisible element at the end for auto-scroll */}
              <div ref={messagesEndRef} />
            </ol>
          ) : (
            <p className="text-sm text-slate-500">Choose a conversation to start.</p>
          )}
        </div>

        <footer className="border-t border-slate-200 bg-white px-6 py-4">
          {error && (
            <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          )}
          <div className="flex items-end gap-3">
            <textarea
              className="h-20 flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
              placeholder={selectedConversation ? "Type your reply" : "Select a conversation"}
              value={composerText}
              onChange={(event) => setComposerText(event.target.value)}
              disabled={!selectedConversation || sending}
            />
            <button
              className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => void handleSend()}
              disabled={!selectedConversation || sending || !composerText.trim()}
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </footer>
      </section>

      {/* Context panel */}
      <aside className="hidden w-72 flex-col border-l border-slate-200 bg-white px-5 py-4 lg:flex">
        <div className="border-b border-slate-100 pb-4">
          <p className="text-xs uppercase text-slate-500">Contact Info</p>
          <h3 className="text-lg font-semibold">
            {selectedConversation ? selectedConversation.title ?? selectedConversation.waChatId : "Select contact"}
          </h3>
          <p className="text-xs text-slate-500">{selectedConversation?.waChatId ?? "wa chat id"}</p>
        </div>
        <div className="mt-4 space-y-4">
          <section>
            <p className="text-xs uppercase text-slate-500">Status</p>
            <div className="rounded-lg border border-slate-200 p-3 text-sm">
              {selectedConversation ? selectedConversation.status : "-"}
            </div>
          </section>
          <section>
            <p className="text-xs uppercase text-slate-500">Sessions</p>
            <div className="space-y-2 text-sm">
              {sessions.length === 0 ? (
                <p className="text-slate-500">No active sessions.</p>
              ) : (
                sessions.map((session, index) => (
                  <div
                    key={session.id ?? session.session ?? `session-${index}`}
                    className="rounded-lg border border-slate-200 p-2"
                  >
                    <p className="font-medium">{session.session ?? session.id}</p>
                    <p className="text-xs text-slate-500">{session.engine}</p>
                    <p className="text-xs">Status: {session.status}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </aside>
    </main>
  );
}
