"use client";

import { useEffect, useMemo, useState } from "react";
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
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 font-semibold">
          WA
        </div>
        <nav className="flex flex-col gap-4 text-sm">
          <button className="rounded-lg bg-white/20 px-3 py-2 font-semibold">Inbox</button>
          <button className="rounded-lg px-3 py-2 text-white/60 hover:bg-white/10">
            Contacts
          </button>
          <button className="rounded-lg px-3 py-2 text-white/60 hover:bg-white/10">
            Analytics
          </button>
        </nav>
        <div className="mt-auto text-center text-xs text-white/70">
          {health ? `API ${health.status}` : "Loading"}
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
                <p className="text-xs text-slate-500">{conversation.status}</p>
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
            {sessions.map((session) => (
              <span
                key={session.id ?? session.session}
                className="rounded-full border border-slate-300 px-3 py-1"
              >
                {session.session ?? session.id}: {session.status ?? "unknown"}
              </span>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
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
                  <span className="mt-1 block text-right text-[10px] opacity-70">
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
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
                sessions.map((session) => (
                  <div
                    key={session.id ?? session.session}
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
