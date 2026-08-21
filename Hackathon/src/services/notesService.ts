import { getCurrentUserId } from '../mock/userProfile';

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  subjectCode?: string | null;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY_PREFIX = 'studyflow_notes_';

function getStorageKey(userId?: string): string {
  const uid = userId || getCurrentUserId();
  return `${STORAGE_KEY_PREFIX}${uid}`;
}

const listeners = new Set<() => void>();

export function notifyNotesListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('[notesService] Listener error:', e);
    }
  });
}

export function subscribeNotes(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const notesService = {
  /**
   * Reads cached notes from localStorage synchronously for instant UI rendering.
   */
  getCachedNotes(userId?: string): Note[] {
    const key = getStorageKey(userId);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch (e) {
      console.error('[notesService] Error reading cached notes:', e);
      return [];
    }
  },

  /**
   * Fetches all notes from MongoDB API and syncs to local cache.
   */
  async fetchNotes(userId?: string): Promise<Note[]> {
    const uid = userId || getCurrentUserId();
    const key = getStorageKey(uid);

    try {
      const res = await fetch(`/api/notes?userId=${encodeURIComponent(uid)}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.notes)) {
          localStorage.setItem(key, JSON.stringify(data.notes));
          notifyNotesListeners();
          return data.notes;
        }
      }
    } catch (err) {
      console.warn('[notesService] Backend fetch failed, using local cache:', err);
    }

    return this.getCachedNotes(uid);
  },

  /**
   * Creates a new note, writes to MongoDB and updates local cache.
   */
  async createNote(
    data: {
      id?: string;
      title?: string;
      content?: string;
      tags?: string[];
      subjectCode?: string | null;
    },
    userId?: string
  ): Promise<Note> {
    const uid = userId || getCurrentUserId();
    const key = getStorageKey(uid);
    const now = new Date().toISOString();
    const noteId = data.id || `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newNote: Note = {
      id: noteId,
      userId: uid,
      title: data.title?.trim() || 'Untitled Note',
      content: data.content || '',
      tags: data.tags || [],
      subjectCode: data.subjectCode || null,
      createdAt: now,
      updatedAt: now,
    };

    // Update local cache immediately
    const cached = this.getCachedNotes(uid);
    const updated = [newNote, ...cached.filter((n) => n.id !== noteId)];
    localStorage.setItem(key, JSON.stringify(updated));
    notifyNotesListeners();

    // Persist to MongoDB backend
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...newNote,
          userId: uid,
        }),
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.success && resData.note) {
          const finalUpdated = [resData.note, ...cached.filter((n) => n.id !== noteId)];
          localStorage.setItem(key, JSON.stringify(finalUpdated));
          notifyNotesListeners();
          return resData.note;
        }
      }
    } catch (err) {
      console.warn('[notesService] Failed to save note to MongoDB, cached locally:', err);
    }

    return newNote;
  },

  /**
   * Updates an existing note in MongoDB and local cache.
   */
  async updateNote(
    id: string,
    data: {
      title?: string;
      content?: string;
      tags?: string[];
      subjectCode?: string | null;
    },
    userId?: string
  ): Promise<Note | null> {
    const uid = userId || getCurrentUserId();
    const key = getStorageKey(uid);
    const cached = this.getCachedNotes(uid);
    const existingIndex = cached.findIndex((n) => n.id === id);

    if (existingIndex === -1) {
      // Note not found, create it instead
      return this.createNote({ id, ...data }, uid);
    }

    const now = new Date().toISOString();
    const updatedNote: Note = {
      ...cached[existingIndex],
      ...(data.title !== undefined ? { title: data.title.trim() || 'Untitled Note' } : {}),
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.tags !== undefined ? { tags: data.tags } : {}),
      ...(data.subjectCode !== undefined ? { subjectCode: data.subjectCode } : {}),
      updatedAt: now,
    };

    const updatedList = [
      updatedNote,
      ...cached.filter((n) => n.id !== id),
    ];
    localStorage.setItem(key, JSON.stringify(updatedList));
    notifyNotesListeners();

    // Persist to MongoDB
    try {
      const res = await fetch(`/api/notes/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          userId: uid,
        }),
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.success && resData.note) {
          const finalNotes = [resData.note, ...cached.filter((n) => n.id !== id)];
          localStorage.setItem(key, JSON.stringify(finalNotes));
          notifyNotesListeners();
          return resData.note;
        }
      }
    } catch (err) {
      console.warn('[notesService] Failed to update note in MongoDB:', err);
    }

    return updatedNote;
  },

  /**
   * Deletes a note by ID.
   */
  async deleteNote(id: string, userId?: string): Promise<boolean> {
    const uid = userId || getCurrentUserId();
    const key = getStorageKey(uid);
    const cached = this.getCachedNotes(uid);

    const updated = cached.filter((n) => n.id !== id);
    localStorage.setItem(key, JSON.stringify(updated));
    notifyNotesListeners();

    try {
      const res = await fetch(`/api/notes/${encodeURIComponent(id)}?userId=${encodeURIComponent(uid)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        const resData = await res.json();
        return !!resData.success;
      }
    } catch (err) {
      console.warn('[notesService] Failed to delete note from MongoDB:', err);
    }

    return true;
  },

  // =========================================================================
  // AI Note Generation & Transformation Actions (Isolated from Chat Messages)
  // =========================================================================

  /**
   * Generates a comprehensive study note based on a topic / prompt.
   */
  async generateStudyNote(params: {
    topic: string;
    subject?: string;
    focusAreas?: string;
  }): Promise<{ title: string; content: string; tags: string[] }> {
    const systemPrompt = `You are the StudyFlow AI Notes Generator, an expert academic note creator specialized in the MAKAUT B.Tech Computer Science & Engineering curriculum.
Create a structured, high-yield study note in Markdown format.

CRITICAL RULE FOR PROGRAMMING CODE:
- Generate academic study notes, not programming implementations.
- Do NOT include executable code, Python scripts, plotting scripts, simulation programs, or programming examples unless the user explicitly requests code or a programming implementation.
- For mathematical, physics, and scientific topics, present equations, derivations, formulas, explanations, and diagrams directly instead of generating code to calculate or visualize them.
- Programming code blocks (e.g. C, Python, Java) are allowed ONLY when the user's request explicitly asks for programming/code (e.g. "Write a C program to...", "Give me a Python script to..."). Otherwise, focus strictly on theoretical explanations, equations, and conceptual diagrams.

Required Format:
# [Topic Title]

## 📌 Core Concept & Overview
(A concise, crystal-clear 2-3 sentence definition and summary)

## 🔑 Key Principles & Formulas
(Bullet points with bold terms, LaTeX math formulas e.g. $E=mc^2$ where applicable)

## 💻 Diagram or Code Example
(If the topic is explicitly about programming or code is requested, provide a clean, commented code block here. Otherwise, for theoretical/academic topics, provide a conceptual diagram (e.g. ASCII layout or Mermaid block diagram) or theoretical explanation. NEVER generate code examples or simulation scripts here unless explicitly requested.)

## ⚠️ Common Pitfalls & Exam Tips
(MAKAUT exam focus points, common student mistakes to avoid)

## 🧠 Quick Memory Hook / Summary
(One takeaway sentence to memorize)`;

    const userPrompt = `Generate a high-yield academic study note for:
Topic: "${params.topic}"
${params.subject ? `Subject: "${params.subject}"` : ''}
${params.focusAreas ? `Specific Focus: "${params.focusAreas}"` : ''}

Provide clear headings, bullet points, clean formatting, and practical insights.`;

    const rawText = await this.callAIProxy(systemPrompt, userPrompt);

    // Extract title if present
    const firstLine = rawText.split('\n')[0].replace(/^#+\s*/, '').trim();
    const title = firstLine || params.topic;
    const tags = [params.subject || 'Study Note', 'AI Generated'].filter(Boolean);

    return {
      title,
      content: rawText,
      tags,
    };
  },

  /**
   * Improves and structures existing note content.
   */
  async improveNoteContent(currentContent: string, currentTitle: string): Promise<string> {
    const systemPrompt = `You are the StudyFlow AI Notes Editor. Improve the clarity, formatting, organization, and academic rigor of the student's study note.
Preserve all original factual details, but:
1. Organize with clean Markdown headings (##, ###).
2. Fix any grammar, typos, or unclear phrasing.
3. Add bullet points, bold key terms, and format code/equations cleanly.
4. Add a brief "Key Takeaways" section at the end if missing.`;

    const userPrompt = `Note Title: "${currentTitle}"

Current Content:
${currentContent}`;

    return await this.callAIProxy(systemPrompt, userPrompt);
  },

  /**
   * Generates a concise revision summary of the note.
   */
  async summarizeNoteContent(currentContent: string, currentTitle: string): Promise<string> {
    const systemPrompt = `You are StudyFlow AI. Create a high-density, concise revision cheat sheet from the provided study note. Focus strictly on exam-ready bullet points, formulas, definitions, and quick review points.`;

    const userPrompt = `Note Title: "${currentTitle}"

Content to summarize:
${currentContent}`;

    return await this.callAIProxy(systemPrompt, userPrompt);
  },

  /**
   * Explains difficult concepts in simple terms with analogies.
   */
  async explainNoteConcepts(currentContent: string, currentTitle: string): Promise<string> {
    const systemPrompt = `You are StudyFlow AI Tutor. The student wants an intuitive, simple explanation of the concepts in this study note.
Use the Feynman technique:
1. Explain in simple, plain English without unnecessary jargon.
2. Provide a vivid real-world analogy.
3. Break down step-by-step how it works.
4. Give a simple concrete example.`;

    const userPrompt = `Note Title: "${currentTitle}"

Concepts to explain:
${currentContent}`;

    return await this.callAIProxy(systemPrompt, userPrompt);
  },

  /**
   * Generates active recall flashcards / practice Q&A from note.
   */
  async generateFlashcards(currentContent: string, currentTitle: string): Promise<string> {
    const systemPrompt = `You are StudyFlow AI. Create a set of 5-7 active recall flashcards (Question & Answer pairs) based on the provided study note.
Format as:
### 🎴 Flashcard 1
**Question:** ...
**Answer:** ...
(Include a short explanation or tip)`;

    const userPrompt = `Note Title: "${currentTitle}"

Content:
${currentContent}`;

    return await this.callAIProxy(systemPrompt, userPrompt);
  },

  /**
   * Helper to invoke the secure AI proxy endpoint.
   */
  async callAIProxy(systemInstruction: string, userPrompt: string): Promise<string> {
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction,
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.text) {
          return data.text;
        }
      }
      throw new Error('AI response was empty or unsuccessful');
    } catch (err: any) {
      console.error('[notesService] AI generation error:', err);
      throw new Error(err.message || 'Failed to generate content with AI. Please check your network or try again.');
    }
  },
};
