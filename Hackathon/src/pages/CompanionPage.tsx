import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import type { ChatMessage } from '../mock/data';
import { aiService, DEFAULT_PRACTICE_QUESTION_COUNT, type ChatHistoryMessage } from '../services/aiService';
import { useUserProfile } from '../mock/userProfile';
import { ProfileAvatar } from '../components/profile/ProfileAvatar';
import { MarkdownRenderer } from '../components/chat/MarkdownRenderer';
import {
  processSelectedFile,
  revokeAttachmentObjectUrl,
  getImageSource,
  processLinkUrl,
  type ProcessedAttachment,
} from '../services/fileProcessingService';
import { ImagePreviewModal } from '../components/chat/ImagePreviewModal';
import { LinkInputModal } from '../components/chat/LinkInputModal';
import { TextViewerModal } from '../components/chat/TextViewerModal';
import { PdfViewerModal } from '../components/chat/PdfViewerModal';
import { ImageGallery } from '../components/chat/ImageGallery';
import type { ImageSearchResult } from '../services/imageSearchService';
import { QuizModal } from '../components/quiz/QuizModal';
import { chatService, type ConversationSummary } from '../services/chatService';
import { ChatHistorySidebar } from '../components/chat/ChatHistorySidebar';

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const isSpeechSupported = !!SpeechRecognition;

export const CompanionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, preferences } = useUserProfile();

  const userName = profile?.name && typeof profile.name === 'string' ? profile.name.trim() : '';

  const [activeConversationId, setActiveConversationId] = useState<string>(
    () => (location.state as any)?.conversationId || 'standalone'
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const welcomeGreeting = userName
      ? `Hi ${userName}! I am your StudyFlow AI Companion.`
      : 'Hi! I am your StudyFlow AI Companion.';

    return [
      {
        id: `ai-standalone-init-${Date.now()}`,
        sender: 'ai',
        senderName: 'AI Study Companion',
        content: welcomeGreeting,
      },
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState<string>('AI Study Companion is thinking...');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Voice Input states
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Speech Recognition toggle function
  const toggleListening = () => {
    if (!isSpeechSupported) {
      setToastMsg('Voice input is not supported in this browser.');
      setTimeout(() => setToastMsg(null), 3500);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('[StudyFlow AI] Error stopping recognition:', e);
        }
      }
      setIsListening(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }

      const SpeechRec = SpeechRecognition;
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;

      let langCode = 'en-US';
      if (preferences?.language) {
        if (preferences.language === 'en') langCode = 'en-US';
        else if (preferences.language === 'es') langCode = 'es-ES';
        else if (preferences.language === 'fr') langCode = 'fr-FR';
        else langCode = preferences.language;
      } else if (navigator.language) {
        langCode = navigator.language;
      }
      recognition.lang = langCode;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText((prev) => {
            if (!prev.trim()) {
              return transcript;
            }
            const endsWithSpace = prev.endsWith(' ');
            return `${prev}${endsWithSpace ? '' : ' '}${transcript}`;
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.error('[StudyFlow AI] Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setToastMsg('Microphone permission is required for voice input.');
          setTimeout(() => setToastMsg(null), 3500);
        } else if (event.error === 'no-speech') {
          // Quietly ignore or handle
        } else {
          setToastMsg(`Speech recognition error: ${event.error}`);
          setTimeout(() => setToastMsg(null), 3500);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('[StudyFlow AI] Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  // Clean up SpeechRecognition instance when component unmounts
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Attachment states
  const [selectedAttachments, setSelectedAttachments] = useState<ProcessedAttachment[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentMenuRef = useRef<HTMLDivElement | null>(null);

  // Enlarged Image Modal states
  const [enlargedImageSrc, setEnlargedImageSrc] = useState<string | null>(null);
  const [enlargedImageAlt, setEnlargedImageAlt] = useState<string>('');
  const [enlargedImageItem, setEnlargedImageItem] = useState<ImageSearchResult | null>(null);

  // Full Text Viewer Modal states
  const [viewingTextContent, setViewingTextContent] = useState<string | null>(null);
  const [viewingTextFileName, setViewingTextFileName] = useState<string>('');

  // PDF Viewer Modal states
  const [viewingPdfUrl, setViewingPdfUrl] = useState<string | null>(null);
  const [viewingPdfFileName, setViewingPdfFileName] = useState<string>('');

  // Restore chat history for active conversation ID
  useEffect(() => {
    let isMounted = true;
    const loadHistory = async () => {
      const history = await chatService.getChatHistory(activeConversationId);
      if (isMounted && history.length > 0) {
        setMessages(history);
      } else if (isMounted) {
        const welcomeGreeting = userName
          ? `Hi ${userName}! I am your StudyFlow AI Companion.`
          : 'Hi! I am your StudyFlow AI Companion.';

        setMessages([
          {
            id: `ai-standalone-init-${Date.now()}`,
            sender: 'ai',
            senderName: 'AI Study Companion',
            content: welcomeGreeting,
          },
        ]);
      }
    };
    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [activeConversationId, userName]);

  const handleNewChat = () => {
    const newId = chatService.createNewConversationId('general');
    setActiveConversationId(newId);
    setToastMsg('Started a new conversation');
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleSelectConversation = (conv: ConversationSummary) => {
    setActiveConversationId(conv.conversationId);
  };

  // Click outside listener for attachment menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(e.target as Node)) {
        setIsAttachmentMenuOpen(false);
      }
    };
    if (isAttachmentMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAttachmentMenuOpen]);

  // Escape key listener for attachment menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAttachmentMenuOpen(false);
      }
    };
    if (isAttachmentMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAttachmentMenuOpen]);

  const scrollToBottomInstant = () => {
    // Instant, non-competing scroll placement
    setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'auto',
      });
    }, 50);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setToastMsg(`Processing photo ${file.name}...`);

    try {
      const processed = await processSelectedFile(file);
      setSelectedAttachments((prev) => [...prev, processed]);
      setToastMsg(`Attached photo ${processed.fileName}`);
    } catch (err: any) {
      setToastMsg(err.message || 'Could not process photo.');
    } finally {
      setIsProcessingFile(false);
      if (e.target) e.target.value = '';
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const handleCameraClick = async () => {
    setIsAttachmentMenuOpen(false);
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: 'camera' as any });
        if (status.state === 'denied') {
          setToastMsg("Camera permission was denied.");
          setTimeout(() => setToastMsg(null), 3500);
          return;
        }
      }
    } catch (e) {}

    cameraInputRef.current?.click();

    const handleFocus = async () => {
      window.removeEventListener('focus', handleFocus);
      setTimeout(async () => {
        try {
          if (navigator.permissions && navigator.permissions.query) {
            const status = await navigator.permissions.query({ name: 'camera' as any });
            if (status.state === 'denied') {
              setToastMsg("Camera permission was denied.");
              setTimeout(() => setToastMsg(null), 3500);
            }
          }
        } catch (e) {}
      }, 1000);
    };

    setTimeout(() => {
      window.addEventListener('focus', handleFocus);
    }, 300);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setToastMsg(`Processing ${file.name}...`);

    try {
      const processed = await processSelectedFile(file);
      setSelectedAttachments((prev) => [...prev, processed]);
      setToastMsg(`Attached ${processed.fileName}`);
    } catch (err: any) {
      setToastMsg(err.message || 'Could not process file.');
    } finally {
      setIsProcessingFile(false);
      if (e.target) e.target.value = '';
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const handleAddLink = (url: string) => {
    try {
      const linkAtt = processLinkUrl(url);
      setSelectedAttachments((prev) => [...prev, linkAtt]);
      setToastMsg(`Attached link ${linkAtt.fileName}`);
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      setToastMsg(err.message || 'Could not add link.');
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setSelectedAttachments((prev) => {
      const target = prev[indexToRemove];
      if (target) {
        revokeAttachmentObjectUrl(target);
      }
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  const openEnlargedModal = (src: string | undefined, altName: string) => {
    if (!src) return;
    setEnlargedImageItem(null);
    setEnlargedImageSrc(src);
    setEnlargedImageAlt(`Uploaded image: ${altName}`);
  };

  const openTextViewerModal = (fileName: string, content?: string) => {
    if (!content) return;
    setViewingTextFileName(fileName);
    setViewingTextContent(content);
  };

  const openPdfViewerModal = (fileName: string, pdfUrl?: string) => {
    if (!pdfUrl) return;
    setViewingPdfFileName(fileName);
    setViewingPdfUrl(pdfUrl);
  };

  const dispatchChatMessage = async (promptText: string, customLoadingText?: string) => {
    if (!promptText.trim() && selectedAttachments.length === 0) return;
    if (isThinking || isProcessingFile) return;

    const attachmentsToSend = selectedAttachments.map((att) => ({
      ...att,
      previewUrl: getImageSource(att) || att.previewUrl,
    }));

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      senderName: 'You',
      content: promptText || (attachmentsToSend.length > 0 ? `[Attached ${attachmentsToSend.length} item(s)]` : ''),
      attachments: attachmentsToSend,
      attachment: attachmentsToSend[0] || null, // Backward compatibility fallback
    };

    const convId = activeConversationId;

    setMessages((prev) => [...prev, userMsg]);
    chatService.saveChatMessage(userMsg, convId);

    setInputText('');
    setSelectedAttachments([]); // Clear composer preview array
    setIsAttachmentMenuOpen(false);

    const firstAttName = attachmentsToSend[0]?.fileName;
    setThinkingLabel(
      customLoadingText ||
      (attachmentsToSend.length > 0
        ? `Analyzing ${firstAttName || 'attachments'}...`
        : 'AI Study Companion is thinking...')
    );
    setIsThinking(true);
    scrollToBottomInstant();

    // Format chat history for API call
    const historyPayload: ChatHistoryMessage[] = messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      senderName: m.senderName,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      attachment: m.attachment,
      attachments: m.attachments,
    }));

    try {
      const response = await aiService.sendRealAIChatMessage({
        session: null,
        history: historyPayload,
        userPrompt: promptText || `Analyze the attached items.`,
        attachments: attachmentsToSend,
        attachment: attachmentsToSend[0] || null,
      });

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        senderName: 'AI Assistant',
        content: response.message || 'Response generated.',
        imageResults: response.imageResults,
      };

      setMessages((prev) => [...prev, aiMsg]);
      chatService.saveChatMessage(aiMsg, convId);
      scrollToBottomInstant();
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        senderName: 'AI Assistant',
        content: 'Unable to process the request right now. Please try again.',
      };
      setMessages((prev) => [...prev, errorMsg]);
      chatService.saveChatMessage(errorMsg, convId);
    } finally {
      setIsThinking(false);
      setThinkingLabel('AI Study Companion is thinking...');
    }
  };

  const handleClearChat = async () => {
    const convId = activeConversationId;
    await chatService.clearChatHistory(convId);
    const welcomeGreeting = userName
      ? `Hi ${userName}! I am your StudyFlow AI Companion.`
      : 'Hi! I am your StudyFlow AI Companion.';

    setMessages([
      {
        id: `ai-standalone-init-${Date.now()}`,
        sender: 'ai',
        senderName: 'AI Study Companion',
        content: welcomeGreeting,
      },
    ]);
    setToastMsg('Chat history cleared!');
    setTimeout(() => setToastMsg(null), 2500);
  };
  void handleClearChat;

  const handleSend = () => {
    dispatchChatMessage(inputText);
  };

  const handleQuickChip = (chipActionLabel: string) => {
    let promptText = chipActionLabel;
    let loadingText: string | undefined;

    const typedTopic = inputText.trim();

    if (typedTopic) {
      switch (chipActionLabel) {
        case 'Explain Concept':
          promptText = `Explain the concept of "${typedTopic}" clearly and step-by-step with examples.`;
          break;
        case 'Give Example':
          promptText = `Give a practical real-world example explaining "${typedTopic}".`;
          break;
        case 'Important Formulas':
          promptText = `List the key formulas, definitions, and equations relevant to "${typedTopic}".`;
          break;
        case 'Practice Questions':
          loadingText = `Generating ${DEFAULT_PRACTICE_QUESTION_COUNT} practice questions for ${typedTopic}...`;
          promptText = `Generate exactly ${DEFAULT_PRACTICE_QUESTION_COUNT} practice questions with hints for "${typedTopic}". Number each question clearly 1 to ${DEFAULT_PRACTICE_QUESTION_COUNT}.`;
          break;
        case 'Start Quiz':
          setIsQuizModalOpen(true);
          promptText = `Opening 10-question interactive quiz on "${typedTopic}".`;
          break;
        default:
          promptText = chipActionLabel;
      }
      if (chipActionLabel !== 'Start Quiz') {
        dispatchChatMessage(promptText, loadingText);
      }
    } else {
      if (chipActionLabel === 'Start Quiz') {
        setIsQuizModalOpen(true);
      } else {
        const promptQuestions: Record<string, string> = {
          'Practice Questions': 'Sure! Which subject or topic would you like the 10 practice questions on?',
          'Explain Concept': 'Sure! Which concept or topic would you like me to explain?',
          'Give Example': 'Sure! Which concept or topic would you like an example for?',
          'Important Formulas': 'Sure! Which subject or topic would you like key formulas for?',
        };

        const replyMsg: ChatMessage = {
          id: `ai-chip-prompt-${Date.now()}`,
          sender: 'ai',
          senderName: 'AI Assistant',
          content: promptQuestions[chipActionLabel] || `Sure! Which subject or topic would you like help with? Type your question below!`,
        };
        setMessages((prev) => [...prev, replyMsg]);
        scrollToBottomInstant();
      }
    }
  };

  const handleBackToDailyPlan = () => {
    navigate('/');
  };

  return (
    <AppShell>
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-[100] bg-surface-container-high border border-tertiary/40 text-tertiary px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          <span className="font-label-sm text-sm">{toastMsg}</span>
        </div>
      )}

      {/* Hidden Native File Inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handlePhotoSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoSelect}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.js,.ts,.tsx,.jsx,.css,.html,.json,.xml,.md,.csv,.env,.config,.doc,.docx"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Link Input Dialog Modal */}
      <LinkInputModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onAddLink={handleAddLink}
      />

      {/* Full Text & Code Viewer Modal */}
      <TextViewerModal
        isOpen={!!viewingTextContent}
        fileName={viewingTextFileName}
        content={viewingTextContent || ''}
        onClose={() => setViewingTextContent(null)}
      />

      {/* PDF Viewer Frame Modal */}
      <PdfViewerModal
        isOpen={!!viewingPdfUrl}
        fileName={viewingPdfFileName}
        pdfUrl={viewingPdfUrl}
        onClose={() => setViewingPdfUrl(null)}
      />

      {/* Enlarged Image Preview Modal */}
      <ImagePreviewModal
        isOpen={!!enlargedImageItem || !!enlargedImageSrc}
        src={enlargedImageItem?.imageUrl || enlargedImageSrc}
        alt={enlargedImageItem?.title || enlargedImageAlt}
        sourceUrl={enlargedImageItem?.sourceUrl}
        sourceName={enlargedImageItem?.sourceName}
        googleSearchUrl={enlargedImageItem?.googleSearchUrl}
        onClose={() => {
          setEnlargedImageSrc(null);
          setEnlargedImageItem(null);
        }}
      />

      {/* Side-by-Side Flex Layout Container below top App Bar */}
      <div className="flex w-full h-[calc(100vh-9rem)] md:h-screen mt-16 md:mt-0 overflow-hidden relative bg-surface">
        {/* ChatGPT-Style Chat History Sidebar */}
        <ChatHistorySidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          currentMode="general"
        />

        {/* Right-Side Main General Companion Column */}
        <div className="flex-1 min-w-0 flex flex-col h-full relative overflow-hidden">
          {/* Header Bar */}
          <header className="w-full shrink-0 z-30 bg-surface border-b border-white/10 py-3 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen((prev) => !prev)}
                  className="md:hidden p-1.5 rounded-lg bg-surface-variant hover:bg-surface-container-highest text-on-surface transition-colors shrink-0"
                  title="Toggle Chat History Sidebar"
                >
                  <span className="material-symbols-outlined text-xl">history</span>
                </button>

                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-xl">psychology</span>
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm md:text-base font-bold text-on-surface whitespace-nowrap truncate">
                    AI Study Companion
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleBackToDailyPlan}
                  className="px-3 py-1.5 rounded-xl bg-surface-variant border border-white/10 hover:bg-surface-container-highest text-on-surface text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">home</span>
                  <span className="hidden sm:inline">Home Dashboard</span>
                </button>
              </div>
            </div>
          </header>

          {/* Main Messages Scroll Area */}
          <main className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-6 scrollbar-thin">
            <div className="max-w-4xl mx-auto flex flex-col gap-6">
              {messages.map((msg) => {
                const isAI = msg.sender === 'ai';
                const msgAttachments = msg.attachments || (msg.attachment ? [msg.attachment] : []);

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-4 max-w-[90%] md:max-w-[85%] ${isAI ? 'self-start' : 'self-end flex-row-reverse'
                      }`}
                  >
                    {isAI ? (
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                        <span className="material-symbols-outlined text-primary text-base">
                          psychology
                        </span>
                      </div>
                    ) : (
                      <ProfileAvatar
                        avatarUrl={profile?.avatarUrl}
                        name={profile?.name || 'User'}
                        className="w-8 h-8 rounded-full object-cover mt-1 flex-shrink-0"
                        iconSize="text-xs"
                      />
                    )}

                    <div className={`flex flex-col gap-1 ${isAI ? '' : 'items-end'}`}>
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest text-[10px]">
                        {isAI ? 'AI STUDY COMPANION' : msg.senderName}
                      </span>
                      <div
                        className={`p-4 md:p-5 text-on-surface ${isAI
                          ? 'ai-panel rounded-2xl rounded-tl-sm'
                          : 'glass-panel rounded-2xl rounded-tr-sm bg-primary-container/30 border-primary/20'
                          }`}
                      >
                        {/* Render message attachments */}
                        {msgAttachments.length > 0 && (
                          <div className="mb-3 flex flex-col gap-2.5">
                            {msgAttachments.map((att, attIdx) => {
                              const attImgSrc = getImageSource(att);

                              if (att.fileType === 'image' && attImgSrc) {
                                return (
                                  <button
                                    key={attIdx}
                                    type="button"
                                    onClick={() =>
                                      openEnlargedModal(
                                        attImgSrc,
                                        att.fileName || 'Uploaded image'
                                      )
                                    }
                                    aria-label={`Enlarge image: ${att.fileName}`}
                                    className="block group text-left max-w-xs focus:outline-none"
                                  >
                                    <div className="relative rounded-lg overflow-hidden border border-white/20 hover:border-primary transition-all shadow-md">
                                      <img
                                        src={attImgSrc}
                                        alt={`Uploaded image: ${att.fileName}`}
                                        className="w-full max-h-56 object-cover group-hover:scale-105 transition-transform"
                                      />
                                      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <span className="material-symbols-outlined text-white text-xl">zoom_in</span>
                                      </div>
                                    </div>
                                    <div className="mt-1 flex items-center justify-between text-[11px] text-on-surface-variant px-0.5">
                                      <span className="truncate max-w-[180px] font-medium text-on-surface">
                                        {att.fileName}
                                      </span>
                                      <span className="font-mono text-[10px]">{att.fileSize}</span>
                                    </div>
                                  </button>
                                );
                              }

                              if (att.fileType === 'link') {
                                return (
                                  <a
                                    key={attIdx}
                                    href={att.content}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2.5 rounded-lg bg-surface-container/60 border border-white/10 hover:border-primary/40 flex items-center gap-3 transition-colors max-w-sm group"
                                  >
                                    <span className="material-symbols-outlined text-primary text-xl group-hover:scale-110 transition-transform">
                                      link
                                    </span>
                                    <div className="flex flex-col truncate text-xs">
                                      <span className="font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                                        {att.fileName}
                                      </span>
                                      <span className="text-on-surface-variant text-[10px] truncate">
                                        {att.content}
                                      </span>
                                    </div>
                                  </a>
                                );
                              }

                              if (att.fileType === 'pdf') {
                                const pdfSourceUrl = getImageSource(att);
                                return (
                                  <div
                                    key={attIdx}
                                    className="p-3 rounded-xl bg-surface-container/70 border border-white/10 flex flex-col gap-2 max-w-md"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 truncate">
                                        <span className="material-symbols-outlined text-primary text-xl shrink-0">
                                          picture_as_pdf
                                        </span>
                                        <div className="flex flex-col truncate">
                                          <span className="font-semibold text-xs text-on-surface truncate">
                                            {att.fileName}
                                          </span>
                                          <span className="text-on-surface-variant text-[10px] font-mono">
                                            {att.fileSize} • PDF Document
                                          </span>
                                        </div>
                                      </div>
                                      <span className="px-1.5 py-0.5 rounded bg-primary-container/40 text-primary font-mono text-[9px] uppercase font-bold tracking-wider shrink-0">
                                        PDF
                                      </span>
                                    </div>

                                    {pdfSourceUrl && (
                                      <button
                                        type="button"
                                        onClick={() => openPdfViewerModal(att.fileName, pdfSourceUrl)}
                                        className="mt-1 w-full py-1.5 rounded-lg bg-primary-container/30 border border-primary/20 hover:bg-primary-container/50 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                                      >
                                        <span className="material-symbols-outlined text-sm">visibility</span>
                                        <span>View PDF</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              }

                              if (att.fileType === 'text') {
                                const excerpt = att.content ? att.content.slice(0, 300) : '';
                                const isTruncated = att.content && att.content.length > 300;

                                return (
                                  <div
                                    key={attIdx}
                                    className="p-3 rounded-xl bg-surface-container/70 border border-white/10 flex flex-col gap-2 max-w-md"
                                  >
                                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                                      <div className="flex items-center gap-2 truncate">
                                        <span className="material-symbols-outlined text-primary text-lg shrink-0">
                                          description
                                        </span>
                                        <span className="font-semibold text-xs text-on-surface truncate">
                                          {att.fileName}
                                        </span>
                                      </div>
                                      <span className="px-1.5 py-0.5 rounded bg-primary-container/40 text-primary font-mono text-[9px] uppercase font-bold tracking-wider shrink-0">
                                        {att.fileName.endsWith('.js') || att.fileName.endsWith('.ts') || att.fileName.endsWith('.json') || att.fileName.endsWith('.css')
                                          ? 'CODE'
                                          : 'TEXT'}
                                      </span>
                                    </div>

                                    {excerpt && (
                                      <div className="p-2.5 rounded-lg bg-surface-container-lowest/90 border border-white/10 font-mono text-[11px] text-on-surface-variant max-h-28 overflow-hidden whitespace-pre-wrap select-text leading-relaxed">
                                        {excerpt}
                                        {isTruncated ? '...' : ''}
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between pt-1">
                                      <span className="text-[10px] text-on-surface-variant font-mono">
                                        {att.fileSize}
                                      </span>
                                      {att.content && (
                                        <button
                                          type="button"
                                          onClick={() => openTextViewerModal(att.fileName, att.content)}
                                          className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 transition-colors"
                                        >
                                          <span className="material-symbols-outlined text-xs">visibility</span>
                                          <span>View Full File</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={attIdx}
                                  className="p-2.5 rounded-lg bg-surface-container/60 border border-white/10 flex items-center gap-3 max-w-sm"
                                >
                                  <span className="material-symbols-outlined text-primary text-xl shrink-0">
                                    description
                                  </span>
                                  <div className="flex flex-col truncate text-xs">
                                    <span className="font-semibold text-on-surface truncate">
                                      {att.fileName}
                                    </span>
                                    <span className="text-on-surface-variant text-[10px] font-mono">
                                      {att.fileSize} • DOCX Document
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Text Markdown Renderer */}
                        {typeof msg.content === 'string' ? (
                          <MarkdownRenderer
                            content={msg.content}
                            onImageClick={(src, alt) => openEnlargedModal(src, alt)}
                          />
                        ) : (
                          <div className="flex flex-col gap-3">
                            {msg.content.map((block: any, idx: number) => {
                              if (block.type === 'callout') {
                                return (
                                  <div
                                    key={idx}
                                    className="p-3 bg-surface-container/40 rounded-lg border border-white/5 my-1"
                                  >
                                    {block.label && (
                                      <strong className="text-tertiary mr-1">{block.label}</strong>
                                    )}
                                    {block.text}
                                  </div>
                                );
                              }
                              return <p key={idx}>{block.text}</p>;
                            })}
                          </div>
                        )}

                        {/* Structured Image Search Gallery Card */}
                        {msg.imageResults && msg.imageResults.length > 0 && (
                          <ImageGallery
                            imageResults={msg.imageResults}
                            onImageClick={(item) => setEnlargedImageItem(item)}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Thinking / File Processing Indicator */}
              {(isThinking || isProcessingFile) && (
                <div className="flex gap-4 max-w-[85%] self-start items-center animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-base animate-spin">
                      sync
                    </span>
                  </div>
                  <div className="glass-panel p-4 text-on-surface-variant text-sm italic rounded-2xl rounded-tl-sm bg-surface-container-low/50 flex items-center gap-2">
                    <span>{thinkingLabel}</span>
                  </div>
                </div>
              )}

              {/* Action Chips */}
              <div className="flex flex-wrap gap-2 mt-4 px-2 md:px-6">
                <button
                  type="button"
                  disabled={isThinking || isProcessingFile}
                  onClick={() => handleQuickChip('Explain Concept')}
                  className="font-label-sm text-label-sm px-3 py-1.5 rounded-full bg-primary-container/20 border border-primary-container/40 text-primary hover:bg-primary-container/40 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[14px] align-middle mr-1">
                    lightbulb
                  </span>
                  Explain Concept
                </button>
                <button
                  type="button"
                  disabled={isThinking || isProcessingFile}
                  onClick={() => handleQuickChip('Give Example')}
                  className="font-label-sm text-label-sm px-3 py-1.5 rounded-full bg-secondary-container/20 border border-secondary-container/40 text-secondary hover:bg-secondary-container/40 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[14px] align-middle mr-1">
                    schema
                  </span>
                  Give Example
                </button>
                <button
                  type="button"
                  disabled={isThinking || isProcessingFile}
                  onClick={() => handleQuickChip('Important Formulas')}
                  className="font-label-sm text-label-sm px-3 py-1.5 rounded-full bg-tertiary-container/20 border border-tertiary-container/40 text-tertiary hover:bg-tertiary-container/40 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[14px] align-middle mr-1">
                    functions
                  </span>
                  Important Formulas
                </button>
                <button
                  type="button"
                  disabled={isThinking || isProcessingFile}
                  onClick={() => handleQuickChip('Practice Questions')}
                  className="font-label-sm text-label-sm px-3 py-1.5 rounded-full bg-surface-variant border border-white/10 text-on-surface hover:bg-surface-container-highest disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[14px] align-middle mr-1">
                    edit_note
                  </span>
                  Practice Questions
                </button>
                <button
                  type="button"
                  disabled={isThinking || isProcessingFile}
                  onClick={() => handleQuickChip('Start Quiz')}
                  className="font-label-sm text-label-sm px-3 py-1.5 rounded-full bg-error-container/20 border border-error-container/40 text-error hover:bg-error-container/40 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[14px] align-middle mr-1">
                    quiz
                  </span>
                  Start Quiz
                </button>
              </div>
            </div>
          </main>

          {/* Bottom Composer Bar (scoped inside right column) */}
          <footer className="w-full shrink-0 z-30 bg-surface/90 backdrop-blur-2xl border-t border-white/10 px-4 md:px-6 py-3">
            <div className="max-w-4xl mx-auto flex flex-col gap-3">
              {/* Multi-Attachment Preview Bar */}
              {selectedAttachments.length > 0 && (
                <div className="mb-2 p-3 rounded-xl bg-surface-container-high/90 border border-primary/30 flex flex-wrap gap-2 shadow-xl backdrop-blur-md max-h-52 overflow-y-auto">
                  {selectedAttachments.map((att, idx) => {
                    const attSourceUrl = getImageSource(att);

                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-surface-container-lowest/90 border border-white/10 flex flex-col gap-1.5 max-w-xs text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            {att.fileType === 'image' ? (
                              <span className="material-symbols-outlined text-primary text-base">image</span>
                            ) : att.fileType === 'link' ? (
                              <div className="w-8 h-8 rounded bg-primary-container/30 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-primary text-base">link</span>
                              </div>
                            ) : att.fileType === 'pdf' ? (
                              <div className="w-8 h-8 rounded bg-primary-container/30 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-primary text-base">picture_as_pdf</span>
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded bg-primary-container/30 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-primary text-base">description</span>
                              </div>
                            )}
                            <div className="flex flex-col truncate text-[11px] gap-0.5 max-w-[140px]">
                              <span className="font-semibold text-on-surface truncate">
                                {att.fileName}
                              </span>
                              <span className="text-on-surface-variant/70 font-mono text-[9px] uppercase">
                                {att.fileType === 'link' ? att.content : `${att.fileSize} • ${att.fileType}`}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            aria-label={`Remove attachment ${att.fileName}`}
                            onClick={() => handleRemoveAttachment(idx)}
                            className="p-1 text-on-surface-variant hover:text-error transition-colors rounded-full hover:bg-white/10 shrink-0"
                          >
                            <span className="material-symbols-outlined text-base">close</span>
                          </button>
                        </div>

                        {/* PDF Actions */}
                        {att.fileType === 'pdf' && attSourceUrl && (
                          <button
                            type="button"
                            onClick={() => openPdfViewerModal(att.fileName, attSourceUrl)}
                            className="mt-0.5 text-left text-[11px] text-primary hover:underline font-medium flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">visibility</span>
                            <span>View PDF</span>
                          </button>
                        )}

                        {/* Text & Code Excerpt Preview */}
                        {att.fileType === 'text' && att.content && (
                          <>
                            <div className="mt-1 p-2 rounded bg-surface-container/60 border border-white/5 font-mono text-[10px] text-on-surface-variant max-h-16 overflow-hidden whitespace-pre-wrap select-text">
                              {att.content.slice(0, 200)}
                              {att.content.length > 200 ? '...' : ''}
                            </div>
                            <button
                              type="button"
                              onClick={() => openTextViewerModal(att.fileName, att.content)}
                              className="text-left text-[11px] text-primary hover:underline font-medium flex items-center gap-1 mt-0.5"
                            >
                              <span className="material-symbols-outlined text-xs">visibility</span>
                              <span>View Full File</span>
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="glass-panel p-2 rounded-xl flex items-end gap-2 focus-within:border-primary/50 transition-colors bg-surface-container-lowest/80 relative">
                {isListening && (
                  <div className="absolute left-1/2 transform -translate-x-1/2 -top-10 bg-error-container border border-error/20 text-on-error-container text-[11px] font-semibold px-3 py-1 rounded-full shadow-lg flex items-center gap-2 z-10">
                    <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
                    <span>Listening...</span>
                  </div>
                )}
                {/* Paperclip Button & Popover Menu Container */}
                <div className="relative mb-1">
                  <button
                    type="button"
                    aria-label="Attach File or Link"
                    aria-expanded={isAttachmentMenuOpen}
                    disabled={isThinking || isProcessingFile}
                    onClick={() => setIsAttachmentMenuOpen((prev) => !prev)}
                    className={`p-2 transition-colors rounded-full hover:bg-white/5 disabled:opacity-40 ${isAttachmentMenuOpen ? 'text-primary bg-primary-container/20' : 'text-on-surface-variant hover:text-primary'
                      }`}
                  >
                    <span className="material-symbols-outlined">attach_file</span>
                  </button>

                  {/* 3-Option Paperclip Attachment Menu */}
                  {isAttachmentMenuOpen && (
                    <div
                      ref={attachmentMenuRef}
                      className="absolute bottom-full mb-2 left-0 z-50 bg-surface-container-high/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-1.5 min-w-[170px] animate-fade-in flex flex-col gap-1 text-on-surface"
                      role="menu"
                      aria-label="Attachment options"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsAttachmentMenuOpen(false);
                          photoInputRef.current?.click();
                        }}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 text-on-surface transition-colors focus:ring-2 focus:ring-primary focus:outline-none text-left w-full cursor-pointer"
                      >
                        <span className="text-base">📷</span>
                        <span>Photos</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsAttachmentMenuOpen(false);
                          fileInputRef.current?.click();
                        }}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 text-on-surface transition-colors focus:ring-2 focus:ring-primary focus:outline-none text-left w-full cursor-pointer"
                      >
                        <span className="text-base">📁</span>
                        <span>Files</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleCameraClick}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 text-on-surface transition-colors focus:ring-2 focus:ring-primary focus:outline-none text-left w-full cursor-pointer"
                      >
                        <span className="text-base">📷</span>
                        <span>Camera</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsAttachmentMenuOpen(false);
                          setIsLinkModalOpen(true);
                        }}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 text-on-surface transition-colors focus:ring-2 focus:ring-primary focus:outline-none text-left w-full cursor-pointer"
                      >
                        <span className="text-base">🔗</span>
                        <span>Links</span>
                      </button>
                    </div>
                  )}
                </div>

                <textarea
                  value={inputText}
                  disabled={isThinking || isProcessingFile}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={
                    isListening
                      ? 'Listening...'
                      : selectedAttachments.length > 0
                      ? `Ask a question about ${selectedAttachments.length} attached item(s)...`
                      : 'Ask anything about MAKAUT syllabus, C, math, physics, or general topics...'
                  }
                  rows={1}
                  className="flex-1 min-w-0 bg-transparent border-none text-on-surface placeholder-on-surface-variant/50 focus:ring-0 resize-none py-3 max-h-32 min-h-[44px]"
                />
                <button
                  type="button"
                  disabled={(isThinking || isProcessingFile) && !isListening}
                  onClick={toggleListening}
                  title={
                    isListening
                      ? 'Stop voice input'
                      : 'Voice input'
                  }
                  aria-label={isListening ? 'Stop voice input' : 'Voice input'}
                  className={`p-2 mb-1 rounded-xl transition-colors flex items-center justify-center shrink-0 ${
                    isListening
                      ? 'bg-error text-on-error hover:bg-error/95 shadow-[0_0_10px_rgba(255,180,171,0.3)]'
                      : 'bg-surface-container-highest text-on-surface hover:bg-surface-container-high disabled:opacity-40 disabled:pointer-events-none'
                  }`}
                >
                  <span className="material-symbols-outlined">
                    {isListening ? 'mic' : 'mic_none'}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={isThinking || isProcessingFile || (!inputText.trim() && selectedAttachments.length === 0)}
                  onClick={handleSend}
                  aria-label="Send message"
                  className="p-2 mb-1 bg-primary text-on-primary rounded-xl hover:bg-primary-fixed-dim disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-[0_0_10px_rgba(185,199,228,0.3)] shrink-0"
                >
                  <span className="material-symbols-outlined">send</span>
                </button>
              </div>
              <p className="text-center font-label-sm text-label-sm text-on-surface-variant/50 mt-2 text-[10px]">
                StudyFlow AI Companion • Grounded in MAKAUT B.Tech CSE 1st Year Curriculum & Standalone Academic Assistant
              </p>
            </div>
          </footer>
        </div>
      </div>

      <QuizModal
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        topicId="cs-u1-1"
        topicTitle="Variables & Data Types"
        subjectCode="ES-CS201"
      />
    </AppShell>
  );
};
