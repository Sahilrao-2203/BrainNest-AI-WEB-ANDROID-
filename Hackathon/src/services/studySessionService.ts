import { getCurrentUserId } from '../mock/userProfile';

export const STUDY_INACTIVITY_THRESHOLD = 10 * 60 * 1000; // 10 minutes
export const MIN_STUDY_TIME_FOR_STREAK = 10 * 60 * 1000; // 10 minutes

export interface DailyStudyLog {
  date: string; // YYYY-MM-DD
  activeDurationMs: number;
  topicDurations: Record<string, number>;
}

const STORAGE_LOGS_PREFIX = 'studyflow_study_logs_';
const STORAGE_ACHIEVEMENTS_PREFIX = 'studyflow_unlocked_achievements_';

function getLogsKey(userId?: string): string {
  const uid = userId || getCurrentUserId();
  return `${STORAGE_LOGS_PREFIX}${uid}`;
}

function getAchievementsKey(userId?: string): string {
  const uid = userId || getCurrentUserId();
  return `${STORAGE_ACHIEVEMENTS_PREFIX}${uid}`;
}

const listeners = new Set<() => void>();

export function notifySessionListeners() {
  listeners.forEach((listener) => listener());
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTodayLocalDateString(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getStartOfWeekDate(d = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export const studySessionService = {
  getAllLogs(userId?: string): Record<string, DailyStudyLog> {
    const key = getLogsKey(userId);
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);

      // Legacy fallback for primary user
      const legacyRaw = localStorage.getItem('studyflow_study_logs');
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if ((userId || getCurrentUserId()) === 'SF-2024-0892') {
          localStorage.setItem(key, JSON.stringify(parsed));
          return parsed;
        }
      }
      return {};
    } catch (e) {
      console.error('Failed to read study logs from storage:', e);
      return {};
    }
  },

  recordActiveTime(topicId: string, durationMs: number, userId?: string, subjectCode = 'ES-CS201'): void {
    if (durationMs <= 0) return;
    const activeUserId = userId || getCurrentUserId();
    const today = getTodayLocalDateString();
    const logs = this.getAllLogs(activeUserId);

    const existing: DailyStudyLog = logs[today] || {
      date: today,
      activeDurationMs: 0,
      topicDurations: {},
    };

    const prevDuration = existing.activeDurationMs;
    existing.activeDurationMs += durationMs;
    existing.topicDurations[topicId] = (existing.topicDurations[topicId] || 0) + durationMs;

    logs[today] = existing;

    try {
      const key = getLogsKey(activeUserId);
      localStorage.setItem(key, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to save study log to storage:', e);
    }

    // Sync session duration record to MongoDB asynchronously
    fetch('/api/study-sessions/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: activeUserId,
        topicId,
        subjectCode,
        durationMs,
        date: today,
        startedAt: Date.now() - durationMs,
        endedAt: Date.now(),
      }),
    }).catch(() => { });

    // Check achievement unlock
    const streakResult = this.checkAndUnlockStreakAchievement(activeUserId);

    const crossedStreakThreshold =
      prevDuration < MIN_STUDY_TIME_FOR_STREAK && existing.activeDurationMs >= MIN_STUDY_TIME_FOR_STREAK;

    if (streakResult.newlyUnlocked || crossedStreakThreshold) {
      notifySessionListeners();
    }
  },

  async syncWithServer(userId?: string): Promise<void> {
    const activeUserId = userId || getCurrentUserId();
    try {
      const res = await fetch(`/api/study-stats?userId=${encodeURIComponent(activeUserId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.isOneWeekBadgeUnlocked) {
            this.unlockAchievement('one-week-complete', activeUserId);
          }
          notifySessionListeners();
        }
      }
    } catch (e) {
      // Offline fallback
    }
  },

  getWeeklyHoursStudiedMs(userId?: string): number {
    const logs = this.getAllLogs(userId);
    const monday = getStartOfWeekDate();
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    let totalMs = 0;
    Object.values(logs).forEach((log) => {
      const parts = log.date.split('-');
      if (parts.length === 3) {
        const logDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (logDate >= monday && logDate <= sunday) {
          totalMs += log.activeDurationMs || 0;
        }
      }
    });

    return totalMs;
  },

  getWeeklyHoursStudiedFormatted(userId?: string): string {
    const totalMs = this.getWeeklyHoursStudiedMs(userId);
    if (totalMs <= 0) return '0h';

    const totalMinutes = Math.floor(totalMs / (1000 * 60));
    if (totalMinutes < 60) {
      return `${totalMinutes}m`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
  },

  getCurrentStreak(userId?: string): number {
    const logs = this.getAllLogs(userId);
    const todayStr = getTodayLocalDateString();

    const qualifies = (dateStr: string) => {
      const log = logs[dateStr];
      return !!log && log.activeDurationMs >= MIN_STUDY_TIME_FOR_STREAK;
    };

    let streak = 0;
    const currDate = new Date();

    if (qualifies(todayStr)) {
      streak = 1;
      currDate.setDate(currDate.getDate() - 1);
      while (qualifies(getTodayLocalDateString(currDate))) {
        streak++;
        currDate.setDate(currDate.getDate() - 1);
      }
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getTodayLocalDateString(yesterday);

      if (qualifies(yesterdayStr)) {
        streak = 1;
        currDate.setDate(currDate.getDate() - 2);
        while (qualifies(getTodayLocalDateString(currDate))) {
          streak++;
          currDate.setDate(currDate.getDate() - 1);
        }
      }
    }

    return streak;
  },

  getCurrentStreakFormatted(userId?: string): string {
    const streak = this.getCurrentStreak(userId);
    return `${streak} ${streak === 1 ? 'Day' : 'Days'}`;
  },

  getUnlockedAchievements(userId?: string): string[] {
    const key = getAchievementsKey(userId);
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);

      // Legacy fallback
      const legacyRaw = localStorage.getItem('studyflow_unlocked_achievements');
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if ((userId || getCurrentUserId()) === 'SF-2024-0892') {
          localStorage.setItem(key, JSON.stringify(parsed));
          return parsed;
        }
      }
      return [];
    } catch (e) {
      console.error('Failed to read unlocked achievements:', e);
      return [];
    }
  },

  isAchievementUnlocked(id: string, userId?: string): boolean {
    return this.getUnlockedAchievements(userId).includes(id);
  },

  unlockAchievement(id: string, userId?: string): void {
    const activeUserId = userId || getCurrentUserId();
    const list = new Set(this.getUnlockedAchievements(activeUserId));
    list.add(id);
    try {
      const key = getAchievementsKey(activeUserId);
      localStorage.setItem(key, JSON.stringify(Array.from(list)));
    } catch (e) {
      console.error('Failed to unlock achievement:', e);
    }
    notifySessionListeners();
  },

  checkAndUnlockStreakAchievement(userId?: string): { newlyUnlocked: boolean; title?: string; description?: string } {
    const activeUserId = userId || getCurrentUserId();
    const streak = this.getCurrentStreak(activeUserId);
    if (streak >= 7 && !this.isAchievementUnlocked('one-week-complete', activeUserId)) {
      this.unlockAchievement('one-week-complete', activeUserId);
      return {
        newlyUnlocked: true,
        title: '🏆 1 Week Complete!',
        description: 'You studied consistently for 7 consecutive days.',
      };
    }
    return { newlyUnlocked: false };
  },
};

// Initial background sync with server
studySessionService.syncWithServer();

