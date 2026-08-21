import React, { useRef, useState } from 'react';
import type { UserProfile } from '../../mock/userProfile';
import { DEFAULT_AVATAR_URL, useUserProfile } from '../../mock/userProfile';
import { ProfileAvatar } from './ProfileAvatar';

interface ProfileHeaderProps {
  profile: UserProfile;
  onEditClick: () => void;
  onAvatarChange?: (avatarUrl: string) => void;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile, onEditClick, onAvatarChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateProfile } = useUserProfile();
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const showStatus = (text: string, isError = false) => {
    setStatusMessage({ text, isError });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  const handlePencilClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      showStatus('Invalid file type. Please select a JPG, PNG, or WebP image.', true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate size limit (5 MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showStatus('File size exceeds 5MB limit. Please choose a smaller image.', true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    showStatus('Uploading profile photo...');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        if (result) {
          if (onAvatarChange) {
            onAvatarChange(result);
          } else {
            await updateProfile({ avatarUrl: result });
          }
          showStatus('Upload successful!');
        }
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.onerror = () => {
        showStatus('Failed to read image file. Please try again.', true);
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    } catch (err) {
      showStatus('Upload failed. Please try again.', true);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setIsUploading(true);
    showStatus('Removing photo...');
    try {
      if (onAvatarChange) {
        onAvatarChange(DEFAULT_AVATAR_URL);
      } else {
        await updateProfile({ avatarUrl: DEFAULT_AVATAR_URL });
      }
      showStatus('Photo reset to default!');
    } catch (err) {
      showStatus('Failed to remove photo.', true);
    } finally {
      setIsUploading(false);
    }
  };

  const isCustomAvatar = profile.avatarUrl && profile.avatarUrl !== DEFAULT_AVATAR_URL;

  return (
    <section className="flex flex-col items-center text-center space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col items-center space-y-3">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-primary-fixed/30 bg-surface-container border-white/10 shadow-[0_10px_30px_rgba(185,199,228,0.15)] transition-transform duration-300 group-hover:scale-105">
            <ProfileAvatar
              avatarUrl={profile.avatarUrl}
              name={profile.name}
              className="w-full h-full"
              iconSize="text-4xl"
            />
          </div>
          <button
            type="button"
            aria-label="Edit Profile Avatar"
            title="Change Profile Photo"
            onClick={handlePencilClick}
            disabled={isUploading}
            className="absolute bottom-0 right-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-on-primary shadow-lg border-2 border-surface hover:scale-110 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">
              {isUploading ? 'sync' : 'edit'}
            </span>
          </button>
        </div>

        {isCustomAvatar && (
          <button
            type="button"
            onClick={handleRemovePhoto}
            disabled={isUploading}
            className="text-xs text-error hover:text-error/80 hover:underline font-medium flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-xs">delete</span>
            Remove Photo
          </button>
        )}

        {statusMessage && (
          <div
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
              statusMessage.isError
                ? 'bg-error-container/50 text-error border border-error/30'
                : 'bg-primary/20 text-primary border border-primary/30'
            }`}
          >
            {statusMessage.text}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
          {profile.name}
        </h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          {profile.branch ? `${profile.branch} • ${profile.course}` : profile.course}
        </p>
        {(profile.year || profile.semester) && (
          <p className="font-body-md text-body-md text-on-surface-variant/80">
            {profile.year && profile.semester
              ? `${profile.year} • ${profile.semester}`
              : profile.year || profile.semester}
          </p>
        )}
        <div className="flex items-center justify-center gap-2 text-on-surface-variant/70 font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-[16px]">badge</span>
          <span>ID: {profile.studentId}</span>
        </div>
        {profile.bio && (
          <p className="text-body-md text-on-surface/80 max-w-lg mx-auto pt-2 italic">
            "{profile.bio}"
          </p>
        )}

        {(profile.collegeName || profile.universityRollNo || profile.phoneNumber || profile.dateOfBirth || profile.gender) && (
          <div className="mt-4 pt-4 border-t border-outline-variant/30 max-w-md mx-auto grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-left text-sm text-on-surface-variant/80 font-body-md bg-surface-container/30 p-4 rounded-xl border border-white/5">
            {profile.collegeName && (
              <div className="flex items-center gap-2.5 col-span-1 sm:col-span-2">
                <span className="material-symbols-outlined text-[18px] text-primary shrink-0">school</span>
                <span className="font-semibold text-on-surface truncate" title={profile.collegeName}>{profile.collegeName}</span>
              </div>
            )}
            {profile.universityRollNo && (
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-primary shrink-0">pin</span>
                <span>Roll: <span className="font-semibold text-on-surface">{profile.universityRollNo}</span></span>
              </div>
            )}
            {profile.gender && (
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-primary shrink-0">wc</span>
                <span>Gender: <span className="font-semibold text-on-surface">{profile.gender}</span></span>
              </div>
            )}
            {profile.phoneNumber && (
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-primary shrink-0">call</span>
                <span>Phone: <span className="font-semibold text-on-surface">{profile.phoneNumber}</span></span>
              </div>
            )}
            {profile.dateOfBirth && (
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-primary shrink-0">calendar_today</span>
                <span>DOB: <span className="font-semibold text-on-surface">{formatDate(profile.dateOfBirth)}</span></span>
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={onEditClick}
        className="px-6 py-3 bg-primary text-on-primary rounded-lg font-body-md text-body-md font-semibold glow-button active:scale-95 transition-transform flex items-center gap-2"
      >
        <span className="material-symbols-outlined">edit_square</span>
        Edit Profile
      </button>
    </section>
  );
};
