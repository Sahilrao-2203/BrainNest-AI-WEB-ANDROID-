import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PasswordInput } from './PasswordInput';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isRegisterMode, setIsRegisterMode] = useState(initialMode === 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [course, setCourse] = useState('B.Tech');
  const [branch, setBranch] = useState('Computer Science & Engineering');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRegisterMode(initialMode === 'register');
      setError('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);

    try {
      if (isRegisterMode) {
        const res = await register({ email, password, name, studentId, course, branch });
        if (res.success) {
          onClose();
          navigate('/');
        } else {
          setError(res.error || 'Registration failed.');
        }
      } else {
        const res = await login(email, password);
        if (res.success) {
          onClose();
          navigate('/');
        } else {
          setError(res.error || 'Invalid credentials.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
      <div className="bg-surface-container rounded-2xl w-full max-w-md border border-white/10 shadow-2xl overflow-hidden transform transition-all">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-surface-container-high/50">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">lock</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">
              {isRegisterMode ? 'Create Student Account' : 'Student Login'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-error-container/40 border border-error/30 text-error rounded-lg text-xs font-semibold">
              {error}
            </div>
          )}

          {isRegisterMode && (
            <div>
              <label className="block font-label-sm text-on-surface-variant mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sahil Roy"
                className="w-full bg-surface-variant border border-white/10 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-body-md"
              />
            </div>
          )}

          <div>
            <label className="block font-label-sm text-on-surface-variant mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@makaut.ac.in"
              className="w-full bg-surface-variant border border-white/10 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-body-md"
            />
          </div>

          <div>
            <label className="block font-label-sm text-on-surface-variant mb-1">Password</label>
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {isRegisterMode && (
            <>
              <div>
                <label className="block font-label-sm text-on-surface-variant mb-1">Student ID (Optional)</label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="SF-2024-0892"
                  className="w-full bg-surface-variant border border-white/10 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-body-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-label-sm text-on-surface-variant mb-1">Course</label>
                  <input
                    type="text"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full bg-surface-variant border border-white/10 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-body-md text-xs"
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-on-surface-variant mb-1">Branch</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full bg-surface-variant border border-white/10 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-body-md text-xs"
                  />
                </div>
              </div>
            </>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-body-md font-semibold bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              {loading && <span className="material-symbols-outlined text-sm animate-spin">sync</span>}
              <span>{isRegisterMode ? 'Create Account' : 'Sign In'}</span>
            </button>
          </div>

          <div className="text-center pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode((prev) => !prev);
                setError('');
              }}
              className="text-xs text-primary hover:underline font-medium"
            >
              {isRegisterMode
                ? 'Already have an account? Sign In'
                : "Don't have an account? Create one"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
