import React, { useState, useEffect } from 'react';
import { chatService, type ConversationSummary } from '../../services/chatService';

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeConversationId: string;
  onSelectConversation: (conv: ConversationSummary) => void;
  onNewChat: () => void;
  currentMode: 'general' | 'topic';
  currentTopicId?: string;
}

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  isOpen,
  onClose,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  currentMode,
  currentTopicId,
}) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const list = await chatService.getConversations(currentMode, currentTopicId);
      setConversations(list);
    } catch (e) {
      console.error('[ChatHistorySidebar] Error loading conversations:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [currentMode, currentTopicId, activeConversationId]);

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleDeleteConfirm = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    try {
      await chatService.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.conversationId !== convId));
      if (convId === activeConversationId) {
        onNewChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    } finally {
      setDeletingConvId(null);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer Container */}
      <aside
        className={`fixed md:relative top-0 left-0 h-full w-72 lg:w-80 shrink-0 bg-surface-container-low/95 backdrop-blur-2xl border-r border-white/10 z-50 md:z-10 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile-only close button */}
        <div className="md:hidden pt-2 px-3 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-variant text-on-surface-variant transition-colors"
            title="Close sidebar"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Action: + New Chat */}
        <div className="p-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-primary text-on-primary font-semibold text-xs flex items-center justify-center gap-2 hover:bg-primary-fixed-dim transition-all shadow-md active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>New Chat</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-3 pb-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-xs text-on-surface-variant/60">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-surface-variant/40 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scrollbar-thin">
          <div className="px-2 py-1 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-on-surface-variant/60 font-semibold">
            <span>RECENTS</span>
            <span>{filteredConversations.length}</span>
          </div>

          {isLoading ? (
            <div className="p-4 text-center text-xs text-on-surface-variant/60 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              <span>Loading history...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-on-surface-variant/50">
              {searchQuery ? 'No matching conversations' : 'No previous conversations yet'}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.conversationId === activeConversationId;

              return (
                <div
                  key={conv.conversationId}
                  onClick={() => {
                    onSelectConversation(conv);
                    if (window.innerWidth < 768) onClose();
                  }}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all text-xs border ${
                    isActive
                      ? 'bg-primary-container/30 border-primary/40 text-primary font-semibold shadow-sm'
                      : 'border-transparent text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-6">
                    <span className={`material-symbols-outlined text-sm shrink-0 ${isActive ? 'text-primary' : 'text-on-surface-variant/70'}`}>
                      chat_bubble_outline
                    </span>
                    <span className="truncate leading-tight text-xs">{conv.title}</span>
                  </div>

                  {/* Actions: Delete icon on hover */}
                  <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingConvId(conv.conversationId);
                      }}
                      className="p-1 rounded hover:bg-error-container/40 text-on-surface-variant hover:text-error transition-colors"
                      title="Delete conversation"
                    >
                      <span className="material-symbols-outlined text-xs">delete</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 text-[10px] text-on-surface-variant/60 text-center font-mono">
          StudyFlow AI • Conversation History
        </div>
      </aside>

      {/* Delete Confirmation Modal */}
      {deletingConvId && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-high border border-white/10 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-error">
              <span className="material-symbols-outlined text-2xl">warning</span>
              <h3 className="font-bold text-base text-on-surface">Delete Conversation?</h3>
            </div>
            <p className="text-xs text-on-surface-variant">
              Are you sure you want to delete this conversation? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingConvId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-variant hover:bg-surface-container-highest text-on-surface transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => handleDeleteConfirm(e, deletingConvId)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-error text-on-error hover:bg-error/90 transition-colors shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
