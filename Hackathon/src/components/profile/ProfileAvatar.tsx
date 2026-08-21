import React, { useState, useEffect } from 'react';

interface ProfileAvatarProps {
  avatarUrl?: string;
  name: string;
  className?: string;
  iconSize?: string;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  avatarUrl,
  name,
  className = "w-12 h-12",
  iconSize = "text-xl",
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state when avatarUrl changes
  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  const isLocalDevicePath = (url?: string): boolean => {
    if (!url) return true;
    // Check if it looks like an Android / iOS local absolute path (e.g. starting with /data/, /user/, or containing com.brainnest.app)
    return (
      url.startsWith('/') &&
      (url.startsWith('/data/') ||
        url.startsWith('/user/') ||
        url.includes('com.brainnest.app') ||
        url.includes('/cache/'))
    );
  };

  const showFallback = hasError || !avatarUrl || isLocalDevicePath(avatarUrl);

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase().slice(0, 2);
  };

  if (showFallback) {
    const initials = getInitials(name);
    return (
      <div
        className={`${className} rounded-full bg-gradient-to-br from-primary/30 to-tertiary/30 border border-primary/20 flex items-center justify-center text-primary font-bold select-none`}
        title={name}
      >
        <span className={iconSize}>{initials}</span>
      </div>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt={`${name}'s profile`}
      className={`${className} rounded-full object-cover`}
      onError={() => setHasError(true)}
    />
  );
};
