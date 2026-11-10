import { create } from 'zustand';
import { apiClient } from '../services/apiClient';
import { useAuthStore } from './useAuthStore';

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** BatchHub areas the answer was built from (empty = general knowledge) */
  sources?: string[];
  /** True when sending this user message failed and it can be retried */
  failed?: boolean;
}

interface ChatResponse {
  success: boolean;
  reply: string;
  sources?: string[];
}

interface ChatState {
  isOpen: boolean;
  messages: ChatMessageItem[];
  isSending: boolean;
  error: string | null;
  open: () => void;
  close: () => void;
  toggle: () => void;
  send: (text: string) => Promise<void>;
  retry: () => Promise<void>;
  clear: () => void;
}

// How many previous turns are sent for context (the server enforces its own cap too)
const HISTORY_LIMIT = 12;
export const MAX_MESSAGE_LENGTH = 2000;

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Kept in memory only (not localStorage): conversations can contain personal data
// and should not outlive the session or be shared between accounts on one device.
export const useChatStore = create<ChatState>((set, get) => {
  const deliver = async (userMessage: ChatMessageItem) => {
    // Context = earlier successful turns only
    const history = get()
      .messages.filter((m) => m.id !== userMessage.id && !m.failed)
      .slice(-HISTORY_LIMIT)
      .map((m) => ({ role: m.role, content: m.content }));

    set({ isSending: true, error: null });
    try {
      const res = await apiClient.post<ChatResponse>('/chat', { message: userMessage.content, history });
      set((state) => ({
        isSending: false,
        messages: [
          ...state.messages,
          { id: newId(), role: 'assistant', content: res.reply, sources: res.sources ?? [] },
        ],
      }));
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      // "Failed to fetch" / HTTP-code messages are not helpful to show as-is
      const friendly =
        !raw || /failed to fetch|networkerror|load failed|^HTTP \d+/i.test(raw)
          ? "I'm having trouble connecting right now. Please try again."
          : raw;
      set((state) => ({
        isSending: false,
        error: friendly,
        messages: state.messages.map((m) => (m.id === userMessage.id ? { ...m, failed: true } : m)),
      }));
    }
  };

  return {
    isOpen: false,
    messages: [],
    isSending: false,
    error: null,

    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    toggle: () => set((s) => ({ isOpen: !s.isOpen })),

    send: async (text) => {
      const content = text.trim().slice(0, MAX_MESSAGE_LENGTH);
      if (!content || get().isSending) return;
      const userMessage: ChatMessageItem = { id: newId(), role: 'user', content };
      set((state) => ({ messages: [...state.messages, userMessage] }));
      await deliver(userMessage);
    },

    retry: async () => {
      if (get().isSending) return;
      const failed = [...get().messages].reverse().find((m) => m.role === 'user' && m.failed);
      if (!failed) return;
      set((state) => ({
        messages: state.messages.map((m) => (m.id === failed.id ? { ...m, failed: false } : m)),
      }));
      await deliver({ ...failed, failed: false });
    },

    clear: () => set({ messages: [], error: null, isSending: false }),
  };
});

// Never carry one account's conversation over to another: reset whenever the
// signed-in user changes (logout, session expiry, or a different account logging in).
useAuthStore.subscribe((state, prev) => {
  if (state.user?.id !== prev.user?.id) {
    useChatStore.setState({ messages: [], error: null, isSending: false, isOpen: false });
  }
});
