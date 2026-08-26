import React, { useState } from 'react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({ className = '', ...props }) => {
  const [showPassword, setShowPassword] = useState(false);

  const toggleVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const defaultClasses = "bg-surface-variant border border-white/10 rounded-lg pl-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-body-md";
  const inputClassName = className ? `${className} w-full pr-11` : `w-full pr-11 ${defaultClasses}`;

  return (
    <div className="relative flex items-center w-full">
      <input
        {...props}
        type={showPassword ? 'text' : 'password'}
        className={inputClassName}
      />
      <button
        type="button"
        onClick={toggleVisibility}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        title={showPassword ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-primary flex items-center justify-center"
      >
        <span className="material-symbols-outlined text-xl select-none leading-none">
          {showPassword ? 'visibility_off' : 'visibility'}
        </span>
      </button>
    </div>
  );
};
