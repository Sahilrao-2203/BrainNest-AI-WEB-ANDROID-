import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ className = '', ...props }) => {
  return (
    <input
      type="checkbox"
      className={`form-checkbox rounded bg-surface border-outline-variant text-tertiary focus:ring-tertiary focus:ring-offset-background w-5 h-5 cursor-pointer ${className}`}
      {...props}
    />
  );
};
