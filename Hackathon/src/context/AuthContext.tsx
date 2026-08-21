import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile } from '../mock/userProfile';
import { syncProfileWithServer, setProfileStateFromServer, resetUserProfile, subscribeUserProfile, getCurrentProfile } from '../mock/userProfile';
import { moodService } from '../services/moodService';
import { curriculumService } from '../services/curriculumService';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (payload: {
    email: string;
    password: string;
    name?: string;
    studentId?: string;
    course?: string;
    branch?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshAuth = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.authenticated && data.profile) {
          setUser(data.profile);
          setIsAuthenticated(true);
          setProfileStateFromServer(data.profile);
          await syncProfileWithServer(data.profile.studentId);
          await curriculumService.loadCurriculumFromServer(data.profile.studentId);
          await moodService.syncWithServer(data.profile.studentId);
        } else {
          setUser(null);
          setIsAuthenticated(false);
          resetUserProfile();
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        resetUserProfile();
      }
    } catch (e) {
      console.warn('[AuthContext] Auth check failed:', e);
      setUser(null);
      setIsAuthenticated(false);
      resetUserProfile();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeUserProfile(() => {
      setUser({ ...getCurrentProfile() });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    refreshAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success && data.profile) {
        setUser(data.profile);
        setIsAuthenticated(true);
        setProfileStateFromServer(data.profile);
        await syncProfileWithServer(data.profile.studentId);
        await curriculumService.loadCurriculumFromServer(data.profile.studentId);
        await moodService.syncWithServer(data.profile.studentId);
        return { success: true };
      }
      return { success: false, error: data.error || 'Invalid credentials' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error during login' };
    }
  };

  const register = async (payload: {
    email: string;
    password: string;
    name?: string;
    studentId?: string;
    course?: string;
    branch?: string;
  }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.profile) {
        setUser(data.profile);
        setIsAuthenticated(true);
        setProfileStateFromServer(data.profile);
        await syncProfileWithServer(data.profile.studentId);
        await curriculumService.loadCurriculumFromServer(data.profile.studentId);
        await moodService.syncWithServer(data.profile.studentId);
        return { success: true };
      }
      return { success: false, error: data.error || 'Registration failed' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error during registration' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.warn('[AuthContext] Logout error:', e);
    }
    const studentId = user?.studentId;
    if (studentId) {
      localStorage.removeItem(`studyflow_custom_syllabus_${studentId}`);
    }
    setUser(null);
    setIsAuthenticated(false);
    resetUserProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
