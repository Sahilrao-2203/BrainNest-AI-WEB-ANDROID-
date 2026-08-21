import React from 'react';
import { INITIAL_STATS, type LearningStat } from '../../mock/userProfile';

interface ProfileStatsProps {
  stats?: LearningStat[];
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({ stats = INITIAL_STATS }) => {
  return (
    <section>
      <h3 className="font-headline-md text-headline-md text-on-surface mb-6 flex items-center gap-3">
        <span className="material-symbols-outlined text-primary">bar_chart</span>
        Learning Stats
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          if (stat.variant === 'fire') {
            return (
              <div
                key={stat.id}
                className="bg-surface-container border border-white/10 p-5 rounded-xl flex flex-col items-start gap-4 hover:scale-[1.02] hover:border-primary/40 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/10 rounded-full blur-xl"></div>
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {stat.icon}
                  </span>
                </div>
                <div>
                  <div className="font-headline-md text-headline-md text-on-surface">
                    {stat.value}
                  </div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant">
                    {stat.label}
                  </div>
                </div>
              </div>
            );
          }

          const iconContainerClasses = {
            primary: 'bg-primary-container text-primary',
            tertiary: 'bg-tertiary-container text-tertiary',
            secondary: 'bg-secondary-container text-secondary',
          }[stat.variant as 'primary' | 'tertiary' | 'secondary'] || 'bg-primary-container text-primary';

          return (
            <div
              key={stat.id}
              className="bg-surface-container border border-white/10 p-5 rounded-xl flex flex-col items-start gap-4 hover:scale-[1.02] hover:border-primary/40 transition-all duration-300"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${iconContainerClasses}`}
              >
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
              <div>
                <div className="font-headline-md text-headline-md text-on-surface">
                  {stat.value}
                </div>
                <div className="font-label-sm text-label-sm text-on-surface-variant">
                  {stat.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
