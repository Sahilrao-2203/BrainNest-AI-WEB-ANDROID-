import React from 'react';
import { INITIAL_ACHIEVEMENTS, type Achievement } from '../../mock/userProfile';
import { studySessionService } from '../../services/studySessionService';

interface AchievementsSectionProps {
  achievements?: Achievement[];
}

export const AchievementsSection: React.FC<AchievementsSectionProps> = ({
  achievements = INITIAL_ACHIEVEMENTS,
}) => {
  return (
    <section>
      <h3 className="font-headline-md text-headline-md text-on-surface mb-6 flex items-center gap-3">
        <span className="material-symbols-outlined text-primary-fixed">military_tech</span>
        Achievements
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {achievements.map((ach) => {
          const isUnlocked =
            ach.id === 'one-week-complete'
              ? studySessionService.isAchievementUnlocked('one-week-complete')
              : !ach.locked;

          if (!isUnlocked) {
            return (
              <div
                key={ach.id}
                className="bg-surface-container border border-white/10 p-4 rounded-xl flex items-center gap-4 opacity-50 grayscale hover:scale-[1.02] transition-transform duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant border border-white/10 shrink-0 relative">
                  <span className="material-symbols-outlined">{ach.icon}</span>
                  <div className="absolute -bottom-1 -right-1 bg-surface-container rounded-full p-0.5">
                    <span className="material-symbols-outlined text-[12px]">lock</span>
                  </div>
                </div>
                <div>
                  <div className="font-body-md font-semibold text-on-surface">{ach.title}</div>
                  <div className="font-label-sm text-on-surface-variant">{ach.description}</div>
                </div>
              </div>
            );
          }

          const iconWrapperStyles = {
            primary: 'bg-primary/20 text-primary border-primary/30',
            tertiary: 'bg-tertiary/20 text-tertiary border-tertiary/30',
            secondary: 'bg-secondary/20 text-secondary border-secondary/30',
            neutral: 'bg-surface-variant text-on-surface border-white/10',
          }[ach.color];

          return (
            <div
              key={ach.id}
              className="bg-surface-container border border-white/10 p-4 rounded-xl flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300 shadow-sm"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center border shrink-0 ${iconWrapperStyles}`}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {ach.icon}
                </span>
              </div>
              <div>
                <div className="font-body-md font-semibold text-on-surface flex items-center gap-1.5">
                  {ach.title}
                  <span className="material-symbols-outlined text-tertiary text-xs">verified</span>
                </div>
                <div className="font-label-sm text-on-surface-variant">{ach.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
