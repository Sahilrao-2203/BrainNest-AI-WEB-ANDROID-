import React from 'react';

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percentage,
  size = 160,
}) => {
  // Ensure percentage is bounded between 0 and 100
  const cleanPercentage = Math.min(Math.max(percentage, 0), 100);

  // Format percentage to 2 decimal places if it's not a whole number
  const formattedPercentage = cleanPercentage % 1 === 0
    ? cleanPercentage.toFixed(0)
    : cleanPercentage.toFixed(2);

  // Use a responsive max-width that scales nicely up to 240px
  const containerMaxWidth = size ? Math.max(size, 240) : 240;

  return (
    <div className="w-full flex flex-col items-center my-3" style={{ maxWidth: `${containerMaxWidth}px` }}>
      {/* Percentage text */}
      <span className="text-4xl font-bold text-secondary mb-3.5 select-none">{formattedPercentage}%</span>
      
      {/* Horizontal Progress Bar Track */}
      <div 
        className="w-full bg-on-surface/10 rounded-full h-3 mb-3.5 overflow-hidden border border-white/5 relative"
        role="progressbar"
        aria-valuenow={cleanPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* Progress Bar Fill */}
        <div
          className="bg-secondary h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${cleanPercentage}%` }}
        />
      </div>

      {/* Label */}
      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider select-none">
        Weekly Goal
      </span>
    </div>
  );
};
