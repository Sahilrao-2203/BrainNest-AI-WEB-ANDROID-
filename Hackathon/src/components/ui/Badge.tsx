import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'outline';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  className = '',
}) => {
  const variantStyles = {
    primary: 'bg-primary/20 text-primary',
    secondary: 'bg-secondary/10 text-secondary border border-secondary/20',
    tertiary: 'bg-tertiary/20 text-tertiary',
    error: 'bg-error/20 text-error',
    outline: 'bg-outline-variant/30 text-on-surface-variant',
  };

  return (
    <span
      className={`font-label-sm text-label-sm px-2 py-1 rounded uppercase tracking-wider ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
