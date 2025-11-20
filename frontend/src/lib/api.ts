const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

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
}

export interface SessionSummary {
  session?: string;
  id?: string;
  status?: string;
  engine?: string;
}

export const fetchHealth = () => apiFetch<HealthResponse>('/health');
export const fetchConversations = () => apiFetch<Conversation[]>('/messages/conversations');
export const fetchMessages = (conversationId: string) =>
  apiFetch<Message[]>(`/messages/${conversationId}`);
export const fetchSessions = () => apiFetch<SessionSummary[]>('/sessions');
export const sendTextMessage = (payload: { chatId: string; text: string; session?: string }) =>
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
