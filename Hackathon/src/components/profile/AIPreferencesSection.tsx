import React from 'react';
import type { AISettings } from '../../mock/userProfile';

interface AIPreferencesSectionProps {
  settings: AISettings;
  onChange: (updated: Partial<AISettings>) => void;
}

export const AIPreferencesSection: React.FC<AIPreferencesSectionProps> = ({
  settings,
  onChange,
}) => {
  const toggleItems: Array<{
    key: keyof AISettings;
    title: string;
    description: string;
  }> = [
    {
      key: 'proactiveSuggestions',
      title: 'Proactive Suggestions',
      description: 'AI suggests topics based on your performance.',
    },
    {
      key: 'strictMode',
      title: 'Strict Mode',
      description: 'Fewer hints, harder quizzes to test retention.',
    },
    {
      key: 'dailyReminders',
      title: 'Daily Reminders',
      description: 'Get push notifications for study streaks.',
    },
  ];

  return (
    <section>
      <h3 className="font-headline-md text-headline-md text-on-surface mb-2 flex items-center gap-3">
        <span className="material-symbols-outlined text-secondary">smart_toy</span>
        AI Companion Settings
      </h3>
      <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">
        These preferences help your AI Study Companion personalize your learning experience.
      </p>
      <div className="bg-surface-container border border-white/10 rounded-xl p-6 space-y-6">
        {toggleItems.map((item) => {
          const checked = settings[item.key];
          return (
            <div key={item.key} className="flex items-center justify-between gap-4">
              <div>
                <div className="font-body-md font-semibold text-on-surface">{item.title}</div>
                <div className="font-body-sm text-on-surface-variant">{item.description}</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange({ [item.key]: !checked })}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  checked ? 'bg-[#00513a]' : 'bg-surface-variant border-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    checked ? 'translate-x-5 border-[#a6f2cf]' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
