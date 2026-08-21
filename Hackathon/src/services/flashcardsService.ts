import { getCurrentUserId } from '../mock/userProfile';

export interface Flashcard {
  question: string;
  answer: string;
  explanation?: string;
  status?: 'again' | 'hard' | 'good' | 'easy';
  completed?: boolean;
}

export interface FlashcardDeck {
  id: string;
  userId?: string;
  title: string;
  subjectCode: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  cards: Flashcard[];
  lastStudiedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export const flashcardsService = {
  async getDecks(userId?: string): Promise<FlashcardDeck[]> {
    const uid = userId || getCurrentUserId();
    try {
      const res = await fetch(`/api/flashcards?userId=${encodeURIComponent(uid)}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.decks)) {
          return data.decks;
        }
      }
    } catch (e) {
      console.error('[FlashcardsService] Failed to load decks from server:', e);
    }

    // LocalStorage fallback for offline mode
    try {
      const local = localStorage.getItem(`studyflow_flashcards_${uid}`);
      if (local) return JSON.parse(local);
    } catch (e) {
      console.error('[FlashcardsService] Local storage retrieval failed:', e);
    }
    return [];
  },

  async saveDeck(deck: FlashcardDeck, userId?: string): Promise<void> {
    const uid = userId || getCurrentUserId();
    const updatedDeck = { ...deck, userId: uid, updatedAt: Date.now() };

    // Try server first
    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedDeck),
      });
      if (res.ok) {
        await res.json();
      }
    } catch (e) {
      console.warn('[FlashcardsService] Failed to save deck on server, using local fallback:', e);
    }

    // Save locally
    try {
      const decks = await this.getDecks(uid);
      const filtered = decks.filter((d) => d.id !== deck.id);
      filtered.unshift(updatedDeck);
      localStorage.setItem(`studyflow_flashcards_${uid}`, JSON.stringify(filtered));
    } catch (e) {
      console.error('[FlashcardsService] Local storage save failed:', e);
    }
  },

  async deleteDeck(deckId: string, userId?: string): Promise<void> {
    const uid = userId || getCurrentUserId();

    // Try server first
    try {
      await fetch(`/api/flashcards/${encodeURIComponent(deckId)}?userId=${encodeURIComponent(uid)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    } catch (e) {
      console.warn('[FlashcardsService] Server delete failed:', e);
    }

    // Delete locally
    try {
      const decks = await this.getDecks(uid);
      const filtered = decks.filter((d) => d.id !== deckId);
      localStorage.setItem(`studyflow_flashcards_${uid}`, JSON.stringify(filtered));
    } catch (e) {
      console.error('[FlashcardsService] Local storage delete failed:', e);
    }
  },

  async generateDeck(subjectName: string, topicName: string, subtopics?: string): Promise<Flashcard[]> {
    const res = await fetch('/api/flashcards/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ subjectName, topicName, subtopics }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to generate flashcards via AI.');
    }

    const data = await res.json();
    if (data.success && Array.isArray(data.cards)) {
      return data.cards.map((c: any) => ({
        question: c.question,
        answer: c.answer,
        explanation: c.explanation || '',
        status: undefined,
        completed: false,
      }));
    }

    throw new Error('AI returned an invalid flashcards array.');
  },
};
