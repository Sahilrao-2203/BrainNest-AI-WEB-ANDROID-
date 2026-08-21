import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'glass' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2 text-base rounded-xl',
    lg: 'px-6 py-4 text-body-lg rounded-xl',
  };

  const variantStyles = {
    primary: 'bg-primary text-on-primary hover:bg-primary/95 shadow-[0_4px_12px_rgba(26,35,126,0.15)] hover:shadow-[0_6px_16px_rgba(26,35,126,0.25)]',
    secondary: 'bg-transparent text-secondary border border-secondary hover:bg-secondary/8',
    glass: 'glass-panel text-on-surface hover:bg-surface-container/60',
    ghost: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low',
    icon: 'p-2 rounded-full text-primary hover:bg-surface-container-low',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
