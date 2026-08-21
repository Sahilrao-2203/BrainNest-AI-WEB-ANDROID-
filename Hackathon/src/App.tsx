import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { WelcomePage } from './pages/WelcomePage';
import { CompanionPage } from './pages/CompanionPage';
import { TopicCompanionPage } from './pages/TopicCompanionPage';
import { NotesPage } from './pages/NotesPage';
import { ProfilePage } from './pages/ProfilePage';
import { PlansPage } from './pages/PlansPage';
import { FlashcardsPage } from './pages/FlashcardsPage';
import { ProtectedRoute, PublicOnlyRoute } from './components/auth/ProtectedRoute';
import { ScreenTimeBreakReminder } from './components/common/ScreenTimeBreakReminder';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
        <ScreenTimeBreakReminder />
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/welcome"
            element={
              <PublicOnlyRoute>
                <WelcomePage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <WelcomePage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/companion"
            element={
              <ProtectedRoute>
                <CompanionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/topic-companion/:topicId"
            element={
              <ProtectedRoute>
                <TopicCompanionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes"
            element={
              <ProtectedRoute>
                <NotesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-notes"
            element={
              <ProtectedRoute>
                <NotesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/flashcards"
            element={
              <ProtectedRoute>
                <FlashcardsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plans"
            element={
              <ProtectedRoute>
                <PlansPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  </ThemeProvider>
  );
};

export default App;
