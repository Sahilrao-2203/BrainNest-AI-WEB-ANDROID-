import React from 'react';
import { INITIAL_STATS, type LearningStat } from '../../mock/userProfile';

interface ProfileStatsProps {
  stats?: LearningStat[];
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({ stats = INITIAL_STATS }) => {
  // Mapping the specific 3 stats from the Stitch design to whatever stats we have
  // We'll take the first 3 stats and map them to GPA, Hours, and Exams style cards
  const displayStats = stats.slice(0, 3);
  
  return (
    <div className="md:col-span-8 bg-white rounded-2xl p-6 shadow-sm border border-outline-variant flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <span className="material-symbols-outlined text-primary">monitoring</span>
        <h3 className="font-headline-sm font-bold text-gray-900">Learning Stats</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
        {displayStats.map((stat, idx) => {
          // Determine color based on index or variant
          const colors = [
            'bg-green-50 border-green-100 text-green-700',
            'bg-blue-50 border-blue-100 text-blue-700',
            'bg-purple-50 border-purple-100 text-purple-700'
          ];
          const iconColors = [
            'bg-green-100 text-green-600',
            'bg-blue-100 text-blue-600',
            'bg-purple-100 text-purple-600'
          ];
          const colorClass = colors[idx % colors.length];
          const iconColorClass = iconColors[idx % iconColors.length];

          return (
            <div 
              key={stat.id}
              className={`rounded-2xl p-5 border flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-1 hover:shadow-md cursor-pointer ${colorClass}`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${iconColorClass}`}>
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
              <div className="font-headline-lg font-black text-3xl mb-1">{stat.value}</div>
              <div className="font-label-md font-medium opacity-80">{stat.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
