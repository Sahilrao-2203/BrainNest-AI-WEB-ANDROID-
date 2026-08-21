import React, { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileStats } from '../components/profile/ProfileStats';
import { LearningPreferencesSection } from '../components/profile/LearningPreferencesSection';
import { AIPreferencesSection } from '../components/profile/AIPreferencesSection';
import { AchievementsSection } from '../components/profile/AchievementsSection';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { useUserProfile } from '../mock/userProfile';

export const ProfilePage: React.FC = () => {
  const { profile, preferences, aiSettings, updateProfile, updatePreferences, updateAiSettings } =
    useUserProfile();

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

  const handlePreferenceChange = (updated: Partial<typeof preferences>) => {
    updatePreferences(updated);
    showToast('Preferences updated!');
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

      <main className="max-w-5xl mx-auto px-margin-mobile md:px-margin-desktop pt-24 md:pt-12 pb-32 md:pb-16 space-y-12 md:space-y-16">
        {/* Section 1: Profile Header */}
        <ProfileHeader profile={profile} onEditClick={() => setIsEditModalOpen(true)} />

        {/* Section 2: Learning Stats */}
        <ProfileStats />

        {/* Section 3: Learning Preferences */}
        <LearningPreferencesSection
          preferences={preferences}
          onChange={handlePreferenceChange}
        />

        {/* Section 4: AI Preferences */}
        <AIPreferencesSection settings={aiSettings} onChange={handleAiSettingsChange} />

        {/* Section 5: Achievements */}
        <AchievementsSection />
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
