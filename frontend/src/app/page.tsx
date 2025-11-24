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
  logMessageToRag,
  getQueueStatus,
  setQueueStatus,
  assignConversation,
  unassignConversation,
  resolveConversation,
  transferConversation,
  deleteConversation,
  deleteMessage,
  fetchUsers,
  type Conversation,
  type Message,
  type SessionSummary,
  type HealthResponse,
  type User,
} from "@/lib/api";
import { ConversationList } from "@/components/ConversationList";
import { ChatHeader } from "@/components/ChatHeader";
import { MessageList } from "@/components/MessageList";
import { classNames, formatTime } from "@/lib/utils";
import { useRouter } from "next/navigation";


export default function InboxPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ userId: string; fullName: string; username: string; role: string } | null>(null);

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [isInboxSidebarOpen, setIsInboxSidebarOpen] = useState(true);
  const [newMessagePhone, setNewMessagePhone] = useState("");
  const [newMessageText, setNewMessageText] = useState("");
  const [queueEnabled, setQueueEnabled] = useState(true);
  const [togglingQueue, setTogglingQueue] = useState(false);
  const [conversationType, setConversationType] = useState<'all' | 'my' | 'queue'>('all');
  const [queueCount, setQueueCount] = useState(0);
  const [allCount, setAllCount] = useState(0);
  const [myCount, setMyCount] = useState(0);
  const [agents, setAgents] = useState<User[]>([]);

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

  // Auth Guard Effect
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
      if (userStr) {
        try {
          setCurrentUser(JSON.parse(userStr));
        } catch (e) {
          console.error('Failed to parse user', e);
        }
      }
    }
  }, [router]);

  useEffect(() => {
    if (isAuthenticated) {
      void bootstrap();
      void fetchQueueStatus();
    }
  }, [isAuthenticated]);

  // Fetch queue status
  const fetchQueueStatus = async () => {
    try {
      const status = await getQueueStatus();
      setQueueEnabled(status.enabled);
    } catch (err) {
      console.error('Failed to fetch queue status:', err);
    }
  };

  // Toggle queue handler
  const handleToggleQueue = async () => {
    setTogglingQueue(true);
    try {
      const result = await setQueueStatus(!queueEnabled);
      setQueueEnabled(result.enabled);
      alert(result.message);
    } catch (err: any) {
      console.error('Failed to toggle queue:', err);
      alert('Failed to toggle queue system: ' + (err?.message || 'Unknown error'));
    } finally {
      setTogglingQueue(false);
    }
  };

  // Re-fetch conversations when conversationType changes
  useEffect(() => {
    if (isAuthenticated) {
      void bootstrap();
    }
  }, [conversationType]);

  // Poll for new conversations every 1 second for real-time updates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const userId = currentUser?.userId || localStorage.getItem('userId') || undefined;
        
        const [conversationsRes, queueRes, allRes, myRes] = await Promise.all([
          fetchConversations({
            type: conversationType,
            userId: conversationType === 'my' ? userId : undefined,
          }),
          fetchConversations({ type: 'queue' }),
          fetchConversations({ type: 'all' }),
          userId ? fetchConversations({ type: 'my', userId }) : Promise.resolve([]),
        ]);
        
        setConversations(conversationsRes);
        setQueueCount(queueRes.length);
        setAllCount(allRes.length);
        setMyCount(myRes.length);
      } catch (err) {
        console.error('Failed to refresh conversations:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [conversationType, currentUser]);

  // Poll for new messages in selected conversation every 3 seconds
  useEffect(() => {
    if (!selectedConversationId) return;

    const interval = setInterval(async () => {
      try {
        const data = await fetchMessages(selectedConversationId);

        // Only update if user is near bottom (to avoid interrupting scroll up)
        const container = messagesContainerRef.current;
        const isNearBottom = container
          ? container.scrollHeight - container.scrollTop - container.clientHeight < 200
          : true;

        if (isNearBottom) {
          // Deduplicate messages by ID before updating
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMessages = data.messages.filter(m => !existingIds.has(m.id));

            // If no new messages, don't update to avoid re-render
            if (newMessages.length === 0 && prev.length === data.messages.length) {
              return prev;
            }

            // Merge and deduplicate
            const allMessages = [...prev, ...newMessages];
            const uniqueMessages = Array.from(
              new Map(allMessages.map(m => [m.id, m])).values()
            );

            // Sort by createdAt to maintain order
            return uniqueMessages.sort((a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          });
          setHasMoreMessages(data.hasMore);
        }
      } catch (err) {
        console.error('Failed to refresh messages:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedConversationId]);

  // Auto-scroll to bottom when messages change
  const prevMessagesLengthRef = useRef(0);
  const isInitialLoadRef = useRef(false);

  // Scroll to bottom when loading finishes (Initial Load)
  useEffect(() => {
    if (!loadingMessages && messagesEndRef.current && isInitialLoadRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      isInitialLoadRef.current = false;
    }
  }, [loadingMessages]);

  // Scroll on new messages
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      const container = messagesContainerRef.current;
      const isNearBottom = container
        ? container.scrollHeight - container.scrollTop - container.clientHeight < 200
        : true;

      // Only scroll if user is near bottom AND NOT loading
      if ((isNearBottom || isInitialLoadRef.current) && !loadingMessages) {
        const isNewMessage = messages.length === prevMessagesLengthRef.current + 1;
        messagesEndRef.current.scrollIntoView({
          behavior: isNewMessage && !isInitialLoadRef.current ? 'smooth' : 'auto'
        });
        if (isInitialLoadRef.current) isInitialLoadRef.current = false;
      }

      prevMessagesLengthRef.current = messages.length;
    }
  }, [messages, loadingMessages]);

  async function bootstrap() {
    try {
      setLoadingConversations(true);
      const userId = currentUser?.userId || localStorage.getItem('userId') || undefined;
      
      const [healthRes, sessionsRes, conversationsRes, queueRes, allRes, myRes, agentsRes] = await Promise.all([
        fetchHealth(),
        fetchSessions(),
        fetchConversations({
          type: conversationType,
          userId: conversationType === 'my' ? userId : undefined,
        }),
        fetchConversations({ type: 'queue' }), // Queue count
        fetchConversations({ type: 'all' }), // All count
        userId ? fetchConversations({ type: 'my', userId }) : Promise.resolve([]), // My count
        fetchUsers(), // Fetch agents list
      ]);
      
      setHealth(healthRes);
      setSessions(sessionsRes);
      setConversations(conversationsRes);
      setQueueCount(queueRes.length);
      setAllCount(allRes.length);
      setMyCount(myRes.length);
      setAgents(agentsRes);
      
      if (conversationsRes.length > 0 && !selectedConversationId) {
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
      isInitialLoadRef.current = true; // Mark as initial load AFTER fetch
      setMessages(data.messages);
      setHasMoreMessages(data.hasMore);

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

  async function loadOlderMessages() {
    if (!selectedConversationId || loadingOlderMessages || !hasMoreMessages) return;

    setLoadingOlderMessages(true);
    try {
      const data = await fetchMessages(selectedConversationId, 50, messages.length);

      // Filter out duplicates before prepending
      const existingIds = new Set(messages.map(m => m.id));
      const newMessages = data.messages.filter(m => !existingIds.has(m.id));

      // Prepend only new older messages
      setMessages(prev => [...newMessages, ...prev]);
      setHasMoreMessages(data.hasMore);

      // Keep scroll position (don't jump to bottom)
      // The scroll position will naturally stay where it was
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setLoadingOlderMessages(false);
    }
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const container = e.currentTarget;

    // Check if scrolled to top (with 100px threshold)
    if (container.scrollTop < 100 && hasMoreMessages && !loadingOlderMessages) {
      const previousScrollHeight = container.scrollHeight;
      const previousScrollTop = container.scrollTop;

      loadOlderMessages().then(() => {
        // Restore scroll position after loading older messages
        requestAnimationFrame(() => {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = previousScrollTop + (newScrollHeight - previousScrollHeight);
        });
      });
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

  async function handleAssignToMe(conversationId: string) {
    const userId = currentUser?.userId || localStorage.getItem('userId');
    if (!userId) {
      alert('User ID not found. Please re-login.');
      return;
    }

    try {
      await assignConversation(conversationId, userId);
      await bootstrap(); // Refresh conversations
      alert('Conversation assigned to you successfully!');
    } catch (err: any) {
      console.error('Failed to assign conversation:', err);
      alert('Failed to assign conversation: ' + (err?.message || 'Unknown error'));
    }
  }

  async function handleUnassign(conversationId: string) {
    try {
      await unassignConversation(conversationId);
      await bootstrap(); // Refresh conversations
      alert('Conversation returned to queue successfully!');
    } catch (err: any) {
      console.error('Failed to unassign conversation:', err);
      alert('Failed to unassign conversation: ' + (err?.message || 'Unknown error'));
    }
  }

  async function handleResolve(conversationId: string) {
    const notes = prompt('Add resolution notes (optional):');
    
    try {
      const result = await resolveConversation(conversationId, notes || undefined);
      await bootstrap(); // Refresh conversations
      alert('Conversation marked as resolved successfully!');
      
      // Clear selection if current conversation was resolved
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
        setMessages([]);
      }
    } catch (err: any) {
      console.error('Failed to resolve conversation:', err);
      alert('Failed to resolve conversation: ' + (err?.message || 'Unknown error'));
    }
  }

  async function handleTransfer(conversationId: string, toUserId: string) {
    const fromUserId = currentUser?.userId || localStorage.getItem('userId');
    if (!fromUserId) {
      alert('User ID not found. Please re-login.');
      return;
    }

    try {
      const result = await transferConversation(conversationId, fromUserId, toUserId);
      await bootstrap(); // Refresh conversations
      alert(`Conversation transferred to ${result.transferredTo.fullName} successfully!`);
      
      // Clear selection if current conversation was transferred
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
        setMessages([]);
      }
    } catch (err: any) {
      console.error('Failed to transfer conversation:', err);
      alert('Failed to transfer conversation: ' + (err?.message || 'Unknown error'));
    }
  }

  async function handleDeleteMessage(messageId: string) {
    try {
      await deleteMessage(messageId);
      // Remove message from local state
      setMessages(prev => prev.filter(m => m.id !== messageId));
      // Don't alert on success to keep flow smooth, or use a toast
      // alert('Message deleted successfully!');
    } catch (err: any) {
      console.error('Failed to delete message:', err);
      alert('Failed to delete message: ' + (err?.message || 'Unknown error'));
    }
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

      // Log to Analytics
      if (currentUser) {
        logMessageToRag(
          selectedConversation.waChatId, // sender_id in LogMessage is the chat partner
          text,
          'assistant',
          currentUser.username
        ).catch(err => console.error('Analytics log failed:', err));
      }
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
      await bootstrap(); // Refresh conversations and badges
    } catch (err) {
      console.error('Failed to toggle AI mode:', err);
      setError((err as Error).message ?? "Failed to toggle AI mode");
    }
  }

  if (!isAuthenticated) {
    return <div className="flex h-screen items-center justify-center bg-[#efeae2]">Loading...</div>;
  }

  return (
    <main className="flex h-screen w-full bg-slate-100 overflow-hidden">
      <div className="flex flex-1 flex-col min-w-0 max-w-full bg-white h-full">

        {/* GLOBAL HEADER - Hide on mobile when conversation is selected */}
        <header className={`h-16 border-b border-slate-200 px-6 flex items-center justify-between shrink-0 bg-white ${selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsInboxSidebarOpen(!isInboxSidebarOpen)}
              className="p-2 -ml-2 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
              title="Toggle Sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>

            <div className="flex flex-col justify-center">
              <h1 className="text-lg font-bold text-slate-900">Inbox</h1>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Ditugaskan ke saya</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari (Ctrl K)"
                className="h-9 w-64 rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm pl-9 focus:border-blue-500 focus:outline-none"
              />
              <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <button className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            {/* Queue Toggle Switch */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200">
              <span className="text-xs font-medium text-slate-600">Queue</span>
              <button
                onClick={handleToggleQueue}
                disabled={togglingQueue}
                className={classNames(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  queueEnabled ? "bg-blue-600" : "bg-slate-300",
                  togglingQueue && "opacity-50 cursor-not-allowed"
                )}
                title={queueEnabled ? "Queue system enabled" : "Queue system disabled"}
              >
                <span
                  className={classNames(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    queueEnabled ? "translate-x-5" : "translate-x-0.5"
                  )}
                />
              </button>
              <span className={classNames(
                "text-xs font-semibold",
                queueEnabled ? "text-blue-600" : "text-slate-400"
              )}>
                {queueEnabled ? "ON" : "OFF"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-xs">
                {currentUser?.fullName
                  ? currentUser.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                  : 'U'}
              </div>
              <span className="text-sm font-medium text-slate-700">
                {currentUser?.fullName || 'User'}
              </span>
            </div>
          </div>
        </header>

        {/* CONTENT BODY */}
        <div className="flex flex-1 overflow-hidden w-full">

          {/* INBOX SIDEBAR FILTER - Queue Tabs */}
          <div
            className={`border-r border-slate-200 bg-white flex flex-col transition-all duration-300 ease-in-out overflow-hidden hidden md:flex ${isInboxSidebarOpen ? 'w-60 opacity-100' : 'w-0 opacity-0 border-none'
              }`}
          >
            <div className="w-60 min-w-[15rem]">

              {/* Queue System Tabs */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversations</span>
                </div>
                <ul className="space-y-1">
                  <li>
                    <button
                      onClick={() => setConversationType('all')}
                      className={classNames(
                        "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        conversationType === 'all'
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <span>All Conversations</span>
                      <span className="text-xs font-bold">{allCount}</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setConversationType('my')}
                      className={classNames(
                        "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        conversationType === 'my'
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <span>My Conversations</span>
                      <span className="text-xs font-bold">{myCount}</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setConversationType('queue')}
                      className={classNames(
                        "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        conversationType === 'queue'
                          ? "bg-orange-50 text-orange-700"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span>Queue</span>
                        {queueCount > 0 && (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-orange-500 rounded-full">
                            {queueCount}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                </ul>
              </div>

            </div>
          </div>

          {/* Conversation list */}
          <section className={`flex flex-col border-r border-slate-200 bg-white ${selectedConversationId ? 'hidden md:flex w-80' : 'w-full md:w-80'}`}>
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
            <ConversationList
              conversations={filteredConversations}
              selectedConversationId={selectedConversationId}
              onSelectConversation={selectConversation}
              loading={loadingConversations}
              searchTerm={searchTerm}
              conversationType={conversationType}
              onAssign={handleAssignToMe}
              onUnassign={handleUnassign}
              currentUserId={currentUser?.userId || localStorage.getItem('userId') || undefined}
            />
          </section>

          {/* Chat area */}
          <section className={`flex-col bg-[#efeae2] relative isolate overflow-hidden pb-16 md:pb-0 ${selectedConversationId ? 'flex flex-1 min-w-0 max-w-full' : 'hidden md:flex md:flex-1 md:min-w-0 max-w-full'}`}>
            {/* Background Pattern/Logo */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none -z-10"
              style={{
                backgroundImage: "url('https://upload.wikimedia.org/wikipedia/id/c/c3/Logo_Universitas_Terbuka.svg')",
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '50%'
              }}
            />

            <ChatHeader
              selectedConversation={selectedConversation}
              sessions={sessions}
              onToggleAiMode={handleToggleAiMode}
              onBack={() => setSelectedConversationId(null)}
              onResolve={handleResolve}
              onTransfer={handleTransfer}
              currentUserId={currentUser?.userId || localStorage.getItem('userId') || undefined}
              agents={agents}
            />

            <div className="flex-1 flex flex-col min-h-0 relative z-0 overflow-hidden">
              <MessageList
                messages={messages}
                loadingMessages={loadingMessages}
                loadingOlderMessages={loadingOlderMessages}
                selectedConversation={selectedConversation}
                onScroll={handleScroll}
                messagesContainerRef={messagesContainerRef}
                messagesEndRef={messagesEndRef}
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
                onReply={setReplyingTo}
                onImageClick={(url) => setSelectedImage(url)}
                onDelete={handleDeleteMessage}
              />
            </div>

            <footer className="border-t border-slate-200 bg-white p-2 md:px-6 md:py-4 relative z-20 shrink-0">
              <div className="flex flex-col gap-2 w-full">
                {/* Error Message */}
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                    {error}
                  </div>
                )}

                {/* Reply Preview */}
                {replyingTo && (
                  <div className="flex items-start gap-2 rounded-lg border-l-4 border-blue-500 bg-blue-50 px-3 py-2 animate-in slide-in-from-bottom-2 fade-in">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-blue-900">
                        Replying to {replyingTo.senderName || (replyingTo.direction === 'outgoing' ? 'You' : 'Contact')}
                      </p>
                      <p className="text-xs text-blue-700 truncate">{replyingTo.text}</p>
                    </div>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="text-blue-900 hover:text-blue-700 font-bold p-1"
                      title="Cancel reply"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Image Preview */}
                {selectedImage && (
                  <div className="relative inline-block self-start">
                    <img src={selectedImage} alt="Preview" className="max-h-24 rounded-lg border border-slate-200" />
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 shadow-sm"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Input Area */}
                <div className="flex items-end gap-2">
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
                    className="h-10 md:h-11 w-10 md:w-auto rounded-xl border border-slate-300 md:px-4 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 shrink-0 transition-colors"
                    title="Attach image"
                  >
                    <span className="md:hidden text-lg">📎</span>
                    <span className="hidden md:inline text-lg">📎</span>
                  </button>
                  <textarea
                    className="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[40px] max-h-[120px] disabled:bg-slate-50 transition-all"
                    placeholder={selectedConversation ? (selectedImage ? "Add caption..." : "Type a message") : ""}
                    value={composerText}
                    onChange={(event) => setComposerText(event.target.value)}
                    disabled={!selectedConversation || sending}
                    rows={1}
                    style={{ height: '40px' }} // Initial height
                    onInput={(e) => {
                      // Auto-grow textarea
                      e.currentTarget.style.height = 'auto';
                      e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 120) + 'px';
                    }}
                  />
                  <button
                    className="h-10 md:h-11 rounded-xl bg-blue-600 px-4 md:px-6 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 shrink-0 flex items-center justify-center transition-colors shadow-sm"
                    onClick={() => void handleSend()}
                    disabled={!selectedConversation || sending || (!composerText.trim() && !selectedImage)}
                  >
                    {sending ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      <span>Send</span>
                    )}
                  </button>
                </div>
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
        </div>
      </div>

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
    </main >
  );
}
