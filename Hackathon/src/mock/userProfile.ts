import { useState, useEffect } from 'react';
import type { StudentMood } from '../services/moodService';
import { progressService, subscribeProgress } from '../services/progressService';
import { studySessionService, subscribeSession } from '../services/studySessionService';

export interface UserProfile {
  name: string;
  studentId: string;
  course: string;
  branch: string;
  bio: string;
  avatarUrl: string;
  year?: string;
  semester?: string;
  collegeName?: string;
  universityRollNo?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
}

export interface LearningPreferences {
  learningStyle: 'Visual' | 'Auditory' | 'Reading' | 'Kinesthetic';
  difficultyLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  language: string;
  dailyGoalMinutes: string;
}

export interface AISettings {
  proactiveSuggestions: boolean;
  strictMode: boolean;
  dailyReminders: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: 'primary' | 'tertiary' | 'secondary' | 'neutral';
  locked?: boolean;
}

export interface LearningStat {
  id: string;
  label: string;
  value: string;
  icon: string;
  variant: 'primary' | 'tertiary' | 'secondary' | 'fire';
}

export interface ActiveStudySession {
  topicId: string;
  topicTitle: string;
  subjectName: string;
  subjectCode: string;
  module: string;
  semester: number;
  duration: string;
  mood: StudentMood;
  startedAt: number;
  completed: boolean;
}

export const DEFAULT_AVATAR_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDOVLgOQprhF1WAHy2NQtfck0rpOmAxsqSWEj7zNHE7bPPLbNNUu6IHDf7sXmx0BVSeRQdFZPh_lIVgEgxAaAsY5h32ugHjHEwPoYP_06bBQCzB7RDbleM1SGXoGoyhvP1LCV21H55WUVXj5wW2SJ2AO36kFA9I0oc30ThMpV6TT60xO1ZNn-sjxvipbviGVMrt7ElryV6nPz9jaSDcUKEZK-ncofysk0qX13DzG3e1rnIr1P50cNko';

export const INITIAL_PROFILE: UserProfile = {
  name: 'Student',
  studentId: 'SF-2024-0892',
  course: 'B.Tech',
  branch: 'Computer Science & Engineering',
  bio: 'Passionate about AI and software development. Always eager to learn new technologies.',
  avatarUrl: DEFAULT_AVATAR_URL,
  year: '',
  semester: '',
  collegeName: '',
  universityRollNo: '',
  phoneNumber: '',
  dateOfBirth: '',
  gender: '',
};

const INITIAL_PREFERENCES: LearningPreferences = {
  learningStyle: 'Visual',
  difficultyLevel: 'Intermediate',
  language: 'en',
  dailyGoalMinutes: '60',
};

const INITIAL_AI_SETTINGS: AISettings = {
  proactiveSuggestions: true,
  strictMode: false,
  dailyReminders: true,
};

export const INITIAL_STATS: LearningStat[] = [
  { id: 'stat-1', label: 'Study Hours', value: '0h', icon: 'schedule', variant: 'primary' },
  { id: 'stat-2', label: 'Quizzes', value: '0', icon: 'quiz', variant: 'tertiary' },
  { id: 'stat-3', label: 'Topics', value: '0', icon: 'category', variant: 'secondary' },
  { id: 'stat-4', label: 'Current Streak', value: '0 Days', icon: 'local_fire_department', variant: 'fire' },
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'one-week-complete',
    title: '1 Week Complete',
    description: 'Studied consistently for 7 consecutive days',
    icon: 'emoji_events',
    color: 'tertiary',
    locked: true,
  },
  {
    id: 'ach-1',
    title: 'Fast Learner',
    description: 'Completed 10 topics in a week',
    icon: 'rocket_launch',
    color: 'primary',
  },
  {
    id: 'ach-2',
    title: 'Quiz Master',
    description: 'Scored 100% on 5 quizzes',
    icon: 'psychology',
    color: 'secondary',
  },
];

const STORAGE_PROFILE_PREFIX = 'studyflow_profile_';

function getProfileStorageKey(userId?: string): string {
  const uid = userId || getCurrentUserId();
  return `${STORAGE_PROFILE_PREFIX}${uid}`;
}

export function loadProfileFromStorage(userId?: string): UserProfile {
  const key = getProfileStorageKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.name === 'Alex') parsed.name = 'Student';
      return parsed;
    }

    // Legacy key fallback
    const legacyRaw = localStorage.getItem('studyflow_profile');
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (parsed.name === 'Alex') parsed.name = 'Student';
      localStorage.setItem(key, JSON.stringify(parsed));
      return parsed;
    }
  } catch (e) {
    console.error('Failed to read profile from storage:', e);
  }
  return { ...INITIAL_PROFILE };
}

export function saveProfileToStorage(profile: UserProfile): void {
  const key = getProfileStorageKey(profile.studentId);
  try {
    localStorage.setItem(key, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save profile to storage:', e);
  }
}

// Global state store with listeners for cross-component sync
let currentProfile: UserProfile = loadProfileFromStorage();
let currentPreferences: LearningPreferences = { ...INITIAL_PREFERENCES };
let currentAiSettings: AISettings = { ...INITIAL_AI_SETTINGS };
let activeStudySession: ActiveStudySession | null = null;
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

export function setProfileStateFromServer(serverProfile: Partial<UserProfile>): void {
  if (!serverProfile) return;
  const targetStudentId = serverProfile.studentId || currentProfile.studentId || 'SF-2024-0892';

  currentProfile = {
    name: serverProfile.name || 'Student',
    studentId: targetStudentId,
    course: serverProfile.course || 'B.Tech',
    branch: serverProfile.branch || 'Computer Science & Engineering',
    bio: serverProfile.bio ?? '',
    avatarUrl: serverProfile.avatarUrl || INITIAL_PROFILE.avatarUrl,
    year: serverProfile.year || '',
    semester: serverProfile.semester || '',
    collegeName: serverProfile.collegeName || '',
    universityRollNo: serverProfile.universityRollNo || '',
    phoneNumber: serverProfile.phoneNumber || '',
    dateOfBirth: serverProfile.dateOfBirth || '',
    gender: serverProfile.gender || '',
  };
  saveProfileToStorage(currentProfile);
  notifyListeners();
}

export async function syncProfileWithServer(userId?: string): Promise<void> {
  const activeUserId = userId || getCurrentUserId();
  try {
    const res = await fetch(`/api/users/profile?userId=${encodeURIComponent(activeUserId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.profile) {
        setProfileStateFromServer(data.profile);
      }
    }
  } catch (e) {
    // Offline fallback
  }
}

export function resetUserProfile(): void {
  currentProfile = { ...INITIAL_PROFILE };
  notifyListeners();
}

export function getCurrentUserId(): string {
  try {
    if (typeof currentProfile !== 'undefined' && currentProfile && currentProfile.studentId) {
      return currentProfile.studentId;
    }
  } catch (e) {}
  return 'SF-2024-0892';
}

export function getCurrentProfile(): UserProfile {
  return currentProfile;
}

export function subscribeUserProfile(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useUserProfile() {
  const [profile, setProfileState] = useState<UserProfile>(currentProfile);
  const [preferences, setPreferencesState] = useState<LearningPreferences>(currentPreferences);
  const [aiSettings, setAiSettingsState] = useState<AISettings>(currentAiSettings);
  const [session, setSessionState] = useState<ActiveStudySession | null>(activeStudySession);

  useEffect(() => {
    const handleChange = () => {
      setProfileState({ ...currentProfile });
      setPreferencesState({ ...currentPreferences });
      setAiSettingsState({ ...currentAiSettings });
      setSessionState(activeStudySession ? { ...activeStudySession } : null);
    };
    listeners.add(handleChange);
    const unsubscribeProgress = subscribeProgress(handleChange);
    const unsubscribeSession = subscribeSession(handleChange);
    return () => {
      listeners.delete(handleChange);
      unsubscribeProgress();
      unsubscribeSession();
    };
  }, []);

  const updateProfile = async (updated: Partial<UserProfile>) => {
    const candidateProfile = { ...currentProfile, ...updated };

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidateProfile),
      });

      if (!res.ok) {
        if (res.status === 413) {
          throw new Error('Profile picture file size is too large for the server. Please select a smaller image.');
        }
        throw new Error(`Server profile update failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      if (data.success && data.profile) {
        currentProfile = {
          name: data.profile.name || candidateProfile.name,
          studentId: data.profile.studentId || candidateProfile.studentId,
          course: data.profile.course || candidateProfile.course,
          branch: data.profile.branch || candidateProfile.branch,
          bio: data.profile.bio ?? candidateProfile.bio,
          avatarUrl: data.profile.avatarUrl || candidateProfile.avatarUrl,
          year: data.profile.year ?? candidateProfile.year,
          semester: data.profile.semester ?? candidateProfile.semester,
          collegeName: data.profile.collegeName ?? candidateProfile.collegeName,
          universityRollNo: data.profile.universityRollNo ?? candidateProfile.universityRollNo,
          phoneNumber: data.profile.phoneNumber ?? candidateProfile.phoneNumber,
          dateOfBirth: data.profile.dateOfBirth ?? candidateProfile.dateOfBirth,
          gender: data.profile.gender ?? candidateProfile.gender,
        };
        saveProfileToStorage(currentProfile);
        notifyListeners();
      } else {
        throw new Error(data.error || 'Failed to update profile.');
      }
    } catch (e: any) {
      console.error('Failed to update user profile on server:', e);
      if (e.message && (e.message.includes('Failed to fetch') || e.message.includes('NetworkError'))) {
        currentProfile = candidateProfile;
        saveProfileToStorage(currentProfile);
        notifyListeners();
      } else {
        throw e;
      }
    }
  };

  const updatePreferences = (updated: Partial<LearningPreferences>) => {
    currentPreferences = { ...currentPreferences, ...updated };
    notifyListeners();
  };

  const updateAiSettings = (updated: Partial<AISettings>) => {
    currentAiSettings = { ...currentAiSettings, ...updated };
    notifyListeners();
  };

  const startStudySession = (newSession: Omit<ActiveStudySession, 'startedAt'>) => {
    activeStudySession = {
      ...newSession,
      completed: progressService.isTopicCompleted(newSession.topicId),
      startedAt: Date.now(),
    };
    notifyListeners();
  };

  const markSessionComplete = () => {
    if (activeStudySession) {
      progressService.markTopicCompleted(activeStudySession.topicId);
      activeStudySession = {
        ...activeStudySession,
        completed: true,
      };
      notifyListeners();
    }
  };

  const clearStudySession = () => {
    activeStudySession = null;
    notifyListeners();
  };

  return {
    profile,
    preferences,
    aiSettings,
    activeStudySession: session,
    updateProfile,
    updatePreferences,
    updateAiSettings,
    startStudySession,
    markSessionComplete,
    clearStudySession,
  };
}

export function useStudyProgress() {
  const [progress, setProgress] = useState(() => progressService.getWeeklyStudyProgress());

  useEffect(() => {
    const handleUpdate = () => {
      setProgress(progressService.getWeeklyStudyProgress());
    };
    const unsubscribe = subscribeProgress(handleUpdate);
    return () => {
      unsubscribe();
    };
  }, []);

  return progress;
}

export function useStudyStats() {
  const [stats, setStats] = useState(() => ({
    hoursStudied: studySessionService.getWeeklyHoursStudiedFormatted(),
    streakDays: studySessionService.getCurrentStreakFormatted(),
    streakCount: studySessionService.getCurrentStreak(),
    isOneWeekBadgeUnlocked: studySessionService.isAchievementUnlocked('one-week-complete'),
  }));

  useEffect(() => {
    const handleUpdate = () => {
      setStats({
        hoursStudied: studySessionService.getWeeklyHoursStudiedFormatted(),
        streakDays: studySessionService.getCurrentStreakFormatted(),
        streakCount: studySessionService.getCurrentStreak(),
        isOneWeekBadgeUnlocked: studySessionService.isAchievementUnlocked('one-week-complete'),
      });
    };
    const unsubscribe = subscribeSession(handleUpdate);
    return () => {
      unsubscribe();
    };
  }, []);

  return stats;
}
