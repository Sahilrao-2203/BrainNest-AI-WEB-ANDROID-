import React from 'react';
import { MOOD_OPTIONS, type StudentMood } from '../../services/moodService';

interface MoodBadgeIndicatorProps {
  mood: StudentMood | null;
  onEditMood: () => void;
}

export const MoodBadgeIndicator: React.FC<MoodBadgeIndicatorProps> = ({
  mood,
  onEditMood,
}) => {
  if (!mood) return null;

  const match = MOOD_OPTIONS.find((m) => m.id === mood);
  if (!match) return null;

  return (
    <button
      type="button"
      onClick={onEditMood}
      title="Click to change today's mood check-in"
      className={`font-label-sm text-sm px-4 py-1.5 rounded-full border flex items-center gap-2 whitespace-nowrap shrink-0 transition-all hover:scale-105 ${match.badgeColor}`}
    >
      <span className="text-base leading-none">{match.emoji}</span>
      <span>Plan adapted for: <strong>{match.title}</strong></span>
      <span className="material-symbols-outlined text-[17px] opacity-70">edit</span>
    </button>
  );
};
