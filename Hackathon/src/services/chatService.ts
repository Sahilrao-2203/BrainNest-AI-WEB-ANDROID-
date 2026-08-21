import type { ChatMessage } from '../mock/data';
import { getCurrentUserId } from '../mock/userProfile';

const CHAT_STORAGE_PREFIX = 'studyflow_chat_';

function getChatStorageKey(userId: string, conversationId: string): string {
  return `${CHAT_STORAGE_PREFIX}${userId}_${conversationId}`;
}

export interface ConversationSummary {
  conversationId: string;
  title: string;
  lastActivity: number;
  messageCount: number;
  type: 'general' | 'topic';
  topicId?: string | null;
}

export const chatService = {
  // Generate a new conversation ID for General or Topic Companion
  createNewConversationId(mode: 'general' | 'topic', topicId?: string): string {
    const timestamp = Date.now();
    if (mode === 'topic' && topicId) {
      return `topic-${topicId}-${timestamp}`;
    }
    return `general-${timestamp}`;
  },

  // List all conversations for the user filtered by mode ('general' or 'topic') and topicId
  async getConversations(
    mode: 'general' | 'topic',
    topicId?: string,
    userId?: string
  ): Promise<ConversationSummary[]> {
    const activeUserId = userId || getCurrentUserId();
    let allConvs: ConversationSummary[] = [];

    // 1. Try server fetch
    try {
      const res = await fetch(`/api/chat/conversations?userId=${encodeURIComponent(activeUserId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.conversations)) {
          allConvs = data.conversations;
        }
      }
    } catch (e) {
      console.warn('[chatService] Server fetch for conversations failed, scanning localStorage fallback:', e);
    }

    // 2. Fallback / merge with local storage scan for offline mode
    try {
      const userPrefix = `${CHAT_STORAGE_PREFIX}${activeUserId}_`;
      const localConvsMap = new Map<string, ConversationSummary>();

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(userPrefix)) {
          const convId = key.replace(userPrefix, '');
          const cachedRaw = localStorage.getItem(key);
          if (cachedRaw) {
            const msgs: ChatMessage[] = JSON.parse(cachedRaw);
            if (msgs.length > 0) {
              const isTopic = convId.startsWith('topic-');
              let tId: string | null = null;
              if (isTopic) {
                const withoutPrefix = convId.replace(/^topic-/, '');
                const parts = withoutPrefix.split('-');
                if (parts.length > 1 && /^\d{13}$/.test(parts[parts.length - 1])) {
                  tId = parts.slice(0, -1).join('-');
                } else {
                  tId = withoutPrefix;
                }
              }

              const userMsg = msgs.find((m) => m.sender === 'user');
              const rawTitle = userMsg ? userMsg.content : 'New Conversation';
              let title = typeof rawTitle === 'string'
                ? rawTitle.replace(/\[Attached\s+\d+\s+item\(s\)\]/gi, '').trim()
                : 'New Conversation';
              if (!title) title = 'Conversation';
              if (title.length > 40) title = title.slice(0, 37) + '...';

              localConvsMap.set(convId, {
                conversationId: convId,
                title,
                lastActivity: Date.now(),
                messageCount: msgs.length,
                type: isTopic ? 'topic' : 'general',
                topicId: tId,
              });
            }
          }
        }
      }

      // Merge server and local storage items
      for (const conv of allConvs) {
        if (!localConvsMap.has(conv.conversationId)) {
          localConvsMap.set(conv.conversationId, conv);
        }
      }

      allConvs = Array.from(localConvsMap.values());
    } catch (e) { }

    // 3. Strict filtering based on mode and topicId
    if (mode === 'general') {
      return allConvs
        .filter((c) => c.type === 'general' || c.conversationId === 'standalone' || c.conversationId.startsWith('general-'))
        .sort((a, b) => b.lastActivity - a.lastActivity);
    } else {
      return allConvs
        .filter((c) => c.type === 'topic' && (c.topicId === topicId || c.conversationId.startsWith(`topic-${topicId}`)))
        .sort((a, b) => b.lastActivity - a.lastActivity);
    }
  },

  // Delete a specific conversation
  async deleteConversation(conversationId: string, userId?: string): Promise<void> {
    const activeUserId = userId || getCurrentUserId();
    const storageKey = getChatStorageKey(activeUserId, conversationId);

    try {
      localStorage.removeItem(storageKey);
    } catch (e) { }

    try {
      await fetch(
        `/api/chat/history?userId=${encodeURIComponent(activeUserId)}&conversationId=${encodeURIComponent(conversationId)}`,
        { method: 'DELETE' }
      );
    } catch (e) {
      console.warn('[chatService] Failed to delete conversation on server:', e);
    }
  },

  // Load chat history from MongoDB or fallback to localStorage
  async getChatHistory(conversationId: string = 'standalone', userId?: string): Promise<ChatMessage[]> {
    const activeUserId = userId || getCurrentUserId();
    const storageKey = getChatStorageKey(activeUserId, conversationId);

    try {
      const res = await fetch(
        `/api/chat/history?userId=${encodeURIComponent(activeUserId)}&conversationId=${encodeURIComponent(conversationId)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.messages)) {
          const messages: ChatMessage[] = data.messages.map((m: any) => ({
            id: m.messageId || m.id,
            sender: m.role === 'user' ? 'user' : 'ai',
            senderName: m.senderName || (m.role === 'user' ? 'You' : 'AI Assistant'),
            content: m.content,
            attachments: m.attachments || (m.attachment ? [m.attachment] : []),
            attachment: m.attachment || (m.attachments ? m.attachments[0] : null),
            imageResults: m.imageResults,
          }));

          // Cache in localStorage
          try {
            localStorage.setItem(storageKey, JSON.stringify(messages));
          } catch (e) { }

          return messages;
        }
      }
    } catch (e) {
      console.warn('[chatService] Backend fetch error, falling back to localStorage cache:', e);
    }

    // Offline cache fallback
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) { }

    return [];
  },

  // Save single chat message to MongoDB
  async saveChatMessage(message: ChatMessage, conversationId: string = 'standalone', userId?: string): Promise<void> {
    const activeUserId = userId || getCurrentUserId();
    const storageKey = getChatStorageKey(activeUserId, conversationId);

    // Update local cache
    try {
      const cachedRaw = localStorage.getItem(storageKey);
      const cachedMessages: ChatMessage[] = cachedRaw ? JSON.parse(cachedRaw) : [];
      const updated = [...cachedMessages.filter((m) => m.id !== message.id), message];
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) { }

    // Persist to MongoDB
    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          conversationId,
          message,
        }),
      });
    } catch (e) {
      console.warn('[chatService] Failed to persist message to MongoDB:', e);
    }
  },

  // Clear chat history for user conversation
  async clearChatHistory(conversationId: string = 'standalone', userId?: string): Promise<void> {
    const activeUserId = userId || getCurrentUserId();
    const storageKey = getChatStorageKey(activeUserId, conversationId);

    // Clear local cache
    try {
      localStorage.removeItem(storageKey);
    } catch (e) { }

    // Clear from MongoDB
    try {
      await fetch(
        `/api/chat/history?userId=${encodeURIComponent(activeUserId)}&conversationId=${encodeURIComponent(conversationId)}`,
        { method: 'DELETE' }
      );
    } catch (e) {
      console.warn('[chatService] Failed to clear chat history on server:', e);
    }
  },
};
