import { getCurrentUserId } from '../mock/userProfile';
import { curriculumService } from './curriculumService';

const STORAGE_KEY_PREFIX = 'studyflow_completed_topics_';

function getStorageKey(userId?: string): string {
  const uid = userId || getCurrentUserId();
  return `${STORAGE_KEY_PREFIX}${uid}`;
}

const listeners = new Set<() => void>();

export function notifyProgressListeners() {
  listeners.forEach((listener) => listener());
}

export function subscribeProgress(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCanonicalTopicId(topicId: string): string {
  if (!topicId) return '';
  let clean = topicId.replace(/^(task-|makaut-|custom-)/, '');
  
  if (topicId.includes('custom-') || clean.startsWith('custom-')) {
    return `custom-${clean}`;
  }

  const dashCount = (clean.match(/-/g) || []).length;
  if (dashCount > 2) {
    clean = clean.replace(/-\d+$/, '');
  }
  return clean;
}

export const progressService = {
  getCompletedTopicIds(userId?: string): string[] {
    const key = getStorageKey(userId);
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);

      // Legacy key fallback for default primary user
      const legacyRaw = localStorage.getItem('studyflow_completed_topics');
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if ((userId || getCurrentUserId()) === 'SF-2024-0892') {
          localStorage.setItem(key, JSON.stringify(parsed));
          return parsed;
        }
      }
      return [];
    } catch (e) {
      console.error('Failed to read completed topics from storage:', e);
      return [];
    }
  },

  isTopicCompleted(topicId: string, userId?: string): boolean {
    const ids = this.getCompletedTopicIds(userId);
    const cleanId = getCanonicalTopicId(topicId);

    return ids.some((id) => {
      const canonical = getCanonicalTopicId(id);
      return id === topicId || canonical === cleanId || id === cleanId;
    });
  },

  saveCompletedTopicIdsLocally(ids: string[], userId?: string): void {
    const key = getStorageKey(userId);
    try {
      localStorage.setItem(key, JSON.stringify(ids));
    } catch (e) {
      console.error('Failed to save completed topics to local storage:', e);
    }
    notifyProgressListeners();
  },

  async syncWithServer(userId?: string): Promise<void> {
    const activeUserId = userId || getCurrentUserId();
    try {
      const res = await fetch(`/api/progress?userId=${encodeURIComponent(activeUserId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.completedTopicIds)) {
          this.saveCompletedTopicIdsLocally(data.completedTopicIds, activeUserId);
        }
      }
    } catch (e) {
      // Offline fallback
    }
  },

  async markTopicCompleted(topicId: string, userId?: string): Promise<void> {
    const activeUserId = userId || getCurrentUserId();
    const cleanId = getCanonicalTopicId(topicId);
    const ids = new Set(this.getCompletedTopicIds(activeUserId));

    ids.add(topicId);
    if (cleanId) {
      ids.add(cleanId);
    }

    const updated = Array.from(ids);
    this.saveCompletedTopicIdsLocally(updated, activeUserId);

    try {
      await fetch('/api/progress/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUserId, topicId }),
      });
    } catch (e) {
      // Offline fallback retained locally
    }
  },

  async markTopicIncomplete(topicId: string, userId?: string): Promise<void> {
    const activeUserId = userId || getCurrentUserId();
    const cleanId = getCanonicalTopicId(topicId);
    const ids = this.getCompletedTopicIds(activeUserId);

    const filtered = ids.filter((id) => {
      const canonical = getCanonicalTopicId(id);
      return id !== topicId && canonical !== cleanId && id !== cleanId;
    });

    this.saveCompletedTopicIdsLocally(filtered, activeUserId);

    try {
      await fetch('/api/progress/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUserId, topicId }),
      });
    } catch (e) {
      // Offline fallback retained locally
    }
  },

  async toggleTopicCompleted(topicId: string, userId?: string): Promise<void> {
    if (this.isTopicCompleted(topicId, userId)) {
      await this.markTopicIncomplete(topicId, userId);
    } else {
      await this.markTopicCompleted(topicId, userId);
    }
  },

  /**
   * Calculates overall study progress dynamically across all topics in the curriculum.
   */
  getWeeklyStudyProgress(userId?: string): { completedCount: number; totalCount: number; percentage: number } {
    const allTopics = curriculumService.getTopicsSync(userId);
    const completedIds = this.getCompletedTopicIds(userId);

    const totalCount = allTopics.length; // 43 topics across 8 subjects
    let completedCount = 0;

    allTopics.forEach((topic) => {
      const cleanId = getCanonicalTopicId(topic.id);
      const isDone = completedIds.some((storedId) => {
        const canonical = getCanonicalTopicId(storedId);
        return storedId === topic.id || canonical === cleanId || storedId === cleanId;
      });

      if (isDone) {
        completedCount++;
      }
    });

    const percentage = totalCount > 0 ? Math.min((completedCount / totalCount) * 100, 100) : 0;

    return {
      completedCount,
      totalCount,
      percentage,
    };
  },
};

// Initial background sync with server
progressService.syncWithServer();

