import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import type { ChatMessage } from '../mock/data';
import { aiService, DEFAULT_PRACTICE_QUESTION_COUNT, type ChatHistoryMessage } from '../services/aiService';
import { useUserProfile, type ActiveStudySession } from '../mock/userProfile';
import { ProfileAvatar } from '../components/profile/ProfileAvatar';
import { studySessionService, STUDY_INACTIVITY_THRESHOLD } from '../services/studySessionService';
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
import { ImageGallery } from '../components/chat/ImageGallery';
import type { ImageSearchResult } from '../services/imageSearchService';
import { QuizModal } from '../components/quiz/QuizModal';
import { chatService, type ConversationSummary } from '../services/chatService';
import { ChatHistorySidebar } from '../components/chat/ChatHistorySidebar';
import { progressService } from '../services/progressService';
import { curriculumService } from '../services/curriculumService';

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const isSpeechSupported = !!SpeechRecognition;

export const TopicCompanionPage: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, preferences, activeStudySession, markSessionComplete } = useUserProfile();

  const userName = profile?.name && typeof profile.name === 'string' ? profile.name.trim() : '';

  const [activeConversationId, setActiveConversationId] = useState<string>(
    () => (location.state as any)?.conversationId || `topic-${topicId || 'default'}`
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Determine current topic session details
  const [topicSession, setTopicSession] = useState<ActiveStudySession | null>(() => {
    if (activeStudySession && (!topicId || activeStudySession.topicId === topicId)) {
      return activeStudySession;
    }

    // Try location state fallback
    const stateTask = (location.state as any)?.task;
    const stateSubject = (location.state as any)?.subjectName;
    if (stateTask) {
      return {
        topicId: stateTask.id || topicId || 'unknown-topic',
        topicTitle: stateTask.title || 'Topic Study Session',
        subjectName: stateSubject || 'Computer Science',
        subjectCode: stateTask.subject || 'CS-101',
        module: stateTask.subtitle ? stateTask.subtitle.split('•')[0].trim() : 'Module 1',
        semester: 1,
        duration: stateTask.estimatedDuration || '30 mins',
        mood: 'good',
        startedAt: Date.now(),
        completed: false,
      };
    }

    // Fallback: search curriculum data
    if (topicId) {
      const topics = curriculumService.getTopicsSync();
      const foundTopic = topics.find((t) => t.id === topicId);
      if (foundTopic) {
        return {
          topicId: foundTopic.id,
          topicTitle: foundTopic.subtopic ? `${foundTopic.topic} (${foundTopic.subtopic})` : foundTopic.topic,
          subjectName: foundTopic.subject,
          subjectCode: foundTopic.subjectCode,
          module: foundTopic.module,
          semester: foundTopic.semester,
          duration: foundTopic.estimatedDuration || '30 mins',
          mood: 'good',
          startedAt: Date.now(),
          completed: progressService.isTopicCompleted(foundTopic.id),
        };
      }
    }

    return {
      topicId: topicId || 'general-topic',
      topicTitle: 'Topic Study Session',
      subjectName: 'Computer Science',
      subjectCode: 'ES-CS201',
      module: 'Module 1',
      semester: 1,
      duration: '30 mins',
      mood: 'good',
      startedAt: Date.now(),
      completed: false,
    };
  });

  const convId = activeConversationId;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const greeting = topicSession
      ? aiService.getInitialTopicMessage(topicSession, userName)
      : `Hi ${userName || 'Student'}! Welcome to your Topic Companion.`;
    return [
      {
        id: `ai-init-${Date.now()}`,
        sender: 'ai',
        senderName: 'Topic AI Tutor',
        content: greeting,
      },
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState<string>('Topic AI Tutor is analyzing...');
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
          // Quietly ignore
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

  // Modal states
  const [enlargedImageSrc, setEnlargedImageSrc] = useState<string | null>(null);
  const [enlargedImageAlt, setEnlargedImageAlt] = useState<string>('');
  const [enlargedImageItem, setEnlargedImageItem] = useState<ImageSearchResult | null>(null);

  // Active study time timer with tab visibility & inactivity detection
  useEffect(() => {
    if (!topicSession) return;

    let lastActivityTime = Date.now();
    let isTabVisible = !document.hidden;

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible) {
        lastActivityTime = Date.now();
      }
    };

    const handleUserActivity = () => {
      lastActivityTime = Date.now();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    const timer = setInterval(() => {
      const isIdle = Date.now() - lastActivityTime > STUDY_INACTIVITY_THRESHOLD;
      if (isTabVisible && !isIdle && topicSession?.topicId) {
        studySessionService.recordActiveTime(topicSession.topicId, 1000);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
    };
  }, [topicSession]);

  // Restore chat history from MongoDB / local storage for this specific topic conversation
  useEffect(() => {
    let isMounted = true;
    const loadHistory = async () => {
      const history = await chatService.getChatHistory(convId);
      if (isMounted && history.length > 0) {
        setMessages(history);
      } else if (isMounted) {
        const greeting = topicSession
          ? aiService.getInitialTopicMessage(topicSession, userName)
          : `Hi ${userName || 'Student'}! Welcome to your Topic Companion.`;
        setMessages([
          {
            id: `ai-init-${Date.now()}`,
            sender: 'ai',
            senderName: 'Topic AI Tutor',
            content: greeting,
          },
        ]);
      }
    };
    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [convId, topicSession, userName]);

  const handleNewChat = () => {
    const newId = chatService.createNewConversationId('topic', topicId || topicSession?.topicId);
    setActiveConversationId(newId);
    setToastMsg('Started a new topic conversation');
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleSelectConversation = async (conv: ConversationSummary) => {
    if (conv.type === 'topic' && conv.topicId) {
      if (conv.topicId === topicId) {
        setActiveConversationId(conv.conversationId);
      } else {
        navigate(`/topic-companion/${conv.topicId}`, { state: { conversationId: conv.conversationId } });
      }
    } else {
      navigate('/companion', { state: { conversationId: conv.conversationId } });
    }
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

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollToBottomInstant = () => {
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'auto',
        });
      }
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
      attachment: attachmentsToSend[0] || null,
    };

    setMessages((prev) => [...prev, userMsg]);
    chatService.saveChatMessage(userMsg, convId);

    setInputText('');
    setSelectedAttachments([]);
    setIsAttachmentMenuOpen(false);

    const firstAttName = attachmentsToSend[0]?.fileName;
    setThinkingLabel(
      customLoadingText ||
        (attachmentsToSend.length > 0
          ? `Analyzing ${firstAttName || 'attachments'}...`
          : `Topic AI Tutor is preparing response for ${topicSession?.topicTitle}...`)
    );
    setIsThinking(true);
    scrollToBottomInstant();

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
        session: topicSession,
        history: historyPayload,
        userPrompt: promptText || `Analyze the attached items regarding ${topicSession?.topicTitle}.`,
        attachments: attachmentsToSend,
        attachment: attachmentsToSend[0] || null,
      });

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        senderName: 'Topic AI Tutor',
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
        senderName: 'Topic AI Tutor',
        content: 'Unable to process your question right now. Please try again.',
      };
      setMessages((prev) => [...prev, errorMsg]);
      chatService.saveChatMessage(errorMsg, convId);
    } finally {
      setIsThinking(false);
      setThinkingLabel('Topic AI Tutor is analyzing...');
    }
  };

  const handleClearChat = async () => {
    await chatService.clearChatHistory(convId);
    const greeting = topicSession
      ? aiService.getInitialTopicMessage(topicSession, userName)
      : `Hi ${userName || 'Student'}! Welcome to your Topic Companion.`;

    setMessages([
      {
        id: `ai-init-${Date.now()}`,
        sender: 'ai',
        senderName: 'Topic AI Tutor',
        content: greeting,
      },
    ]);
    setToastMsg(`Cleared history for "${topicSession?.topicTitle}"`);
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

    if (topicSession) {
      switch (chipActionLabel) {
        case 'Explain Concept':
          promptText = typedTopic
            ? `Explain the sub-concept of "${typedTopic}" within ${topicSession.topicTitle} (${topicSession.subjectCode}).`
            : `Explain the core concept of "${topicSession.topicTitle}" in ${topicSession.subjectName} (${topicSession.module}) clearly and step-by-step according to my learning style. Include code or formulas if relevant.`;
          break;
        case 'Give Example':
          promptText = typedTopic
            ? `Give a practical programming/numerical example for "${typedTopic}".`
            : `Give a practical real-world example explaining "${topicSession.topicTitle}" in ${topicSession.subjectName}.`;
          break;
        case 'Important Formulas':
          promptText = typedTopic
            ? `List key formulas, definitions, and code syntax for "${typedTopic}".`
            : `List the key formulas, definitions, and syntax rules relevant to "${topicSession.topicTitle}" in ${topicSession.subjectCode}.`;
          break;
        case 'Practice Questions':
          const targetTopic = typedTopic || topicSession.topicTitle;
          loadingText = `Generating ${DEFAULT_PRACTICE_QUESTION_COUNT} practice questions for ${targetTopic}...`;
          promptText = `Generate exactly ${DEFAULT_PRACTICE_QUESTION_COUNT} practice questions with hints for "${targetTopic}" in ${topicSession.subjectName} (${topicSession.subjectCode}).
          
Requirements:
1. Number each question clearly from 1 to ${DEFAULT_PRACTICE_QUESTION_COUNT}.
2. Balanced difficulty: Easy conceptual, medium application, hard problem-solving.
3. Include coding / problem-solving tasks relevant to ${targetTopic}.`;
          break;
        case 'Start Quiz':
          setIsQuizModalOpen(true);
          promptText = `Opening 10-question interactive quiz on "${typedTopic || topicSession.topicTitle}".`;
          break;
        default:
          promptText = chipActionLabel;
      }
      if (chipActionLabel !== 'Start Quiz') {
        dispatchChatMessage(promptText, loadingText);
      }
    }
  };

  const handleMarkComplete = () => {
    if (topicSession) {
      progressService.markTopicCompleted(topicSession.topicId);
      setTopicSession((prev) => (prev ? { ...prev, completed: true } : null));
      if (activeStudySession && activeStudySession.topicId === topicSession.topicId) {
        markSessionComplete();
      }
      setToastMsg(`Topic "${topicSession.topicTitle}" marked as complete!`);
      setTimeout(() => setToastMsg(null), 3000);
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

      {/* Modals */}
      <LinkInputModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onAddLink={handleAddLink}
      />
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
      <QuizModal
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        topicId={topicSession?.topicId || 'general-topic'}
        topicTitle={topicSession?.topicTitle || 'General Topic'}
        subjectCode={topicSession?.subjectCode || 'ES-CS201'}
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
          currentMode="topic"
      currentTopicId={topicId}
        />

        {/* Right-Side Main Topic Companion Column */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 min-w-0 flex flex-col h-full relative overflow-y-auto scrollbar-thin"
        >
          {/* Topic Header Bar */}
          <header className="w-full shrink-0 z-30 bg-surface-container/90 backdrop-blur-2xl border-b border-white/10 py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8 min-w-0 max-w-full">
            <div className="max-w-4xl mx-auto flex flex-col gap-4">
              {/* TOP: Breadcrumb/Category info and mobile sidebar toggle */}
              <div className="flex items-center gap-3 w-full min-w-0">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen((prev) => !prev)}
                  className="md:hidden p-1.5 rounded-lg bg-surface-variant hover:bg-surface-container-highest text-on-surface transition-colors shrink-0"
                  title="Toggle Chat History Sidebar"
                >
                  <span className="material-symbols-outlined text-xl">history</span>
                </button>

                <div className="flex flex-wrap items-center gap-1.5 text-xs text-primary font-medium max-w-full min-w-0">
                  <span className="material-symbols-outlined text-sm shrink-0">auto_stories</span>
                  <span className="font-semibold uppercase tracking-wider text-[11px] shrink-0">Topic Companion</span>
                  <span className="text-on-surface-variant/40 shrink-0">•</span>
                  <span className="font-mono text-on-surface-variant shrink-0">{topicSession?.subjectCode}</span>
                  <span className="text-on-surface-variant/40 shrink-0">•</span>
                  <span className="text-on-surface-variant/80 break-words">{topicSession?.subjectName}</span>
                </div>
              </div>

              {/* THEN: Responsive Topic Title */}
              <div className="min-w-0 max-w-full">
                <h2 
                  className="text-base sm:text-lg md:text-xl xl:text-2xl font-semibold text-on-surface leading-tight break-words whitespace-normal min-w-0 max-w-full"
                  style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                >
                  {topicSession?.topicTitle}
                </h2>
              </div>

              {/* THEN: Metadata information */}
              <div className="text-xs text-on-surface-variant/80 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 flex-wrap min-w-0 max-w-full">
                <span>{topicSession?.module}</span>
                <span className="hidden sm:inline text-on-surface-variant/40">•</span>
                <span>Estimated: {topicSession?.duration}</span>
              </div>

              {/* THEN: Action buttons at the bottom */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 mt-1 w-full justify-start">
                <button
                  type="button"
                  onClick={handleBackToDailyPlan}
                  className="px-3.5 py-1.5 rounded-xl bg-surface-variant border border-white/10 hover:bg-surface-container-highest text-on-surface text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 w-full sm:w-auto justify-center"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Back to Dashboard</span>
                </button>
                <button
                  type="button"
                  onClick={handleMarkComplete}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 w-full sm:w-auto justify-center ${
                    topicSession?.completed
                      ? 'bg-tertiary/20 text-tertiary border border-tertiary/30'
                      : 'bg-tertiary text-on-tertiary hover:bg-tertiary/90 shadow-md'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {topicSession?.completed ? 'task_alt' : 'check'}
                  </span>
                  <span>{topicSession?.completed ? 'Completed' : 'Mark Complete'}</span>
                </button>
              </div>
            </div>
          </header>

          {/* Main Chat Messages Scroll Area */}
          <main className="flex-grow shrink-0 px-4 md:px-6 py-6">
            <div className="max-w-4xl mx-auto flex flex-col gap-6">
              {messages.map((msg) => {
                const isAI = msg.sender === 'ai';
                const msgAttachments = msg.attachments || (msg.attachment ? [msg.attachment] : []);

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-4 max-w-[90%] md:max-w-[85%] ${
                      isAI ? 'self-start' : 'self-end flex-row-reverse'
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
                      <span
                        style={{ fontFamily: 'Geist' }}
                        className="text-[10px] uppercase tracking-widest text-on-surface-variant/80 font-semibold"
                      >
                        {isAI ? 'AI STUDY COMPANION' : msg.senderName}
                      </span>
                      <div
                        className={`p-4 md:p-5 text-on-surface ${
                          isAI
                            ? 'ai-panel rounded-2xl rounded-tl-sm'
                            : 'glass-panel rounded-2xl rounded-tr-sm bg-primary/10 border-primary/20 dark:bg-primary-container/20'
                        }`}
                      >
                        {msgAttachments.length > 0 && (
                          <div className="mb-3 flex flex-col gap-2.5">
                            {msgAttachments.map((att, attIdx) => {
                              const attImgSrc = getImageSource(att);
                              if (att.fileType === 'image' && attImgSrc) {
                                return (
                                  <button
                                    key={attIdx}
                                    type="button"
                                    onClick={() => openEnlargedModal(attImgSrc, att.fileName || 'Uploaded image')}
                                    className="block group text-left max-w-xs focus:outline-none"
                                  >
                                    <div className="relative rounded-lg overflow-hidden border border-white/20 hover:border-primary transition-all shadow-md">
                                      <img
                                        src={attImgSrc}
                                        alt={`Uploaded image: ${att.fileName}`}
                                        className="w-full max-h-56 object-cover group-hover:scale-105 transition-transform"
                                      />
                                    </div>
                                  </button>
                                );
                              }
                              return null;
                            })}
                          </div>
                        )}

                        <MarkdownRenderer content={typeof msg.content === 'string' ? msg.content : ''} />

                        {msg.imageResults && msg.imageResults.length > 0 && (
                          <ImageGallery
                            imageResults={msg.imageResults}
                            onImageClick={(item) => {
                              setEnlargedImageSrc(null);
                              setEnlargedImageItem(item);
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isThinking && (
                <div className="flex gap-4 max-w-[85%] self-start animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="material-symbols-outlined text-primary text-base animate-spin">
                      sync
                    </span>
                  </div>
                  <div className="glass-panel p-4 rounded-2xl rounded-tl-sm bg-surface-container-low/50 text-on-surface-variant text-xs flex items-center gap-2">
                    <span>{thinkingLabel}</span>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* Bottom Composer Bar (scoped inside right column) */}
          <footer className="w-full shrink-0 z-30 bg-surface/90 backdrop-blur-2xl border-t border-white/10 px-4 md:px-6 py-3 sticky bottom-0">
            <div className="max-w-4xl mx-auto flex flex-col gap-3">
              {/* Quick Action Chips tailored to topic */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {['Explain Concept', 'Give Example', 'Important Formulas', 'Practice Questions', 'Start Quiz'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleQuickChip(chip)}
                    className="px-3 py-1.5 rounded-full bg-surface-container-high/80 border border-white/10 hover:border-primary/40 text-on-surface-variant hover:text-primary text-xs font-semibold whitespace-nowrap transition-all active:scale-95 shrink-0"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Attachment Preview Strip */}
              {selectedAttachments.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  {selectedAttachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-surface-container-highest px-3 py-1.5 rounded-lg border border-white/15 text-xs text-on-surface shrink-0"
                    >
                      <span className="material-symbols-outlined text-primary text-sm">attach_file</span>
                      <span className="truncate max-w-[150px] font-medium">{att.fileName}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="text-on-surface-variant hover:text-error transition-colors ml-1"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Text Input Row */}
              <div className="flex items-center gap-2 relative">
                {isListening && (
                  <div className="absolute left-1/2 transform -translate-x-1/2 -top-12 bg-error-container border border-error/20 text-on-error-container text-[11px] font-semibold px-3 py-1 rounded-full shadow-lg flex items-center gap-2 z-10">
                    <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
                    <span>Listening...</span>
                  </div>
                )}
                <div className="relative" ref={attachmentMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsAttachmentMenuOpen((prev) => !prev)}
                    className="p-3 rounded-xl bg-surface-variant border border-white/10 hover:bg-surface-container-highest text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
                    title="Attach image, document or link"
                  >
                    <span className="material-symbols-outlined">add_circle</span>
                  </button>

                  {isAttachmentMenuOpen && (
                    <div className="absolute bottom-14 left-0 bg-surface-container-high border border-white/15 rounded-2xl shadow-2xl p-2 min-w-[200px] flex flex-col gap-1 z-50">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAttachmentMenuOpen(false);
                          photoInputRef.current?.click();
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-variant text-xs text-on-surface font-medium transition-colors w-full text-left"
                      >
                        <span className="material-symbols-outlined text-primary text-lg">image</span>
                        <span>Upload Image</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAttachmentMenuOpen(false);
                          fileInputRef.current?.click();
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-variant text-xs text-on-surface font-medium transition-colors w-full text-left"
                      >
                        <span className="material-symbols-outlined text-tertiary text-lg">description</span>
                        <span>Upload Document (PDF/Text)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCameraClick}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-variant text-xs text-on-surface font-medium transition-colors w-full text-left"
                      >
                        <span className="material-symbols-outlined text-primary text-lg">photo_camera</span>
                        <span>Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAttachmentMenuOpen(false);
                          setIsLinkModalOpen(true);
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-variant text-xs text-on-surface font-medium transition-colors w-full text-left"
                      >
                        <span className="material-symbols-outlined text-secondary text-lg">link</span>
                        <span>Add Web Link</span>
                      </button>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={inputText}
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
                      : `Ask anything about ${topicSession?.topicTitle || 'this topic'}...`
                  }
                  className="flex-1 min-w-0 bg-surface-variant/40 border border-white/10 rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/40 transition-all font-body-md text-sm"
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
                  className={`p-3 rounded-xl transition-all flex items-center justify-center shrink-0 ${
                    isListening
                      ? 'bg-error text-on-error hover:bg-error/95 shadow-[0_0_10px_rgba(255,180,171,0.3)]'
                      : 'bg-surface-variant border border-white/10 text-on-surface hover:bg-surface-container-highest disabled:opacity-40 disabled:pointer-events-none'
                  }`}
                >
                  <span className="material-symbols-outlined">
                    {isListening ? 'mic' : 'mic_none'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isThinking || (!inputText.trim() && selectedAttachments.length === 0)}
                  className="p-3 rounded-xl bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center shrink-0"
                >
                  <span className="material-symbols-outlined">send</span>
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </AppShell>
  );
};
