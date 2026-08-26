import React, { useRef, useState } from 'react';
import type { UserProfile } from '../../mock/userProfile';
import { useUserProfile } from '../../mock/userProfile';
import { ProfileAvatar } from './ProfileAvatar';

interface ProfileHeaderProps {
  profile: UserProfile;
  onEditClick: () => void;
  onAvatarChange?: (avatarUrl: string) => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile, onEditClick, onAvatarChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateProfile } = useUserProfile();
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

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
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.onerror = () => {
        showStatus('Failed to read image file. Please try again.', true);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    } catch (err) {
      showStatus('Upload failed. Please try again.', true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative w-full rounded-[32px] bg-gradient-to-br from-primary-900 to-primary-800 p-8 md:p-12 overflow-hidden shadow-2xl shadow-primary-900/20 isolate text-white">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-96 h-96 bg-accent-500/30 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-80 h-80 bg-primary-600/40 rounded-full blur-[80px] pointer-events-none"></div>
      
      {/* Glassmorphism Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50 pointer-events-none"></div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-8">
        {/* Avatar Stack */}
        <div className="relative group shrink-0">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl relative bg-primary-800">
            <ProfileAvatar
              avatarUrl={profile.avatarUrl}
              name={profile.name}
              className="w-full h-full object-cover"
              iconSize="text-5xl"
            />
            {/* Edit overlay on hover */}
            <div 
              onClick={handlePencilClick}
              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm"
            >
              <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
            </div>
          </div>
          
          <div className="absolute -bottom-3 -right-3 bg-accent-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border-2 border-primary-900 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">stars</span>
            PRO
          </div>
        </div>

        {/* Profile Info */}
        <div className="flex-1 text-center md:text-left space-y-4">
          <div>
            <h1 className="font-headline-lg font-black text-4xl tracking-tight mb-2 flex items-center justify-center md:justify-start gap-3">
              {profile.name}
              <span className="material-symbols-outlined text-accent-400 text-3xl" title="Verified Scholar">verified</span>
            </h1>
            <p className="font-body-lg text-primary-100 text-lg max-w-2xl">
              {profile.course} | {profile.branch}
            </p>
          </div>

          {/* Quick Details Chips */}
          <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
            {profile.collegeName && (
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-medium border border-white/10">
                <span className="material-symbols-outlined text-accent-400 text-[18px]">school</span>
                {profile.collegeName}
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-medium border border-white/10">
              <span className="material-symbols-outlined text-accent-400 text-[18px]">location_on</span>
              {profile.collegeName ? 'Kolkata, India' : 'Campus Location'}
            </div>
            {profile.email && (
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-medium border border-white/10">
                <span className="material-symbols-outlined text-accent-400 text-[18px]">mail</span>
                {profile.email}
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <button 
            onClick={onEditClick}
            className="w-full md:w-auto bg-white text-primary-900 hover:bg-primary-50 font-semibold py-3 px-6 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">edit</span>
            Edit Profile
          </button>
          <button className="w-full md:w-auto bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-medium py-3 px-6 rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">share</span>
            Share Profile
          </button>
        </div>
      </div>
      
      {statusMessage && (
        <div className="absolute top-4 right-4 z-50">
          <div
            className={`text-sm px-4 py-2 rounded-lg font-medium shadow-lg backdrop-blur-md border ${
              statusMessage.isError
                ? 'bg-error-container/90 text-error border-error/30'
                : 'bg-green-500/90 text-white border-green-400/30'
            }`}
          >
            {statusMessage.text}
          </div>
        </div>
      )}
    </div>
  );
};
