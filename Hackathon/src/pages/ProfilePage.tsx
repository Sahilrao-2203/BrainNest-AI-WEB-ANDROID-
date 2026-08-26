import React, { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileStats } from '../components/profile/ProfileStats';
import { AIPreferencesSection } from '../components/profile/AIPreferencesSection';
import { AcademicIdentity } from '../components/profile/AcademicIdentity';
import { AccountSettings } from '../components/profile/AccountSettings';
import { SyllabusMastery } from '../components/profile/SyllabusMastery';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { useUserProfile } from '../mock/userProfile';

export const ProfilePage: React.FC = () => {
  const { profile, aiSettings, updateProfile, updateAiSettings } = useUserProfile();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleSaveProfile = async (updated: Partial<typeof profile>) => {
    try {
      await updateProfile(updated);
      showToast('Profile updated successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile.');
      throw err;
    }
  };

  const handleAiSettingsChange = (updated: Partial<typeof aiSettings>) => {
    updateAiSettings(updated);
    showToast('AI Companion settings updated!');
  };

  return (
    <AppShell>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[100] bg-surface-container-high border border-tertiary/40 text-tertiary px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          <span className="font-label-sm">{toastMessage}</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32 space-y-8">
        
        {/* Section 1: Profile Header */}
        <ProfileHeader profile={profile} onEditClick={() => setIsEditModalOpen(true)} />

        {/* Bento Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <AcademicIdentity profile={profile} />
          <ProfileStats />
          
          <SyllabusMastery />
          
          <div className="md:col-span-4 flex flex-col gap-6">
            <div className="flex-1">
              <AccountSettings profile={profile} />
            </div>
          </div>
          
          {/* AI Preferences spanning full width for bottom row */}
          <div className="md:col-span-12">
            <AIPreferencesSection settings={aiSettings} onChange={handleAiSettingsChange} />
          </div>
        </div>

      </main>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        profile={profile}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveProfile}
      />
    </AppShell>
  );
};
