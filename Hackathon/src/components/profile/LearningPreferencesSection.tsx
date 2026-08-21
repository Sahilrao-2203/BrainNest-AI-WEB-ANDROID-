import React from 'react';
import type { LearningPreferences } from '../../mock/userProfile';

interface LearningPreferencesProps {
  preferences: LearningPreferences;
  onChange: (updated: Partial<LearningPreferences>) => void;
}

export const LearningPreferencesSection: React.FC<LearningPreferencesProps> = ({
  preferences,
  onChange,
}) => {
  const styles: Array<LearningPreferences['learningStyle']> = [
    'Visual',
    'Auditory',
    'Reading',
    'Kinesthetic',
  ];
  const levels: Array<LearningPreferences['difficultyLevel']> = [
    'Beginner',
    'Intermediate',
    'Advanced',
  ];

  return (
    <section>
      <h3 className="font-headline-md text-headline-md text-on-surface mb-6 flex items-center gap-3">
        <span className="material-symbols-outlined text-tertiary">settings</span>
        Learning Preferences
      </h3>
      <div className="bg-surface-container border border-white/10 rounded-xl p-6 space-y-6">
        {/* Learning Style */}
        <div className="space-y-3">
          <label className="font-label-sm text-label-sm text-on-surface-variant block">
            Learning Style
          </label>
          <div className="flex flex-wrap gap-2">
            {styles.map((style) => {
              const isActive = preferences.learningStyle === style;
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => onChange({ learningStyle: style })}
                  className={`px-4 py-2 rounded-full font-label-sm transition-colors border ${
                    isActive
                      ? 'bg-primary text-on-primary border-transparent'
                      : 'bg-surface-variant text-on-surface hover:bg-surface-container-highest border-white/10'
                  }`}
                >
                  {style}
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty Level */}
        <div className="space-y-3">
          <label className="font-label-sm text-label-sm text-on-surface-variant block">
            Difficulty Level
          </label>
          <div className="flex bg-surface-variant rounded-lg p-1 max-w-md border border-white/10">
            {levels.map((level) => {
              const isActive = preferences.difficultyLevel === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => onChange({ difficultyLevel: level })}
                  className={`flex-1 py-2 rounded-md font-label-sm transition-colors ${
                    isActive
                      ? 'bg-surface text-on-surface shadow-sm border border-white/5 font-semibold'
                      : 'bg-transparent text-on-surface hover:bg-surface-container-highest'
                  }`}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="font-label-sm text-label-sm text-on-surface-variant block">
              Language
            </label>
            <select
              value={preferences.language}
              onChange={(e) => onChange({ language: e.target.value })}
              className="w-full bg-surface-variant border border-white/10 text-on-surface rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none font-body-md cursor-pointer"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="font-label-sm text-label-sm text-on-surface-variant block">
              Daily Study Goal
            </label>
            <select
              value={preferences.dailyGoalMinutes}
              onChange={(e) => onChange({ dailyGoalMinutes: e.target.value })}
              className="w-full bg-surface-variant border border-white/10 text-on-surface rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none font-body-md cursor-pointer"
            >
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="180">3+ hours</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );
};
