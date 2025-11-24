// Dynamically determine API base URL
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use current hostname
    return `http://${window.location.hostname}:4000/api`;
  }
  // Server-side or fallback
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';
};

const getRagBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use current hostname
    return `http://${window.location.hostname}:8001`;
  }
  return 'http://localhost:8001';
};

const BASE_URL = getBaseUrl().replace(/\/$/, '');
const RAG_API_BASE_URL = getRagBaseUrl().replace(/\/$/, '');

interface ApiFetchOptions extends RequestInit {
  raw?: boolean;
}

async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  
  // Get token from localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const init: RequestInit = {
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  };

  const response = await fetch(url, init);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  if (options.raw) {
    return response as unknown as T;
  }

  return response.json() as Promise<T>;
}

// Helper for RAG Service API
async function ragApiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${RAG_API_BASE_URL}${path}`;
  const init: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    }
  };
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`RAG Service request failed: ${response.status}`);
  }
  return response.json();
}

export interface HealthResponse {
  status: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  waChatId: string;
  title?: string;
  status: string;
  lastMessageAt?: string;
  updatedAt: string;
  unreadCount: number;
  mode: 'ai' | 'human';
  lastAiReplyAt?: string;
  handoffReason?: string;
  owner?: {
    id: string;
    username: string;
    fullName: string;
    role: string;
  } | null;
  lastMessage?: {
    id: string;
    text: string;
    direction: 'incoming' | 'outgoing';
    createdAt: string;
  } | null;
}

export interface Message {
  id: string;
  direction: 'incoming' | 'outgoing';
  text: string;
  senderName?: string;
  createdAt: string;
  ackStatus?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  mediaUrl?: string;
  mediaType?: string;
  mimeType?: string;
  fileName?: string;
  waMessageId?: string;
  repliedBy?: 'human' | 'ai';
  quotedMsg?: {
    id: string;
    text: string;
    senderName?: string;
  };
}

export interface SessionSummary {
  session?: string;
  id?: string;
  status?: string;
  engine?: string;
}

export interface MessagesResponse {
  messages: Message[];
  total: number;
  hasMore: boolean;
}

export const fetchHealth = () => apiFetch<HealthResponse>('/health');
export const fetchConversations = (params?: { limit?: number; type?: 'all' | 'my' | 'queue'; userId?: string }) => {
  const query = new URLSearchParams();
  if (params?.limit) query.append('limit', String(params.limit));
  if (params?.type) query.append('type', params.type);
  if (params?.userId) query.append('userId', params.userId);
  
  const queryString = query.toString();
  return apiFetch<Conversation[]>(`/messages/conversations${queryString ? '?' + queryString : ''}`);
};
export const fetchMessages = (conversationId: string, limit = 50, offset = 0) =>
  apiFetch<MessagesResponse>(`/messages/${conversationId}?limit=${limit}&offset=${offset}`);
export const fetchSessions = () => apiFetch<SessionSummary[]>('/sessions');
export const sendTextMessage = (payload: { chatId: string; text: string; session?: string; reply_to?: string }) =>
  apiFetch<{ conversationId: string; messageId: string }>(`/messages/send-text`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const markConversationAsRead = (conversationId: string) =>
  apiFetch<{ success: boolean; conversationId: string }>(`/messages/${conversationId}/mark-read`, {
    method: 'POST',
  });

export const sendImageMessage = (payload: { chatId: string; file: { mimetype: string; data: string }; caption?: string; session?: string }) =>
  apiFetch<{ conversationId: string; messageId: string }>(`/messages/send-image`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const toggleAiMode = (conversationId: string, mode: 'ai' | 'human', reason?: string) =>
  apiFetch<{ success: boolean; conversationId: string; mode: string }>(`/messages/${conversationId}/toggle-ai-mode`, {
    method: 'POST',
    body: JSON.stringify({ mode, reason }),
  });

export const fetchRagAnalytics = (days: number = 7) => ragApiFetch<any>(`/analytics?days=${days}`);

export const logMessageToRag = (senderId: string, message: string, role: 'user' | 'assistant', agentId?: string) =>
  ragApiFetch<{ status: string }>(`/log-message`, {
    method: 'POST',
    body: JSON.stringify({
      sender_id: senderId,
      message,
      role,
      agent_id: agentId
    })
  } as any);

export const fetchMessageReports = (params: {
  start_date?: string;
  end_date?: string;
  agent_id?: string;
  intent?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });
  return ragApiFetch<any>(`/reports/messages?${query.toString()}`);
};

// ---- Queue Settings ----
export const getQueueStatus = () => {
  return apiFetch<{ enabled: boolean; message: string }>('/settings/queue-enabled');
};

export const setQueueStatus = (enabled: boolean) => {
  return apiFetch<{ success: boolean; enabled: boolean; message: string }>(
    '/settings/queue-enabled',
    {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }
  );
};

export const getAiStatus = () => {
  return apiFetch<{ enabled: boolean; message: string }>('/settings/ai-enabled');
};

export const setAiStatus = (enabled: boolean) => {
  return apiFetch<{ success: boolean; enabled: boolean; message: string }>(
    '/settings/ai-enabled',
    {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }
  );
};

// ---- Conversation Assignment ----
export const assignConversation = (conversationId: string, userId: string) => {
  return apiFetch<{ success: boolean; conversationId: string; assignedTo: any }>(
    `/messages/${conversationId}/assign`,
    {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }
  );
};

export const unassignConversation = (conversationId: string) => {
  return apiFetch<{ success: boolean; conversationId: string; message: string }>(
    `/messages/${conversationId}/unassign`,
    {
      method: 'POST',
    }
  );
};

export const resolveConversation = (conversationId: string, notes?: string) => {
  return apiFetch<{ success: boolean; conversationId: string; message: string; resolvedBy: any }>(
    `/messages/${conversationId}/resolve`,
    {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }
  );
};

export const transferConversation = (conversationId: string, fromUserId: string, toUserId: string) => {
  return apiFetch<{ success: boolean; conversationId: string; message: string; transferredFrom: any; transferredTo: any }>(
    `/messages/${conversationId}/transfer`,
    {
      method: 'POST',
      body: JSON.stringify({ fromUserId, toUserId }),
    }
  );
};

export const deleteConversation = (conversationId: string) => {
  return apiFetch<{ success: boolean; id: string }>(
    `/messages/${conversationId}`,
    {
      method: 'DELETE',
    }
  );
};

export const deleteMessage = (messageId: string) => {
  return apiFetch<{ success: boolean; id: string }>(
    `/messages/msg/${messageId}`,
    {
      method: 'DELETE',
    }
  );
};

// ---- Users ----
export interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

export const fetchUsers = () => {
  return apiFetch<User[]>('/users');
};
