import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { GlassCard } from '../components/ui/GlassCard';
import { MarkdownRenderer } from '../components/chat/MarkdownRenderer';
import { notesService, subscribeNotes, type Note } from '../services/notesService';
import { curriculumService, subscribeCurriculum } from '../services/curriculumService';
import { useUserProfile } from '../mock/userProfile';
import { exportNoteToDocx } from '../utils/docxExport';

export const NotesPage: React.FC = () => {
  const { profile } = useUserProfile();
  const userId = profile?.studentId || 'SF-2024-0892';

  // Curriculum subscription for dynamic subject updates
  const [curriculumVersion, setCurriculumVersion] = useState(0);
  useEffect(() => {
    return subscribeCurriculum(() => {
      setCurriculumVersion((v) => v + 1);
    });
  }, []);

  const availableSubjects = useMemo(() => {
    return curriculumService.getSubjectsSync(userId);
  }, [userId, curriculumVersion]);

  const samplePrompts = useMemo(() => {
    const topics = curriculumService.getTopicsSync(userId);
    if (topics.length > 0) {
      return topics.slice(0, 4).map((t) => ({
        topic: t.topic,
        subj: t.subjectCode,
      }));
    }
    return [];
  }, [userId, curriculumVersion]);

  // Notes state
  const [notes, setNotes] = useState<Note[]>(() => notesService.getCachedNotes(userId));
  const [activeNoteId, setActiveNoteId] = useState<string | null>(() => {
    const cached = notesService.getCachedNotes(userId);
    return cached.length > 0 ? cached[0].id : null;
  });

  // Active note editor state
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');

  // UI state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showMobileList, setShowMobileList] = useState<boolean>(false);
  const [isExportingDocx, setIsExportingDocx] = useState<boolean>(false);

  // AI Modal state
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [aiPromptTopic, setAiPromptTopic] = useState<string>('');
  const [aiPromptSubject, setAiPromptSubject] = useState<string>('');
  const [aiFocusAreas, setAiFocusAreas] = useState<string>('');
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [aiActionLoading, setAiActionLoading] = useState<string | null>(null);

  // Auto-save debounce timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Subscribe to notes updates
  useEffect(() => {
    const unsubscribe = subscribeNotes(() => {
      const updated = notesService.getCachedNotes(userId);
      setNotes(updated);
    });

    // Initial background fetch from MongoDB API
    notesService.fetchNotes(userId).then((fetched) => {
      setNotes(fetched);
      if (fetched.length > 0 && !activeNoteId) {
        setActiveNoteId(fetched[0].id);
      }
    });

    return () => {
      unsubscribe();
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [userId]);

  // Sync active note state when activeNoteId changes or notes list changes
  useEffect(() => {
    if (!activeNoteId) {
      if (notes.length > 0) {
        setActiveNoteId(notes[0].id);
      } else {
        setTitle('');
        setContent('');
        setSelectedSubject('');
        setTags([]);
      }
      return;
    }

    const current = notes.find((n) => n.id === activeNoteId);
    if (current) {
      setTitle(current.title || '');
      setContent(current.content || '');
      setSelectedSubject(current.subjectCode || '');
      setTags(current.tags || []);
      setSaveStatus('saved');
    }
  }, [activeNoteId, notes]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Trigger auto-save debounce
  const triggerAutoSave = (newTitle: string, newContent: string, newSubject: string, newTags: string[]) => {
    setSaveStatus('unsaved');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      if (!activeNoteId) return;
      setSaveStatus('saving');
      await notesService.updateNote(
        activeNoteId,
        {
          title: newTitle,
          content: newContent,
          subjectCode: newSubject || null,
          tags: newTags,
        },
        userId
      );
      setSaveStatus('saved');
    }, 1200);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    triggerAutoSave(val, content, selectedSubject, tags);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    triggerAutoSave(title, val, selectedSubject, tags);
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedSubject(val);
    triggerAutoSave(title, content, val, tags);
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^#/, '');
      if (clean && !tags.includes(clean)) {
        const next = [...tags, clean];
        setTags(next);
        setTagInput('');
        triggerAutoSave(title, content, selectedSubject, next);
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const next = tags.filter((t) => t !== tagToRemove);
    setTags(next);
    triggerAutoSave(title, content, selectedSubject, next);
  };

  // Explicit Save Action
  const handleSaveNote = async () => {
    if (!activeNoteId) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setSaveStatus('saving');
    await notesService.updateNote(
      activeNoteId,
      {
        title,
        content,
        subjectCode: selectedSubject || null,
        tags,
      },
      userId
    );
    setSaveStatus('saved');
    showToast('Note saved successfully!');
  };

  // Create New Note
  const handleCreateNewNote = async (initialTitle = 'Untitled Note', initialContent = '', initialSubject = '', initialTags: string[] = []) => {
    const newNote = await notesService.createNote(
      {
        title: initialTitle,
        content: initialContent,
        subjectCode: initialSubject || null,
        tags: initialTags,
      },
      userId
    );
    setActiveNoteId(newNote.id);
    setTitle(newNote.title);
    setContent(newNote.content);
    setSelectedSubject(newNote.subjectCode || '');
    setTags(newNote.tags || []);
    setShowMobileList(false);
    showToast('New note created');
  };

  // Delete Active Note
  const handleDeleteNote = async (idToDelete: string) => {
    const noteToDelete = notes.find((n) => n.id === idToDelete);
    const noteTitle = noteToDelete?.title || 'this note';

    if (!window.confirm(`Are you sure you want to delete "${noteTitle}"?`)) {
      return;
    }

    await notesService.deleteNote(idToDelete, userId);
    showToast('Note deleted');

    const remaining = notes.filter((n) => n.id !== idToDelete);
    if (remaining.length > 0) {
      setActiveNoteId(remaining[0].id);
    } else {
      setActiveNoteId(null);
    }
  };

  // AI Modal Generation
  const handleGenerateAiNote = async () => {
    if (!aiPromptTopic.trim()) {
      showToast('Please enter a topic or concept to generate notes.');
      return;
    }

    setIsAiGenerating(true);
    try {
      const generated = await notesService.generateStudyNote({
        topic: aiPromptTopic.trim(),
        subject: aiPromptSubject ? availableSubjects.find((s) => s.code === aiPromptSubject)?.name : undefined,
        focusAreas: aiFocusAreas.trim(),
      });

      await handleCreateNewNote(
        generated.title,
        generated.content,
        aiPromptSubject,
        generated.tags
      );

      setIsAiModalOpen(false);
      setAiPromptTopic('');
      setAiPromptSubject('');
      setAiFocusAreas('');
      showToast('✨ AI study note generated!');
    } catch (err: any) {
      showToast(err.message || 'Failed to generate note. Please try again.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // AI In-Editor Transformations
  const handleAiAction = async (actionType: 'improve' | 'summarize' | 'explain' | 'flashcards') => {
    if (!content.trim()) {
      showToast('Please add some note content first to use AI assistant actions.');
      return;
    }

    setAiActionLoading(actionType);
    try {
      let resultText = '';
      if (actionType === 'improve') {
        resultText = await notesService.improveNoteContent(content, title);
        setContent(resultText);
        triggerAutoSave(title, resultText, selectedSubject, tags);
        showToast('✨ Note improved and structured with AI!');
      } else if (actionType === 'summarize') {
        resultText = await notesService.summarizeNoteContent(content, title);
        const updated = `${content}\n\n---\n\n## 📝 Quick Revision Cheat Sheet\n${resultText}`;
        setContent(updated);
        triggerAutoSave(title, updated, selectedSubject, tags);
        showToast('📝 Summary added to note!');
      } else if (actionType === 'explain') {
        resultText = await notesService.explainNoteConcepts(content, title);
        const updated = `${content}\n\n---\n\n## 💡 Intuitive Concept Breakdown\n${resultText}`;
        setContent(updated);
        triggerAutoSave(title, updated, selectedSubject, tags);
        showToast('💡 Concept breakdown added to note!');
      } else if (actionType === 'flashcards') {
        resultText = await notesService.generateFlashcards(content, title);
        const updated = `${content}\n\n---\n\n## 🎴 Active Recall Flashcards\n${resultText}`;
        setContent(updated);
        triggerAutoSave(title, updated, selectedSubject, tags);
        showToast('🎴 Active recall flashcards added!');
      }
    } catch (err: any) {
      showToast(err.message || 'AI action failed. Please try again.');
    } finally {
      setAiActionLoading(null);
    }
  };

  // Editor Toolbar Insertion Helpers
  const insertFormatting = (prefix: string, suffix = '', defaultText = '') => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;
    const nextContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(nextContent);
    triggerAutoSave(title, nextContent, selectedSubject, tags);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 50);
  };

  // Copy & Export Note
  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(`# ${title}\n\n${content}`);
    showToast('Copied full Markdown note to clipboard!');
  };

  const handleExportDocx = async () => {
    if (!content || !content.trim()) {
      showToast('No note content to export.');
      return;
    }

    setIsExportingDocx(true);
    try {
      await exportNoteToDocx({
        title,
        content,
        subjectCode: selectedSubject || null,
        subjectName: activeSubjectName || null,
        tags,
        updatedAt: notes.find((n) => n.id === activeNoteId)?.updatedAt,
      });
      showToast('Word document downloaded successfully!');
    } catch (err: any) {
      console.error('Word export failed:', err);
      showToast('Unable to export this note. Please try again.');
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Filtered notes list
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSubject =
        subjectFilter === 'all' || note.subjectCode === subjectFilter;

      return matchesSearch && matchesSubject;
    });
  }, [notes, searchQuery, subjectFilter]);

  // Word & Character count calculation
  const wordCount = useMemo(() => {
    const words = content.trim().split(/\s+/).filter(Boolean);
    return words.length;
  }, [content]);

  const activeSubjectName = useMemo(() => {
    if (!selectedSubject) return null;
    return availableSubjects.find((s) => s.code === selectedSubject)?.name || selectedSubject;
  }, [selectedSubject]);

  return (
    <AppShell>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-surface-container-high border border-primary/40 text-on-surface px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-xl flex items-center gap-2 text-xs md:text-sm font-medium animate-fadeIn">
          <span className="material-symbols-outlined text-primary text-base">info</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="pt-24 md:pt-12 pb-28 px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto relative z-10 min-h-[calc(100vh-5rem)] flex flex-col">
        {/* Page Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background">
                AI Notes
              </h1>
              <span className="font-label-sm text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Workspace
              </span>
            </div>
            <p className="font-body-md text-sm md:text-base text-on-surface-variant">
              Create, organize, and understand your study notes with AI.
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container text-on-secondary-container hover:opacity-90 font-label-sm text-xs md:text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-[0_0_15px_rgba(0,86,208,0.25)] border border-white/10"
            >
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              <span>AI Generate Note</span>
            </button>

            <button
              onClick={() => handleCreateNewNote()}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 font-label-sm text-xs md:text-sm font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>New Note</span>
            </button>

            <button
              onClick={() => setShowMobileList(!showMobileList)}
              className="md:hidden px-3 py-2 rounded-xl bg-surface-container border border-white/10 text-on-surface-variant hover:text-on-surface flex items-center gap-1 text-xs font-semibold"
            >
              <span className="material-symbols-outlined text-base">list</span>
              <span>{showMobileList ? 'Hide Notes' : 'Notes List'}</span>
            </button>
          </div>
        </div>

        {/* Notes Workspace Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 items-start">
          {/* Left Sidebar: Notes List */}
          <div
            className={`md:col-span-4 lg:col-span-4 flex flex-col gap-4 ${
              showMobileList ? 'block' : 'hidden md:flex'
            }`}
          >
            <GlassCard className="p-4 flex flex-col gap-3">
              {/* Search Bar */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes, tags, concepts..."
                  className="w-full bg-surface-container-high/60 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-xs md:text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/40 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>

              {/* Subject Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                <button
                  onClick={() => setSubjectFilter('all')}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors border ${
                    subjectFilter === 'all'
                      ? 'bg-primary/20 text-primary border-primary/40'
                      : 'bg-surface-container text-on-surface-variant border-white/5 hover:bg-white/5'
                  }`}
                >
                  All ({notes.length})
                </button>
                {availableSubjects.map((subj) => {
                  const count = notes.filter((n) => n.subjectCode === subj.code).length;
                  return (
                    <button
                      key={subj.code}
                      onClick={() => setSubjectFilter(subj.code)}
                      className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors border ${
                        subjectFilter === subj.code
                          ? 'bg-primary/20 text-primary border-primary/40'
                          : 'bg-surface-container text-on-surface-variant border-white/5 hover:bg-white/5'
                      }`}
                    >
                      {subj.code} {count > 0 ? `(${count})` : ''}
                    </button>
                  );
                })}
              </div>
            </GlassCard>

            {/* Notes List Scrollable View */}
            <div className="flex flex-col gap-2.5 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
              {filteredNotes.length === 0 ? (
                <GlassCard className="p-8 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-surface-variant/40 flex items-center justify-center mb-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-2xl">description</span>
                  </div>
                  <h3 className="font-headline-md text-sm font-semibold text-on-surface mb-1">
                    No notes found
                  </h3>
                  <p className="font-body-md text-xs text-on-surface-variant mb-4">
                    {searchQuery || subjectFilter !== 'all'
                      ? 'Try adjusting your search query or subject filter.'
                      : 'Start creating organized study notes with AI assistance.'}
                  </p>
                  <button
                    onClick={() => handleCreateNewNote()}
                    className="px-3.5 py-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30 text-xs font-semibold hover:bg-primary/30 transition-colors"
                  >
                    + Create First Note
                  </button>
                </GlassCard>
              ) : (
                filteredNotes.map((note) => {
                  const isActive = note.id === activeNoteId;
                  const dateStr = new Date(note.updatedAt || note.createdAt).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={note.id}
                      onClick={() => {
                        setActiveNoteId(note.id);
                        setShowMobileList(false);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 relative group ${
                        isActive
                          ? 'bg-primary-container/25 border-primary/50 shadow-[0_0_15px_rgba(185,199,228,0.15)]'
                          : 'bg-surface-container/40 border-white/5 hover:border-white/20 hover:bg-surface-container/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-xs md:text-sm text-on-surface line-clamp-1 flex-1">
                          {note.title || 'Untitled Note'}
                        </h4>
                        <span className="text-[10px] text-on-surface-variant/70 shrink-0">
                          {dateStr}
                        </span>
                      </div>

                      <p className="text-[11px] text-on-surface-variant/80 line-clamp-2 leading-relaxed">
                        {note.content ? note.content.replace(/[#*`_\[\]]/g, '').trim() : 'No content yet...'}
                      </p>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {note.subjectCode && (
                            <span className="font-label-sm text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-surface-variant/70 text-secondary border border-white/5">
                              {note.subjectCode}
                            </span>
                          )}
                          {note.tags?.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-on-surface-variant"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-error text-on-surface-variant/70 transition-opacity p-1 rounded hover:bg-error/10"
                          title="Delete note"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Area: Active Note Editor & Workspace */}
          <div className="md:col-span-8 lg:col-span-8 flex flex-col gap-4">
            {activeNoteId ? (
              <GlassCard className="p-4 md:p-6 flex flex-col gap-4 border border-white/15 min-h-[580px]">
                {/* Note Meta Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <select
                      value={selectedSubject}
                      onChange={handleSubjectChange}
                      className="bg-surface-container-high border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary transition-colors cursor-pointer"
                    >
                      <option value="">Select Subject (Optional)</option>
                      {availableSubjects.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.code} - {s.name}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          saveStatus === 'saved'
                            ? 'bg-tertiary shadow-[0_0_8px_rgba(139,214,180,0.6)]'
                            : saveStatus === 'saving'
                            ? 'bg-secondary animate-pulse'
                            : 'bg-primary'
                        }`}
                      ></span>
                      <span className="text-[11px]">
                        {saveStatus === 'saved'
                          ? 'Saved to Cloud'
                          : saveStatus === 'saving'
                          ? 'Saving...'
                          : 'Unsaved changes'}
                      </span>
                    </div>
                  </div>

                  {/* View Mode Switcher */}
                  <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg border border-white/5 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => setViewMode('edit')}
                      className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                        viewMode === 'edit'
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setViewMode('preview')}
                      className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                        viewMode === 'preview'
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      <span>Preview</span>
                    </button>
                  </div>
                </div>

                {/* Note Title Input */}
                <div>
                  <input
                    type="text"
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="Enter Note Title (e.g. Memory Layout in C)..."
                    className="w-full bg-transparent border-none text-lg md:text-xl font-bold text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
                  />
                </div>

                {/* AI Assistant Quick Action Toolbar */}
                <div className="bg-surface-container/60 rounded-xl p-2.5 border border-white/10 flex items-center gap-2 overflow-x-auto scrollbar-none">
                  <span className="font-label-sm text-[11px] font-semibold text-secondary flex items-center gap-1 pl-1 shrink-0">
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    <span>AI Assistant:</span>
                  </span>

                  <button
                    disabled={!!aiActionLoading}
                    onClick={() => handleAiAction('improve')}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-high/80 hover:bg-primary-container/40 hover:text-primary text-on-surface-variant text-xs font-medium flex items-center gap-1.5 transition-all border border-white/5 whitespace-nowrap disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                    <span>{aiActionLoading === 'improve' ? 'Improving...' : 'Improve & Structure'}</span>
                  </button>

                  <button
                    disabled={!!aiActionLoading}
                    onClick={() => handleAiAction('summarize')}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-high/80 hover:bg-secondary-container/40 hover:text-secondary text-on-surface-variant text-xs font-medium flex items-center gap-1.5 transition-all border border-white/5 whitespace-nowrap disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">summarize</span>
                    <span>{aiActionLoading === 'summarize' ? 'Summarizing...' : 'Quick Cheat Sheet'}</span>
                  </button>

                  <button
                    disabled={!!aiActionLoading}
                    onClick={() => handleAiAction('explain')}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-high/80 hover:bg-tertiary-container/40 hover:text-tertiary text-on-surface-variant text-xs font-medium flex items-center gap-1.5 transition-all border border-white/5 whitespace-nowrap disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">psychology</span>
                    <span>{aiActionLoading === 'explain' ? 'Explaining...' : 'Explain Concepts'}</span>
                  </button>

                  <button
                    disabled={!!aiActionLoading}
                    onClick={() => handleAiAction('flashcards')}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-high/80 hover:bg-white/10 hover:text-on-surface text-on-surface-variant text-xs font-medium flex items-center gap-1.5 transition-all border border-white/5 whitespace-nowrap disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">style</span>
                    <span>{aiActionLoading === 'flashcards' ? 'Generating...' : 'Flashcards Q&A'}</span>
                  </button>
                </div>

                {/* Markdown Formatting Shortcuts (when in Edit mode) */}
                {viewMode === 'edit' && (
                  <div className="flex items-center gap-1 flex-wrap text-on-surface-variant pb-2 border-b border-white/5 text-xs">
                    <button
                      onClick={() => insertFormatting('**', '**', 'bold text')}
                      className="p-1.5 rounded hover:bg-white/10 hover:text-on-surface transition-colors"
                      title="Bold"
                    >
                      <span className="material-symbols-outlined text-sm">format_bold</span>
                    </button>
                    <button
                      onClick={() => insertFormatting('*', '*', 'italic text')}
                      className="p-1.5 rounded hover:bg-white/10 hover:text-on-surface transition-colors"
                      title="Italic"
                    >
                      <span className="material-symbols-outlined text-sm">format_italic</span>
                    </button>
                    <button
                      onClick={() => insertFormatting('## ', '', 'Heading 2')}
                      className="p-1.5 rounded hover:bg-white/10 hover:text-on-surface transition-colors"
                      title="Heading"
                    >
                      <span className="material-symbols-outlined text-sm">title</span>
                    </button>
                    <button
                      onClick={() => insertFormatting('- ', '', 'Bullet item')}
                      className="p-1.5 rounded hover:bg-white/10 hover:text-on-surface transition-colors"
                      title="Bullet List"
                    >
                      <span className="material-symbols-outlined text-sm">format_list_bulleted</span>
                    </button>
                    <button
                      onClick={() => insertFormatting('```c\n', '\n```', '// Code snippet')}
                      className="p-1.5 rounded hover:bg-white/10 hover:text-on-surface transition-colors"
                      title="Code Block"
                    >
                      <span className="material-symbols-outlined text-sm">code</span>
                    </button>
                    <button
                      onClick={() => insertFormatting('$', '$', 'E=mc^2')}
                      className="p-1.5 rounded hover:bg-white/10 hover:text-on-surface transition-colors"
                      title="Math Equation (LaTeX)"
                    >
                      <span className="material-symbols-outlined text-sm">functions</span>
                    </button>
                    <button
                      onClick={() => insertFormatting('> ', '', 'Important note or formula')}
                      className="p-1.5 rounded hover:bg-white/10 hover:text-on-surface transition-colors"
                      title="Quote / Callout"
                    >
                      <span className="material-symbols-outlined text-sm">format_quote</span>
                    </button>
                  </div>
                )}

                {/* Editor Content Area */}
                <div className="flex-1 flex min-h-[360px]">
                  {viewMode === 'edit' && (
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={handleContentChange}
                      placeholder="Write your study notes here using Markdown, LaTeX math ($x^2$), or code blocks..."
                      className="w-full h-full min-h-[360px] bg-transparent text-sm md:text-base font-sans text-on-surface placeholder:text-on-surface-variant/40 resize-y focus:outline-none leading-relaxed p-1"
                    />
                  )}

                  {viewMode === 'preview' && (
                    <div className="w-full h-full min-h-[360px] overflow-y-auto pr-2 bg-surface-container-low/30 rounded-xl p-4 border border-white/5">
                      {content.trim() ? (
                        <MarkdownRenderer content={content} />
                      ) : (
                        <p className="text-on-surface-variant/50 text-sm italic">
                          No content written yet. Switch to Edit mode to start writing or use AI Generate.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Tags Section */}
                <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-white/10">
                  <span className="text-[11px] font-semibold text-on-surface-variant shrink-0">Tags:</span>
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-surface-variant/60 text-on-surface text-xs flex items-center gap-1 border border-white/5"
                    >
                      <span>#{tag}</span>
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="text-on-surface-variant hover:text-error text-xs"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="+ add tag (Press Enter)"
                    className="bg-transparent text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none py-0.5 px-1"
                  />
                </div>

                {/* Bottom Footer Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs text-on-surface-variant">
                  <div className="flex items-center gap-4">
                    <span>{wordCount} words</span>
                    <span>{content.length} characters</span>
                    {activeSubjectName && (
                      <span className="hidden md:inline font-medium text-secondary">
                        • {activeSubjectName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleCopyMarkdown}
                      className="px-3 py-1.5 rounded-xl bg-surface-container border border-white/10 hover:bg-white/10 text-on-surface transition-colors flex items-center gap-1"
                      title="Copy Markdown to clipboard"
                    >
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                      <span>Copy</span>
                    </button>

                    <button
                      onClick={handleExportDocx}
                      disabled={isExportingDocx}
                      className="px-3 py-1.5 rounded-xl bg-surface-container border border-white/10 hover:bg-white/10 text-on-surface transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      title="Export and download note as Word document"
                    >
                      <span className="material-symbols-outlined text-sm">description</span>
                      <span>{isExportingDocx ? 'Exporting...' : 'Export DOCX'}</span>
                    </button>

                    <button
                      onClick={handleSaveNote}
                      className="px-4 py-1.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 font-semibold transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-sm">save</span>
                      <span>Save Note</span>
                    </button>

                    <button
                      onClick={() => activeNoteId && handleDeleteNote(activeNoteId)}
                      className="p-1.5 rounded-xl text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                      title="Delete this note"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              </GlassCard>
            ) : (
              <GlassCard className="p-12 text-center flex flex-col items-center justify-center min-h-[500px]">
                <div className="w-16 h-16 rounded-2xl bg-secondary-container/30 border border-secondary/20 flex items-center justify-center mb-4 text-secondary">
                  <span className="material-symbols-outlined text-3xl">edit_note</span>
                </div>
                <h2 className="font-headline-md text-lg font-bold text-on-surface mb-2">
                  No Active Note Selected
                </h2>
                <p className="font-body-md text-sm text-on-surface-variant max-w-md mb-6 leading-relaxed">
                  Choose a note from the sidebar or click below to generate an AI study note on any topic.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsAiModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container text-on-secondary-container font-semibold text-sm flex items-center gap-2 shadow-md border border-white/10"
                  >
                    <span className="material-symbols-outlined text-base">auto_awesome</span>
                    <span>AI Generate Note</span>
                  </button>
                  <button
                    onClick={() => handleCreateNewNote()}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary font-semibold text-sm flex items-center gap-1.5 shadow-md"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                    <span>Blank Note</span>
                  </button>
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </main>

      {/* AI Generate Note Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn">
          <div className="ai-panel rounded-lg p-6 max-w-lg w-full flex flex-col gap-4 relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-secondary-container/40 flex items-center justify-center text-secondary border border-secondary/30">
                  <span className="material-symbols-outlined text-lg">auto_awesome</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-base font-bold text-on-surface">
                    AI Study Note Generator
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Powered by Gemini & MAKAUT B.Tech CSE Curriculum
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Topic or Concept <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={aiPromptTopic}
                  onChange={(e) => setAiPromptTopic(e.target.value)}
                  placeholder="e.g. Dynamic Memory Allocation in C (malloc vs calloc)"
                  className="w-full bg-surface-container-high border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/40 transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Subject Context (Optional)
                </label>
                <select
                  value={aiPromptSubject}
                  onChange={(e) => setAiPromptSubject(e.target.value)}
                  className="w-full bg-surface-container-high border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/40 transition-all cursor-pointer"
                >
                  <option value="">Select subject for exam syllabus grounding...</option>
                  {availableSubjects.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name} (Sem {s.semester})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Specific Focus or Subtopics (Optional)
                </label>
                <input
                  type="text"
                  value={aiFocusAreas}
                  onChange={(e) => setAiFocusAreas(e.target.value)}
                  placeholder="e.g. Memory leaks, dangling pointers, syntax examples"
                  className="w-full bg-surface-container-high border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/40 transition-all"
                />
              </div>
            </div>

            {/* Quick Sample Prompts */}
            {samplePrompts.length > 0 && (
              <div>
                <span className="text-[11px] font-medium text-on-surface-variant block mb-1.5">
                  Popular topics from your syllabus:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {samplePrompts.map((sample) => (
                    <button
                      key={sample.topic}
                      type="button"
                      onClick={() => {
                        setAiPromptTopic(sample.topic);
                        setAiPromptSubject(sample.subj);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-surface-variant/50 hover:bg-primary-container/40 text-[11px] text-on-surface-variant hover:text-primary transition-colors border border-white/5 text-left"
                    >
                      {sample.topic}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                disabled={isAiGenerating}
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-2 rounded-xl text-on-surface-variant hover:text-on-surface text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={isAiGenerating || !aiPromptTopic.trim()}
                onClick={handleGenerateAiNote}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container text-on-secondary-container font-semibold text-xs md:text-sm flex items-center gap-2 shadow-lg disabled:opacity-50 border border-white/10 active:scale-95 transition-all"
              >
                {isAiGenerating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                    <span>Crafting AI Note...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">auto_awesome</span>
                    <span>Generate Note</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};
export default NotesPage;
