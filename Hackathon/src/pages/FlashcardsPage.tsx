import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { GlassCard } from '../components/ui/GlassCard';
import { curriculumService, subscribeCurriculum } from '../services/curriculumService';
import { SyllabusUploadModal } from '../components/dashboard/SyllabusUploadModal';
import { flashcardsService, type FlashcardDeck, type Flashcard } from '../services/flashcardsService';
import { useUserProfile } from '../mock/userProfile';
import { notifyProgressListeners } from '../services/progressService';

export const FlashcardsPage: React.FC = () => {
  const { profile } = useUserProfile();

  // Decks list & load states
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [isLoadingDecks, setIsLoadingDecks] = useState<boolean>(true);
  const [curriculumVersion, setCurriculumVersion] = useState<number>(0);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Filters & selection for deck creation
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [deckTitle, setDeckTitle] = useState<string>('');
  const [subtopicsText, setSubtopicsText] = useState<string>('');

  // AI Generation Preview/Status
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedCards, setGeneratedCards] = useState<Flashcard[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Study Mode State
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // Search/Filter for home view
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  // Load Decks & Subscribe to syllabus updates
  useEffect(() => {
    loadDecks();
    return subscribeCurriculum(() => {
      setCurriculumVersion((v) => v + 1);
    });
  }, []);

  const loadDecks = async () => {
    setIsLoadingDecks(true);
    const data = await flashcardsService.getDecks();
    setDecks(data);
    setIsLoadingDecks(false);
  };

  // Get dynamic subjects/topics from syllabus
  const subjects = curriculumService.getSubjectsSync();
  const topics = curriculumService.getTopicsSync();

  // Reset selected topic when subject changes
  useEffect(() => {
    if (selectedSubjectCode) {
      const subjectTopics = topics.filter((t) => t.subjectCode === selectedSubjectCode);
      if (subjectTopics.length > 0) {
        setSelectedTopicId(subjectTopics[0].id);
        const sub = subjects.find((s) => s.code === selectedSubjectCode);
        setDeckTitle(`${sub?.name || 'Syllabus'} - ${subjectTopics[0].topic}`);
      } else {
        setSelectedTopicId('');
        setDeckTitle('');
      }
    } else {
      setSelectedTopicId('');
      setDeckTitle('');
    }
  }, [selectedSubjectCode, curriculumVersion]);

  // Adjust deck title when topic changes
  useEffect(() => {
    if (selectedTopicId) {
      const topicObj = topics.find((t) => t.id === selectedTopicId);
      const subObj = subjects.find((s) => s.code === selectedSubjectCode);
      if (topicObj && subObj) {
        setDeckTitle(`${subObj.name} - ${topicObj.topic}`);
        setSubtopicsText(topicObj.subtopic || '');
      }
    }
  }, [selectedTopicId]);

  const handleStartGenerate = () => {
    if (subjects.length === 0) {
      setIsUploadModalOpen(true);
      return;
    }
    if (!selectedSubjectCode) {
      setSelectedSubjectCode(subjects[0].code);
    }
    setErrorMsg(null);
    setGeneratedCards([]);
  };

  const handleGenerateCards = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectCode || !selectedTopicId) {
      setErrorMsg('Please select a subject and a topic.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    const subObj = subjects.find((s) => s.code === selectedSubjectCode);
    const topicObj = topics.find((t) => t.id === selectedTopicId);

    try {
      const cards = await flashcardsService.generateDeck(
        subObj?.name || 'Subject',
        topicObj?.topic || 'Topic',
        subtopicsText
      );
      setGeneratedCards(cards);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate flashcards. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDeck = async () => {
    if (generatedCards.length === 0) return;

    const subObj = subjects.find((s) => s.code === selectedSubjectCode);
    const topicObj = topics.find((t) => t.id === selectedTopicId);

    const newDeck: FlashcardDeck = {
      id: `deck-${Date.now()}`,
      title: deckTitle || 'New Flashcard Deck',
      subjectCode: selectedSubjectCode,
      subjectName: subObj?.name || 'Subject',
      topicId: selectedTopicId,
      topicName: topicObj?.topic || 'Topic',
      cards: generatedCards,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastStudiedAt: Date.now(),
    };

    await flashcardsService.saveDeck(newDeck);
    await loadDecks();
    setGeneratedCards([]);
    setSelectedSubjectCode('');
    setSelectedTopicId('');
    setDeckTitle('');
    setSubtopicsText('');
    
    // Automatically open the saved deck for study
    setActiveDeck(newDeck);
    setCurrentCardIndex(0);
    setIsFlipped(false);

    try {
      notifyProgressListeners();
    } catch (e) {}
  };

  const handleDeleteDeck = async (deckId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this flashcard deck?')) return;
    await flashcardsService.deleteDeck(deckId);
    loadDecks();

    try {
      notifyProgressListeners();
    } catch (e) {}
  };

  // Study Mode Interaction Handlers
  const handleRateCard = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!activeDeck) return;

    const updatedCards = [...activeDeck.cards];
    updatedCards[currentCardIndex] = {
      ...updatedCards[currentCardIndex],
      status: rating,
      completed: true,
    };

    const updatedDeck = {
      ...activeDeck,
      cards: updatedCards,
      lastStudiedAt: Date.now(),
    };

    setActiveDeck(updatedDeck);
    setDecks((prev) => prev.map((d) => (d.id === activeDeck.id ? updatedDeck : d)));
    await flashcardsService.saveDeck(updatedDeck);

    // Dynamic state flip and transition to next card
    setTimeout(() => {
      setIsFlipped(false);
      if (currentCardIndex < activeDeck.cards.length - 1) {
        setCurrentCardIndex((prev) => prev + 1);
      }
    }, 200);

    try {
      notifyProgressListeners();
    } catch (e) {}
  };

  // Calculate deck progress
  const getDeckProgress = (deck: FlashcardDeck) => {
    const completedCount = deck.cards.filter((c) => c.completed).length;
    const totalCount = deck.cards.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    return { completedCount, totalCount, percentage };
  };

  // Filtered decks for main list view
  const filteredDecks = decks.filter((deck) => {
    const matchesSearch =
      deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deck.topicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deck.subjectName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSubject = subjectFilter === 'all' || deck.subjectCode === subjectFilter;

    return matchesSearch && matchesSubject;
  });

  return (
    <AppShell>
      {/* Syllabus Upload Modal */}
      <SyllabusUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onConfirm={() => {
          setIsUploadModalOpen(false);
          setCurriculumVersion((v) => v + 1);
        }}
      />

      <div className="pt-24 md:pt-12 pb-32 px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto">
        
        {/* Main Header / Navigation */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-6">
          <div>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">
              {activeDeck ? activeDeck.title : `AI Smart Flashcards for ${profile?.name || 'Student'}`}
            </h1>
            <p className="text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-base">school</span>
              {activeDeck 
                ? `${activeDeck.subjectName} • ${activeDeck.topicName}`
                : 'Boost your active recall and retention grounded in your syllabus'}
            </p>
          </div>

          {activeDeck && (
            <button
              onClick={() => setActiveDeck(null)}
              className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface border border-white/10 hover:border-white/20 font-semibold text-sm rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer self-start"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              <span>Back to Decks</span>
            </button>
          )}
        </div>

        {/* -------------------- STUDY PAGE VIEW -------------------- */}
        {activeDeck ? (
          <div className="max-w-xl mx-auto flex flex-col gap-6">
            
            {/* Card Progress Indicator */}
            <div className="flex items-center justify-between text-sm text-on-surface-variant font-medium">
              <span>Card {currentCardIndex + 1} of {activeDeck.cards.length}</span>
              <span>{getDeckProgress(activeDeck).completedCount} / {activeDeck.cards.length} Mastery Points</span>
            </div>

            {/* Linear Progress Bar */}
            <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#00bfa5] transition-all duration-300 rounded-full"
                style={{ width: `${((currentCardIndex + 1) / activeDeck.cards.length) * 100}%` }}
              ></div>
            </div>

            {/* Smart Flashcard Container (3D Flip Animation) */}
            <div 
              onClick={() => setIsFlipped(!isFlipped)}
              className="w-full h-[420px] md:h-[460px] cursor-pointer [perspective:1000px] relative select-none"
            >
              <div 
                className={`w-full h-full transition-transform duration-500 [transform-style:preserve-3d] relative rounded-2xl shadow-xl border border-outline-variant/30 ${
                  isFlipped ? '[transform:rotateY(180deg)]' : ''
                }`}
              >
                
                {/* Front Side: Question */}
                <div className="absolute inset-0 w-full h-full bg-surface-container dark:bg-surface-secondary rounded-2xl p-6 flex flex-col justify-between [backface-visibility:hidden]">
                  <div className="flex items-center justify-between text-xs text-primary dark:text-primary-fixed font-bold tracking-widest uppercase pb-3 border-b border-outline-variant/10 shrink-0">
                    <span>Question</span>
                    <span className="material-symbols-outlined text-lg">help_outline</span>
                  </div>
                  <div className="flex-grow overflow-y-auto py-4 px-1 flex flex-col items-center justify-center text-center">
                    <p className="text-lg md:text-xl font-headline-md text-on-surface leading-relaxed whitespace-normal break-words">
                      {activeDeck.cards[currentCardIndex].question}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-outline-variant/10 text-center text-xs text-on-surface-variant/70 italic flex items-center justify-center gap-1 shrink-0">
                    <span className="material-symbols-outlined text-sm">touch_app</span>
                    <span>Click to reveal answer</span>
                  </div>
                </div>

                {/* Back Side: Answer */}
                <div className="absolute inset-0 w-full h-full bg-surface-container-high dark:bg-surface-variant rounded-2xl p-6 flex flex-col justify-between [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <div className="flex items-center justify-between text-xs text-[#00bfa5] font-bold tracking-widest uppercase pb-3 border-b border-outline-variant/10 shrink-0">
                    <span>Answer</span>
                    <span className="material-symbols-outlined text-lg text-[#00bfa5]">check_circle</span>
                  </div>
                  <div className="flex-grow overflow-y-auto py-4 px-1 flex flex-col items-start gap-4">
                    <p className="text-base md:text-lg font-medium text-on-surface leading-relaxed text-left w-full whitespace-normal break-words">
                      {activeDeck.cards[currentCardIndex].answer}
                    </p>
                    {activeDeck.cards[currentCardIndex].explanation && (
                      <div className="w-full text-xs text-on-surface-variant bg-surface/50 border border-outline-variant/15 px-3.5 py-2.5 rounded-xl text-left whitespace-normal break-words">
                        <strong className="text-primary dark:text-primary-fixed block mb-1">Study Note:</strong>
                        <span>{activeDeck.cards[currentCardIndex].explanation}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-3 border-t border-outline-variant/10 text-center text-xs text-on-surface-variant/70 italic flex items-center justify-center gap-1 shrink-0">
                    <span className="material-symbols-outlined text-sm">touch_app</span>
                    <span>Click to view question</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Navigation & Knowledge Ratings */}
            <div className="flex flex-col gap-4">
              
              {/* Back / Next Standard Buttons */}
              <div className="flex justify-between items-center gap-4">
                <button
                  disabled={currentCardIndex === 0}
                  onClick={() => {
                    setIsFlipped(false);
                    setCurrentCardIndex((prev) => Math.max(0, prev - 1));
                  }}
                  className="flex-1 py-3 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  <span>Previous</span>
                </button>

                <button
                  disabled={currentCardIndex === activeDeck.cards.length - 1}
                  onClick={() => {
                    setIsFlipped(false);
                    setCurrentCardIndex((prev) => Math.min(activeDeck.cards.length - 1, prev + 1));
                  }}
                  className="flex-1 py-3 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <span>Next</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              </div>

              {/* Rate Card (Only shown when flipped or as helper shortcuts) */}
              {isFlipped && (
                <div className="flex flex-col gap-2.5 mt-2 p-4 rounded-2xl bg-surface-container/30 border border-outline-variant/20">
                  <div className="text-xs text-on-surface-variant font-bold text-center uppercase tracking-wider mb-1">
                    How well did you know this concept?
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => handleRateCard('again')}
                      className="py-2.5 text-xs font-bold text-[#ba1a1a] bg-[#ffdad6]/20 border border-[#ffdad6]/50 rounded-xl hover:bg-[#ffdad6]/40 transition-colors"
                    >
                      Again
                    </button>
                    <button
                      onClick={() => handleRateCard('hard')}
                      className="py-2.5 text-xs font-bold text-[#705d00] bg-[#ffe170]/10 border border-[#ffe170]/30 rounded-xl hover:bg-[#ffe170]/20 transition-colors"
                    >
                      Hard
                    </button>
                    <button
                      onClick={() => handleRateCard('good')}
                      className="py-2.5 text-xs font-bold text-primary dark:text-primary-fixed-dim bg-primary-container/10 border border-primary-container/20 rounded-xl hover:bg-primary-container/20 transition-colors"
                    >
                      Good
                    </button>
                    <button
                      onClick={() => handleRateCard('easy')}
                      className="py-2.5 text-xs font-bold text-[#006b5c] bg-[#68fadd]/10 border border-[#68fadd]/30 rounded-xl hover:bg-[#68fadd]/20 transition-colors"
                    >
                      Easy
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>
        ) : (
          /* -------------------- DECK DIRECTORY VIEW -------------------- */
          <div className="flex flex-col gap-8">

            {/* Filter / Search Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              
              {/* Search Bar */}
              <div className="relative w-full md:max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant/60">
                  <span className="material-symbols-outlined text-lg">search</span>
                </span>
                <input
                  type="text"
                  placeholder="Search decks, topics, or subjects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm bg-surface-container/60 border border-outline-variant/30 rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              {/* Subject Selector and Create Actions */}
              <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                
                {/* Subject filter selector */}
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="px-3.5 py-3 text-sm bg-surface-container/60 border border-outline-variant/30 rounded-xl text-on-surface focus:outline-none cursor-pointer"
                >
                  <option value="all">All Subjects</option>
                  {subjects.map((sub) => (
                    <option key={sub.code} value={sub.code}>{sub.name}</option>
                  ))}
                </select>

                <button
                  onClick={handleStartGenerate}
                  disabled={isGenerating}
                  className="flex-1 md:flex-none px-5 py-3 bg-[#1a237e] hover:bg-[#283593] dark:bg-[#3f51b5] dark:hover:bg-[#4d62e0] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-[0_4px_12px_rgba(26,35,126,0.2)] hover:shadow-[0_6px_16px_rgba(26,35,126,0.3)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-75 disabled:cursor-wait disabled:pointer-events-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2"
                  aria-label="AI Generate Deck"
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Generating Deck...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg animate-[pulse_2s_infinite]">auto_awesome</span>
                      <span>AI Generate Deck</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Empty Syllabus State Checker */}
            {subjects.length === 0 ? (
              <div className="bg-surface-container/30 border border-outline-variant/20 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 max-w-xl mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center text-on-surface-variant/40">
                  <span className="material-symbols-outlined text-4xl">upload_file</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-base font-bold text-on-surface mb-2">No Syllabus Uploaded</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Upload your syllabus first to automatically extract subjects, modules, and topics, allowing the AI to generate personalized flashcards.
                  </p>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-6 py-3 bg-[#1a237e] dark:bg-[#5c6bec] text-white rounded-xl font-bold text-sm shadow-md hover:opacity-95 transition-all cursor-pointer"
                >
                  Upload Syllabus
                </button>
              </div>
            ) : (
              <>
                {/* -------------------- DECK CREATOR / PREVIEW VIEW -------------------- */}
                {(selectedSubjectCode || generatedCards.length > 0) && (
                  <GlassCard className="p-6 border border-[#00bfa5]/35 flex flex-col gap-6 relative overflow-hidden">
                    
                    {/* Header indicator */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#00bfa5]">auto_awesome</span>
                        <h2 className="font-headline-md text-base font-bold text-on-surface">Generate New Flashcard Deck</h2>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedSubjectCode('');
                          setGeneratedCards([]);
                        }}
                        className="text-on-surface-variant hover:text-on-surface"
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>

                    {/* Generator Form */}
                    {generatedCards.length === 0 && (
                      <form onSubmit={handleGenerateCards} className="flex flex-col gap-4">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Subject Selector */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Select Subject</label>
                            <select
                              value={selectedSubjectCode}
                              onChange={(e) => setSelectedSubjectCode(e.target.value)}
                              className="px-3.5 py-3 text-sm bg-surface-container/60 border border-outline-variant/30 rounded-xl text-on-surface focus:outline-none cursor-pointer"
                            >
                              {subjects.map((sub) => (
                                <option key={sub.code} value={sub.code}>{sub.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Topic Selector */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Select Topic</label>
                            <select
                              value={selectedTopicId}
                              onChange={(e) => setSelectedTopicId(e.target.value)}
                              disabled={!selectedSubjectCode}
                              className="px-3.5 py-3 text-sm bg-surface-container/60 border border-outline-variant/30 rounded-xl text-on-surface focus:outline-none cursor-pointer disabled:opacity-50"
                            >
                              {topics.filter((t) => t.subjectCode === selectedSubjectCode).map((topic) => (
                                <option key={topic.id} value={topic.id}>{topic.topic}</option>
                              ))}
                            </select>
                          </div>

                        </div>

                        {/* Deck Custom Name input */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Deck Title</label>
                          <input
                            type="text"
                            placeholder="Study Deck Title"
                            value={deckTitle}
                            onChange={(e) => setDeckTitle(e.target.value)}
                            className="px-3.5 py-3 text-sm bg-surface-container/60 border border-outline-variant/30 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
                          />
                        </div>

                        {/* Extra Context details */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Subtopics / Context (Dynamic)</label>
                          <textarea
                            placeholder="Add subtopics or specific concept keywords here to align the AI..."
                            value={subtopicsText}
                            onChange={(e) => setSubtopicsText(e.target.value)}
                            rows={3}
                            className="px-3.5 py-3 text-sm bg-surface-container/60 border border-outline-variant/30 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none resize-none"
                          />
                        </div>

                        {errorMsg && (
                          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-3.5 rounded-xl font-medium flex items-start gap-2.5">
                            <span className="material-symbols-outlined text-lg shrink-0 mt-0.5">error</span>
                            <span>{errorMsg}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isGenerating}
                          className="py-3 bg-[#1a237e] hover:bg-[#283593] dark:bg-[#3f51b5] dark:hover:bg-[#4d62e0] text-white rounded-xl font-bold text-sm shadow-[0_4px_12px_rgba(26,35,126,0.2)] hover:shadow-[0_6px_16px_rgba(26,35_126,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-wait disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2"
                          aria-label="AI Generate Deck"
                        >
                          {isGenerating ? (
                            <>
                              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Generating Deck...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-lg animate-[pulse_2s_infinite]">auto_awesome</span>
                              <span>AI Generate Deck</span>
                            </>
                          )}
                        </button>

                      </form>
                    )}

                    {/* Preview Generated Deck Cards */}
                    {generatedCards.length > 0 && (
                      <div className="flex flex-col gap-5">
                        <div className="text-sm text-on-surface-variant font-medium">
                          Previewing <strong className="text-on-surface">{generatedCards.length} Cards</strong> generated for <strong className="text-primary dark:text-primary-fixed">{deckTitle}</strong>:
                        </div>

                        <div className="max-h-72 overflow-y-auto pr-2 flex flex-col gap-3">
                          {generatedCards.map((card, idx) => (
                            <div key={idx} className="bg-surface-container-high/60 border border-outline-variant/35 rounded-xl p-4 flex flex-col gap-2">
                              <div className="text-xs font-bold text-primary dark:text-primary-fixed">Card {idx + 1}</div>
                              <div className="text-sm font-semibold text-on-surface"><span className="text-on-surface-variant font-medium">Q:</span> {card.question}</div>
                              <div className="text-sm text-on-surface-variant"><span className="text-[#00bfa5] font-semibold">A:</span> {card.answer}</div>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setGeneratedCards([])}
                            className="flex-1 py-3 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 rounded-xl font-bold transition-all cursor-pointer"
                          >
                            Edit Prompt
                          </button>
                          
                          <button
                            onClick={handleSaveDeck}
                            className="flex-1 py-3 bg-[#00bfa5] text-white rounded-xl font-bold shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-lg">save</span>
                            <span>Save Deck & Study</span>
                          </button>
                        </div>
                      </div>
                    )}

                  </GlassCard>
                )}

                {/* -------------------- DECKS LIST -------------------- */}
                {isLoadingDecks ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((s) => (
                      <div key={s} className="bg-surface-container/40 border border-outline-variant/20 rounded-2xl p-6 flex flex-col gap-4 animate-pulse">
                        <div className="h-6 w-3/4 bg-on-background/10 rounded"></div>
                        <div className="h-4 w-1/2 bg-on-background/10 rounded"></div>
                        <div className="h-2 w-full bg-on-background/10 rounded mt-4"></div>
                        <div className="h-10 w-full bg-on-background/15 rounded mt-4"></div>
                      </div>
                    ))}
                  </div>
                ) : filteredDecks.length === 0 ? (
                  <div className="bg-surface-container/20 border border-outline-variant/20 rounded-2xl p-16 text-center flex flex-col items-center justify-center gap-4 max-w-xl mx-auto">
                    <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center text-on-surface-variant/40">
                      <span className="material-symbols-outlined text-4xl">style</span>
                    </div>
                    <div>
                      <h3 className="font-headline-md text-base font-bold text-on-surface mb-2">No Decks Found</h3>
                      <p className="text-sm text-on-surface-variant leading-relaxed">
                        {searchQuery || subjectFilter !== 'all'
                          ? 'No decks match your active filters or search queries.'
                          : 'Create your first study deck from your syllabus using AI to start reviewing concepts.'}
                      </p>
                    </div>
                    {(searchQuery || subjectFilter !== 'all') ? (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSubjectFilter('all');
                        }}
                        className="px-5 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 rounded-xl font-bold text-sm transition-all"
                      >
                        Clear Filters
                      </button>
                    ) : (
                      <button
                        onClick={handleStartGenerate}
                        className="px-6 py-3 bg-[#1a237e] dark:bg-[#5c6bec] text-white rounded-xl font-bold text-sm shadow-md hover:opacity-95 transition-all cursor-pointer"
                      >
                        Create First Deck
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {filteredDecks.map((deck) => {
                      const { completedCount, totalCount, percentage } = getDeckProgress(deck);
                      return (
                        <div
                          key={deck.id}
                          onClick={() => {
                            setActiveDeck(deck);
                            setCurrentCardIndex(0);
                            setIsFlipped(false);
                          }}
                          className="bg-surface-container dark:bg-surface-secondary/80 border border-outline-variant/20 hover:border-primary/50 hover:bg-surface-container-high dark:hover:bg-surface-secondary rounded-2xl p-6 flex flex-col justify-between gap-6 cursor-pointer shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 duration-300 relative group"
                        >
                          
                          {/* Deck Header */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-headline-md text-base font-bold text-on-surface line-clamp-1 leading-snug">
                                {deck.title}
                              </h3>
                              <button
                                onClick={(e) => handleDeleteDeck(deck.id, e)}
                                className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error p-1 rounded transition-opacity"
                                aria-label="Delete Deck"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            </div>
                            <span className="text-xs font-semibold text-primary dark:text-primary-fixed-dim bg-primary-container/10 px-2 py-0.5 rounded-full border border-primary-container/15 self-start">
                              {deck.subjectName}
                            </span>
                          </div>

                          {/* Deck Metrics */}
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
                              <span>Progress</span>
                              <span>{completedCount} / {totalCount} mastered</span>
                            </div>
                            <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#00bfa5] transition-all duration-300 rounded-full"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Last Studied footer */}
                          <div className="flex items-center justify-between border-t border-outline-variant/20 pt-4 text-[10px] text-on-surface-variant">
                            <span>{totalCount} Active Cards</span>
                            <span>
                              Studied {new Date(deck.lastStudiedAt || deck.updatedAt).toLocaleDateString()}
                            </span>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

          </div>
        )}

      </div>
    </AppShell>
  );
};

export default FlashcardsPage;
