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
      title: 'Gen-Z Mode',
      description: 'AI uses slang and memes to explain topics.',
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
    <div className="md:col-span-8 bg-gradient-to-br from-primary-900 to-primary-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between text-white relative overflow-hidden h-full">
      {/* Decorative SVG/Blur */}
      <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-1/4 translate-y-1/4">
        <span className="material-symbols-outlined text-[200px]">smart_toy</span>
      </div>
      
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-accent-400">psychology</span>
          <h3 className="font-headline-sm font-bold text-white">AI Preferences</h3>
        </div>
        <p className="font-body-sm text-primary-100 mb-6 opacity-90 max-w-[80%]">
          Customize how your AI companion interacts with you.
        </p>
      </div>
      
      <div className="space-y-4 relative z-10">
        {toggleItems.map((item) => {
          const checked = settings[item.key];
          return (
            <div key={item.key} className="flex justify-between items-center bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 hover:bg-white/20 transition-colors">
              <div>
                <div className="font-body-md font-semibold text-white">{item.title}</div>
                <div className="font-body-sm text-primary-100 opacity-90">{item.description}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={checked as boolean}
                  onChange={(e) => onChange({ [item.key]: e.target.checked })}
                />
                <div className="w-11 h-6 bg-primary-700/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-500"></div>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
};
