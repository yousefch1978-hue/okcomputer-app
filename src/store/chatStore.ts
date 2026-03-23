import { create } from 'zustand';
import { api } from '@/lib/api';

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: string;
  isAdmin?: boolean;
  isSupport?: boolean;
}

interface ChatStore {
  messages: ChatMessage[];
  supportMessages: ChatMessage[];
  loadMessages: () => Promise<void>;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<void>;
  addSupportMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<void>;
  getMessages: () => ChatMessage[];
  getSupportMessages: (userId: string) => ChatMessage[];
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>()((set, get) => ({
  messages: [], supportMessages: [],
  async loadMessages() {
    try {
      const { messages, supportMessages } = await api<{ messages: ChatMessage[]; supportMessages: ChatMessage[] }>('/api/chat');
      set({ messages, supportMessages });
    } catch {}
  },
  async addMessage(messageData) {
    await api('/api/chat/global', { method: 'POST', body: JSON.stringify({ message: messageData.message }) });
    await get().loadMessages();
  },
  async addSupportMessage(messageData) {
    await api('/api/chat/support', { method: 'POST', body: JSON.stringify({ message: messageData.message, userId: messageData.userId }) });
    await get().loadMessages();
  },
  getMessages() { return get().messages; },
  getSupportMessages(userId) { return get().supportMessages.filter((msg) => msg.userId === userId || msg.isAdmin); },
  clearMessages() { set({ messages: [], supportMessages: [] }); },
}));
