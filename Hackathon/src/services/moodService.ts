import { useState, useEffect } from 'react';
import { getCurrentUserId, subscribeUserProfile, useUserProfile } from '../mock/userProfile';
import { curriculumService } from './curriculumService';

export type StudentMood = 'great' | 'good' | 'okay' | 'low' | 'sad' | 'stressed';

export interface MoodOption {
  id: StudentMood;
  emoji: string;
  title: string;
  description: string;
  badgeColor: string;
}

export interface DailyMoodRecord {
  userId?: string;
  date: string;
  mood: StudentMood;
  selectedSubjectCode?: string;
  timestamp: number;
}

export const MOOD_OPTIONS: MoodOption[] = [
  {
    id: 'great',
    emoji: '😊',
    title: 'Great',
    description: "I'm feeling energetic and ready to learn.",
    badgeColor: 'bg-tertiary/20 text-tertiary border-tertiary/30',
  },
  {
    id: 'good',
    emoji: '🙂',
    title: 'Good',
    description: "I'm feeling good and can study normally.",
    badgeColor: 'bg-primary/20 text-primary border-primary/30',
  },
  {
    id: 'okay',
    emoji: '😐',
    title: 'Okay',
    description: "I'm feeling average today.",
    badgeColor: 'bg-secondary/20 text-secondary border-secondary/30',
  },
  {
    id: 'low',
    emoji: '😔',
    title: 'Low',
    description: "I'm feeling a little tired or unmotivated.",
    badgeColor: 'bg-outline-variant/30 text-on-surface-variant border-white/10',
  },
  {
    id: 'sad',
    emoji: '😢',
    title: 'Sad',
    description: "I'm feeling down or emotionally tired.",
    badgeColor: 'bg-primary-container/60 text-primary border-primary/30',
  },
  {
    id: 'stressed',
    emoji: '😫',
    title: 'Stressed',
    description: "I'm feeling stressed or mentally tired.",
    badgeColor: 'bg-error/20 text-error border-error/30',
  },
];

const LEGACY_STORAGE_KEY = 'studyflow_daily_mood';
const USER_MOOD_KEY_PREFIX = 'studyflow_daily_mood_';

function getStorageKey(userId?: string): string {
  const uid = userId || getCurrentUserId();
  return `${USER_MOOD_KEY_PREFIX}${uid}`;
}

export function getTodayLocalDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const moodService = {
  getTodayMood(userId?: string): DailyMoodRecord | null {
    const activeUserId = userId || getCurrentUserId();
    const key = getStorageKey(activeUserId);
    try {
      // 1. Check user-scoped key first
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed: DailyMoodRecord = JSON.parse(raw);
        return parsed;
      }

      // 2. Safely inspect old global legacy key if user-specific key does not exist yet
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        const legacyParsed: DailyMoodRecord = JSON.parse(legacyRaw);
        // Only migrate if legacy record matches active user or default user 'SF-2024-0892'
        const legacyUserId = legacyParsed.userId;
        if (!legacyUserId || legacyUserId === activeUserId) {
          if (activeUserId === 'SF-2024-0892') {
            const migrated: DailyMoodRecord = {
              ...legacyParsed,
              userId: activeUserId,
            };
            localStorage.setItem(key, JSON.stringify(migrated));
            localStorage.removeItem(LEGACY_STORAGE_KEY);
            return migrated;
          }
        }
      }
      return null;
    } catch (e) {
      console.error('Failed to read daily mood from storage:', e);
      return null;
    }
  },

  isMoodCheckInNeededToday(userId?: string): boolean {
    const activeUserId = userId || getCurrentUserId();
    const record = this.getTodayMood(activeUserId);
    const today = getTodayLocalDateString();
    return !record || record.date !== today;
  },

  async syncWithServer(userId?: string): Promise<void> {
    const activeUserId = userId || getCurrentUserId();
    if (!activeUserId) return;
    const today = getTodayLocalDateString();
    try {
      const res = await fetch(`/api/mood?userId=${encodeURIComponent(activeUserId)}&date=${today}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.moodRecord) {
          const key = getStorageKey(activeUserId);
          localStorage.setItem(key, JSON.stringify(data.moodRecord));
          notifyMoodListeners();
        }
      } else {
        console.warn(`[moodService] GET /api/mood server status: HTTP ${res.status}`);
      }
    } catch (e) {
      // Offline fallback
      console.warn('[moodService] Sync with server network fallback:', e);
    }
  },

  saveTodayMood(mood: StudentMood, selectedSubjectCode?: string, userId?: string): DailyMoodRecord {
    const activeUserId = userId || getCurrentUserId();
    const existing = this.getTodayMood(activeUserId);
    const today = getTodayLocalDateString();
    const record: DailyMoodRecord = {
      userId: activeUserId,
      date: today,
      mood,
      selectedSubjectCode: selectedSubjectCode || existing?.selectedSubjectCode || 'ES-CS201',
      timestamp: Date.now(),
    };
    try {
      const key = getStorageKey(activeUserId);
      localStorage.setItem(key, JSON.stringify(record));
    } catch (e) {
      console.error('Failed to save daily mood to storage:', e);
    }
    notifyMoodListeners();

    // Async sync to MongoDB
    fetch('/api/mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: activeUserId,
        mood,
        selectedSubjectCode: record.selectedSubjectCode,
        date: today,
      }),
    }).then(async (res) => {
      if (!res.ok) {
        console.warn(`[moodService] POST /api/mood server status: HTTP ${res.status}`);
      }
    }).catch((err) => {
      console.warn('[moodService] POST /api/mood network fallback:', err);
    });

    return record;
  },

  saveTodaySubject(subjectCode: string, userId?: string): DailyMoodRecord | null {
    const activeUserId = userId || getCurrentUserId();
    const existing = this.getTodayMood(activeUserId);
    if (!existing) return null;
    const updated: DailyMoodRecord = {
      ...existing,
      userId: activeUserId,
      selectedSubjectCode: subjectCode,
      timestamp: Date.now(),
    };
    try {
      const key = getStorageKey(activeUserId);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save subject to storage:', e);
    }
    notifyMoodListeners();

    // Async sync to MongoDB
    fetch('/api/mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: activeUserId,
        mood: updated.mood,
        selectedSubjectCode: subjectCode,
        date: updated.date,
      }),
    }).then(async (res) => {
      if (!res.ok) {
        console.warn(`[moodService] POST /api/mood server status: HTTP ${res.status}`);
      }
    }).catch((err) => {
      console.warn('[moodService] POST /api/mood network fallback:', err);
    });

    return updated;
  },
};

// Listener system for cross-component reactive updates
const listeners = new Set<() => void>();

function notifyMoodListeners() {
  listeners.forEach((listener) => listener());
}

export function useDailyMood(overrideUserId?: string) {
  const { profile } = useUserProfile();
  const activeUserId = overrideUserId || profile?.studentId || getCurrentUserId();

  const [moodRecord, setMoodRecord] = useState<DailyMoodRecord | null>(() =>
    moodService.getTodayMood(activeUserId)
  );
  const [isCheckInNeeded, setIsCheckInNeeded] = useState<boolean>(() =>
    moodService.isMoodCheckInNeededToday(activeUserId)
  );

  useEffect(() => {
    if (activeUserId) {
      moodService.syncWithServer(activeUserId);
    }
  }, [activeUserId]);

  useEffect(() => {
    const handleChange = () => {
      setMoodRecord(moodService.getTodayMood(activeUserId));
      setIsCheckInNeeded(moodService.isMoodCheckInNeededToday(activeUserId));
    };
    handleChange();
    listeners.add(handleChange);
    const unsubscribeProfile = subscribeUserProfile(handleChange);
    return () => {
      listeners.delete(handleChange);
      unsubscribeProfile();
    };
  }, [activeUserId]);

  const selectMood = (mood: StudentMood, subjectCode?: string) => {
    moodService.saveTodayMood(mood, subjectCode, activeUserId);
  };

  const selectSubject = (subjectCode: string) => {
    moodService.saveTodaySubject(subjectCode, activeUserId);
  };

  const hasCustom = curriculumService.hasCustomSyllabus(activeUserId);
  const hasCurriculumData = hasCustom;

  const currentSubjectCode = moodRecord?.selectedSubjectCode;

  const subjects = curriculumService.getSubjectsSync(activeUserId);
  const availableSubjects = subjects;
  const isValidSubject = !!(currentSubjectCode && availableSubjects.some((s) => s.code === currentSubjectCode));

  const selectedSubjectCode = hasCurriculumData
    ? (isValidSubject ? currentSubjectCode : (availableSubjects[0]?.code || ''))
    : '';

  return {
    moodRecord,
    currentMood: moodRecord?.mood || null,
    selectedSubjectCode,
    isCheckInNeeded,
    selectMood,
    selectSubject,
  };
}

