import React, { useState, useEffect, useRef } from 'react';

// TEST_MODE Toggle:
// Set TEST_MODE = true for fast testing (10s active screen time / 5s resume button delay / 10s total break)
// Set TEST_MODE = false for production (40 min active screen time / 5 min resume button delay / 10 min total break)
export const TEST_MODE = false;

export const SCREEN_TIME_LIMIT_MS = TEST_MODE ? 10 * 1000 : 40 * 60 * 1000;
export const BREAK_DURATION_MS = TEST_MODE ? 10 * 1000 : 10 * 60 * 1000;
export const RESUME_BUTTON_DELAY_MS = TEST_MODE ? 5 * 1000 : 5 * 60 * 1000;

// LocalStorage Keys for State Persistence Across Page Refresh
const STORAGE_ACTIVE_TIME_KEY = 'studyflow_screentime_active_ms';
const STORAGE_BREAK_START_KEY = 'studyflow_screentime_break_start';
const STORAGE_IS_ON_BREAK_KEY = 'studyflow_screentime_is_on_break';

export const ScreenTimeBreakReminder: React.FC = () => {
  const [accumulatedActiveMs, setAccumulatedActiveMs] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_ACTIVE_TIME_KEY);
    return saved ? parseInt(saved, 10) || 0 : 0;
  });

  const [isOnBreak, setIsOnBreak] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_IS_ON_BREAK_KEY) === 'true';
  });

  const [breakStartTime, setBreakStartTime] = useState<number | null>(() => {
    const saved = localStorage.getItem(STORAGE_BREAK_START_KEY);
    return saved ? parseInt(saved, 10) || null : null;
  });

  const [breakTimeRemainingMs, setBreakTimeRemainingMs] = useState<number>(BREAK_DURATION_MS);
  const [elapsedBreakMs, setElapsedBreakMs] = useState<number>(0);

  void accumulatedActiveMs;

  const lastTickTimeRef = useRef<number>(Date.now());

  // 1. Single Centralized Timer Tick (1-second interval)
  useEffect(() => {
    lastTickTimeRef.current = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickTimeRef.current;
      lastTickTimeRef.current = now;

      // Do NOT count time if tab is hidden / inactive
      if (document.hidden) {
        return;
      }

      if (!isOnBreak) {
        // Active Screen Time Tracking Cycle
        setAccumulatedActiveMs((prevActive) => {
          const nextActive = prevActive + delta;
          localStorage.setItem(STORAGE_ACTIVE_TIME_KEY, nextActive.toString());

          if (nextActive >= SCREEN_TIME_LIMIT_MS) {
            // Trigger break popup automatically
            const breakStart = Date.now();
            setIsOnBreak(true);
            setBreakStartTime(breakStart);
            setElapsedBreakMs(0);
            localStorage.setItem(STORAGE_IS_ON_BREAK_KEY, 'true');
            localStorage.setItem(STORAGE_BREAK_START_KEY, breakStart.toString());
            localStorage.setItem(STORAGE_ACTIVE_TIME_KEY, '0');
            return 0;
          }
          return nextActive;
        });
      } else {
        // Break Modal Active Countdown
        if (breakStartTime) {
          const elapsed = now - breakStartTime;
          setElapsedBreakMs(elapsed);
          const remaining = Math.max(0, BREAK_DURATION_MS - elapsed);
          setBreakTimeRemainingMs(remaining);

          if (remaining <= 0) {
            // Automatically hide break popup after full break duration & start next cycle
            handleEndBreak();
          }
        }
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isOnBreak, breakStartTime]);

  // 2. Tab Visibility Listener (prevent hidden background time accumulation)
  useEffect(() => {
    const handleVisibilityChange = () => {
      lastTickTimeRef.current = Date.now();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Helper to cleanly end the break modal & start next active screen-time cycle
  const handleEndBreak = () => {
    setIsOnBreak(false);
    setBreakStartTime(null);
    setAccumulatedActiveMs(0);
    setElapsedBreakMs(0);
    setBreakTimeRemainingMs(BREAK_DURATION_MS);
    localStorage.setItem(STORAGE_IS_ON_BREAK_KEY, 'false');
    localStorage.removeItem(STORAGE_BREAK_START_KEY);
    localStorage.setItem(STORAGE_ACTIVE_TIME_KEY, '0');
  };

  const handleStartManualBreak = () => {
    const breakStart = Date.now();
    setIsOnBreak(true);
    setBreakStartTime(breakStart);
    setElapsedBreakMs(0);
    localStorage.setItem(STORAGE_IS_ON_BREAK_KEY, 'true');
    localStorage.setItem(STORAGE_BREAK_START_KEY, breakStart.toString());
    localStorage.setItem(STORAGE_ACTIVE_TIME_KEY, '0');
    setAccumulatedActiveMs(0);
  };

  // Development helper on window object for testing
  useEffect(() => {
    (window as any).__triggerTestBreakModal = handleStartManualBreak;
  }, []);

  const isDev = import.meta.env.DEV;

  // Format remaining break time as MM:SS
  const totalSeconds = Math.ceil(breakTimeRemainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formattedCountdown = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Check if Resume button should be visible (only after 5 minutes in prod or 5 seconds in TEST_MODE)
  const isResumeAvailable = elapsedBreakMs >= RESUME_BUTTON_DELAY_MS;
  const delayRemainingMs = Math.max(0, RESUME_BUTTON_DELAY_MS - elapsedBreakMs);
  const delayTotalSec = Math.ceil(delayRemainingMs / 1000);
  const delayMin = Math.floor(delayTotalSec / 60);
  const delaySec = delayTotalSec % 60;
  const formattedDelayRemaining = `${delayMin.toString().padStart(2, '0')}:${delaySec.toString().padStart(2, '0')}`;

  return (
    <>
      {/* Development-Only Screen Time Manual Test Control */}
      {isDev && (
        <div className="fixed bottom-20 right-4 z-[210] bg-surface-container-high/95 border border-primary/40 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs text-on-surface">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold">
              Screen Time Test {TEST_MODE ? '(TEST MODE)' : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={isOnBreak ? handleEndBreak : handleStartManualBreak}
            className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5 ${
              isOnBreak
                ? 'bg-error text-on-error hover:bg-error/90'
                : 'bg-primary text-on-primary hover:bg-primary-fixed-dim'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {isOnBreak ? 'stop_circle' : 'play_circle'}
            </span>
            <span>{isOnBreak ? 'End Break' : 'Take a Break'}</span>
          </button>
        </div>
      )}

      {/* Break Popup Modal */}
      {isOnBreak && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-container-high/95 border border-primary/30 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-[0_0_50px_rgba(185,199,228,0.2)] flex flex-col items-center text-center space-y-6 text-on-surface relative overflow-hidden">
            
            {/* Glow ambient background element */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-tertiary/20 rounded-full blur-3xl pointer-events-none" />

            {/* Icon & Category Badge */}
            <div className="relative flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-primary-container/40 border border-primary/30 flex items-center justify-center text-primary shadow-lg animate-bounce">
                <span className="material-symbols-outlined text-3xl">spa</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-primary-container/30 text-primary font-mono text-[11px] font-bold uppercase tracking-widest border border-primary/20">
                Screen-Time Break Reminder
              </span>
            </div>

            {/* Exact Required Main Message */}
            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-bold text-on-surface leading-snug">
                Take a Break. Recharge Your Mind. Come Back Stronger.
              </h2>
              <p className="text-xs md:text-sm text-on-surface-variant/80 max-w-xs mx-auto">
                Giving your eyes and mind a short rest enhances long-term focus and retention.
              </p>
            </div>

            {/* Countdown Timer Display */}
            <div className="w-full bg-surface-container-lowest/80 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-1 shadow-inner">
              <span className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider font-semibold">
                Automatic Resume In
              </span>
              <div className="text-3xl font-mono font-bold text-primary tracking-widest">
                {formattedCountdown}
              </div>
              <span className="text-[10px] text-on-surface-variant/60 font-mono">
                This popup will automatically close after 10 minutes
              </span>
            </div>

            {/* Resume Studying Now Button (Appears ONLY after 5 minutes of break) */}
            {isResumeAvailable ? (
              <button
                type="button"
                onClick={handleEndBreak}
                className="w-full py-3 px-4 rounded-xl bg-primary text-on-primary hover:bg-primary-fixed-dim text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md animate-fade-in"
              >
                <span className="material-symbols-outlined text-sm">play_arrow</span>
                <span>Resume Studying Now</span>
              </button>
            ) : (
              <div className="w-full py-2.5 px-4 rounded-xl bg-surface-variant/40 border border-white/5 text-on-surface-variant/60 text-[11px] font-mono flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-xs animate-spin">hourglass_empty</span>
                <span>
                  Resume button unlocks in {formattedDelayRemaining}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
