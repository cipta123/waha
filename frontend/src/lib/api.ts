const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');
const RAG_API_BASE_URL = 'http://localhost:8001';

interface ApiFetchOptions extends RequestInit {
  raw?: boolean;
}

async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const init: RequestInit = {
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
export const fetchConversations = () => apiFetch<Conversation[]>('/messages/conversations');
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
