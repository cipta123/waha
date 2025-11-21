"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchConversations,
  fetchHealth,
  fetchMessages,
  fetchSessions,
  sendTextMessage,
  sendImageMessage,
  markConversationAsRead,
  toggleAiMode,
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [composerText, setComposerText] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newMessagePhone, setNewMessagePhone] = useState("");
  const [newMessageText, setNewMessageText] = useState("");
  
  // Ref for auto-scroll to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedConversation = useMemo(
    () => conversations.find((conv) => conv.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const filteredConversations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return conversations;

    return conversations.filter((conversation) => {
      const title = conversation.title?.toLowerCase() ?? "";
      const waChatId = conversation.waChatId.toLowerCase();
      const lastMessageText = conversation.lastMessage?.text?.toLowerCase() ?? "";

      return (
        title.includes(term) ||
        waChatId.includes(term) ||
        lastMessageText.includes(term)
      );
    });
  }, [conversations, searchTerm]);

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
      
      // Mark conversation as read
      await markConversationAsRead(conversationId);
      
      // Update local state to reflect read status
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setLoadingMessages(false);
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSendImage() {
    if (!selectedConversation?.waChatId || !selectedImage) return;

    const base64Data = selectedImage.split(',')[1];
    const mimeType = selectedImage.split(';')[0].split(':')[1];

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      direction: "outgoing",
      text: composerText.trim() || '[Image]',
      createdAt: new Date().toISOString(),
      mediaUrl: selectedImage,
      mediaType: 'image',
      mimeType,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setSelectedImage(null);
    setComposerText("");
    setSending(true);

    try {
      await sendImageMessage({
        chatId: selectedConversation.waChatId,
        file: { mimetype: mimeType, data: base64Data },
        caption: composerText.trim(),
      });
    } catch (err) {
      console.error(err);
      setError((err as Error).message ?? "Failed to send image");
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
    } finally {
      setSending(false);
    }
  }

  async function handleSend() {
    if (selectedImage) {
      await handleSendImage();
      return;
    }

    if (!selectedConversation?.waChatId || !composerText.trim()) {
      return;
    }
    const text = composerText.trim();
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      direction: "outgoing",
      text,
      createdAt: new Date().toISOString(),
      ...(replyingTo ? { quotedMsg: { id: replyingTo.id, text: replyingTo.text, senderName: replyingTo.senderName } } : {}),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setComposerText("");
    const replyToId = replyingTo?.waMessageId;
    setReplyingTo(null);
    setSending(true);
    try {
      await sendTextMessage({
        chatId: selectedConversation.waChatId,
        text,
        ...(replyToId ? { reply_to: replyToId } : {}),
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

  async function handleSendNewMessage() {
    if (!newMessagePhone.trim() || !newMessageText.trim()) {
      setError("Phone number and message are required");
      return;
    }

    // Format phone number to WhatsApp format (e.g., 628xxx@c.us)
    let formattedPhone = newMessagePhone.trim().replace(/\D/g, ''); // Remove non-digits
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.substring(1); // Replace leading 0 with 62
    } else if (!formattedPhone.startsWith('62')) {
      formattedPhone = '62' + formattedPhone; // Add 62 prefix
    }
    const chatId = `${formattedPhone}@c.us`;

    setSending(true);
    setError(null);
    try {
      const result = await sendTextMessage({
        chatId,
        text: newMessageText.trim(),
      });

      // Close modal and reset form
      setShowNewMessageModal(false);
      setNewMessagePhone("");
      setNewMessageText("");

      // Refresh conversations to show the new one
      const conversationsRes = await fetchConversations();
      setConversations(conversationsRes);

      // Find and select the new conversation
      const newConv = conversationsRes.find(c => c.id === result.conversationId);
      if (newConv) {
        await selectConversation(newConv.id);
      }
    } catch (err) {
      console.error(err);
      setError((err as Error).message ?? "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function handleToggleAiMode(mode: 'ai' | 'human') {
    if (!selectedConversation) return;

    try {
      await toggleAiMode(selectedConversation.id, mode);
      
      // Update local state
      setConversations(prev => prev.map(c => 
        c.id === selectedConversation.id ? { ...c, mode } : c
      ));
      
      // Update selected conversation
      const updated = { ...selectedConversation, mode };
      setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (err) {
      console.error('Failed to toggle AI mode:', err);
      setError((err as Error).message ?? "Failed to toggle AI mode");
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
          <div className="flex gap-2">
            <button
              className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
              onClick={() => bootstrap()}
              disabled={loadingConversations}
            >
              Refresh
            </button>
            <button
              className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
              onClick={() => setShowNewMessageModal(true)}
            >
              + New
            </button>
          </div>
        </div>
        <div className="px-4 py-2">
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Search conversations"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <p className="px-6 py-4 text-sm text-slate-500">Loading conversations…</p>
          ) : filteredConversations.length === 0 ? (
            <p className="px-6 py-4 text-sm text-slate-500">
              {searchTerm.trim() ? "No conversations match your search." : "No conversations yet."}
            </p>
          ) : (
            filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                className={classNames(
                  "flex w-full flex-col gap-1 border-b border-slate-100 px-6 py-4 text-left hover:bg-slate-50",
                  conversation.id === selectedConversationId && "bg-blue-50 hover:bg-blue-50",
                )}
                onClick={() => selectConversation(conversation.id)}
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
                    onClick={() => handleToggleAiMode(selectedConversation.mode === 'ai' ? 'human' : 'ai')}
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
                  <span className="text-xs text-slate-500">
                    Last AI reply: {new Date(selectedConversation.lastAiReplyAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}
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
                    "max-w-xl rounded-2xl px-4 py-3 shadow-sm group relative",
                    message.direction === "outgoing"
                      ? "self-end rounded-br-sm bg-green-100 text-slate-900"
                      : "self-start rounded-bl-sm bg-white text-slate-900",
                  )}
                >
                  {/* AI/Human Badge for outgoing messages */}
                  {message.direction === "outgoing" && message.repliedBy && (
                    <div className="absolute -top-2 -right-2">
                      <span className={classNames(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm",
                        message.repliedBy === 'ai' 
                          ? "bg-blue-500 text-white" 
                          : "bg-green-600 text-white"
                      )}>
                        {message.repliedBy === 'ai' ? '🤖 AI' : '👤 Human'}
                      </span>
                    </div>
                  )}

                  {/* Three-dot menu button */}
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === message.id ? null : message.id)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
                      title="Message options"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                        <circle cx="2" cy="8" r="1.5"/>
                        <circle cx="8" cy="8" r="1.5"/>
                        <circle cx="14" cy="8" r="1.5"/>
                      </svg>
                    </button>
                    
                    {/* Dropdown menu */}
                    {openMenuId === message.id && (
                      <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10">
                        <button
                          onClick={() => {
                            setReplyingTo(message);
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                        >
                          Reply
                        </button>
                        <button
                          onClick={() => {
                            // TODO: Implement delete functionality
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {message.direction === "incoming" && message.senderName && (
                    <p className="mb-1 text-xs font-semibold text-slate-500">{message.senderName}</p>
                  )}
                  
                  {/* Display quoted message if exists */}
                  {message.quotedMsg && (
                    <div className="mb-2 border-l-4 border-slate-400 bg-slate-50 px-3 py-2 rounded">
                      <p className="text-xs font-semibold text-slate-600">{message.quotedMsg.senderName || 'Unknown'}</p>
                      <p className="text-xs text-slate-500 truncate">{message.quotedMsg.text}</p>
                    </div>
                  )}
                  {message.mediaType === 'image' && message.mediaUrl && (
                    <div className="mb-2">
                      <img 
                        src={message.mediaUrl.startsWith('data:') ? message.mediaUrl : `http://localhost:4000/api/messages/media/${message.id}`}
                        alt="Image" 
                        className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          const url = message.mediaUrl?.startsWith('data:') ? message.mediaUrl : `http://localhost:4000/api/messages/media/${message.id}`;
                          setSelectedImage(url);
                        }}
                      />
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    {message.text && !message.text.startsWith('[') && (
                      <p className="text-base leading-relaxed flex-1">{message.text}</p>
                    )}
                    <span className="flex items-center gap-1 text-[10px] opacity-60 whitespace-nowrap self-end pb-0.5 ml-auto">
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {message.direction === "outgoing" && (
                        <span className="text-base leading-none" style={{ letterSpacing: '-0.35em' }}>
                          {message.ackStatus === 'read' && (
                            <span className="font-extrabold" style={{ color: '#53bdeb' }}>✓✓</span>
                          )}
                          {message.ackStatus === 'delivered' && (
                            <span className="text-gray-500 font-extrabold">✓✓</span>
                          )}
                          {message.ackStatus === 'sent' && (
                            <span className="text-gray-500 font-extrabold">✓</span>
                          )}
                          {message.ackStatus === 'pending' && (
                            <span className="text-gray-500 text-sm" style={{ letterSpacing: '0' }}>🕐</span>
                          )}
                          {message.ackStatus === 'failed' && (
                            <span className="text-red-600 text-sm" style={{ letterSpacing: '0' }}>❌</span>
                          )}
                        </span>
                      )}
                    </span>
                  </div>
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
          {replyingTo && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border-l-4 border-blue-500 bg-blue-50 px-3 py-2">
              <div className="flex-1">
                <p className="text-xs font-semibold text-blue-900">
                  Replying to {replyingTo.senderName || (replyingTo.direction === 'outgoing' ? 'You' : 'Contact')}
                </p>
                <p className="text-xs text-blue-700 truncate">{replyingTo.text}</p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-blue-900 hover:text-blue-700 font-bold"
                title="Cancel reply"
              >
                ×
              </button>
            </div>
          )}
          {selectedImage && (
            <div className="mb-3 relative inline-block">
              <img src={selectedImage} alt="Preview" className="max-h-32 rounded-lg" />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
              >
                ×
              </button>
            </div>
          )}
          <div className="flex items-end gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedConversation || sending}
              className="h-11 rounded-xl border border-slate-300 px-4 text-sm hover:bg-slate-50 disabled:opacity-50"
              title="Attach image"
            >
              📎
            </button>
            <textarea
              className="h-20 flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
              placeholder={selectedConversation ? (selectedImage ? "Add caption (optional)" : "Type your reply") : "Select a conversation"}
              value={composerText}
              onChange={(event) => setComposerText(event.target.value)}
              disabled={!selectedConversation || sending}
            />
            <button
              className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => void handleSend()}
              disabled={!selectedConversation || sending || (!composerText.trim() && !selectedImage)}
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

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
          >
            ×
          </button>
          <img 
            src={selectedImage} 
            alt="Full size" 
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* New Message Modal */}
      {showNewMessageModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setShowNewMessageModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">New Message</h2>
              <button
                onClick={() => setShowNewMessageModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="628xxx or 08xxx"
                  value={newMessagePhone}
                  onChange={(e) => setNewMessagePhone(e.target.value)}
                  disabled={sending}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Format: 628xxx or 08xxx (will be auto-formatted)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Message
                </label>
                <textarea
                  className="w-full h-32 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Type your message here..."
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  disabled={sending}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowNewMessageModal(false)}
                  className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
                  disabled={sending}
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSendNewMessage()}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={sending || !newMessagePhone.trim() || !newMessageText.trim()}
                >
                  {sending ? "Sending..." : "Send Message"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
