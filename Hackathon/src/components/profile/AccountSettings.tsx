import React from 'react';
import type { UserProfile } from '../../mock/userProfile';
import { useAuth } from '../../context/AuthContext';

interface AccountSettingsProps {
  profile: UserProfile;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ profile }) => {
  const { logout } = useAuth();

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">

        <span className="material-symbols-outlined text-primary">manage_accounts</span>
        <h3 className="font-headline-sm font-bold text-gray-900">Account Settings</h3>
      </div>
      
      <div className="space-y-4 flex-1">
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <div>
            <div className="font-body-md font-semibold text-gray-900">Email Address</div>
            <div className="font-body-sm text-on-surface-variant">{profile.email || 'N/A'}</div>
          </div>
        </div>
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <div>
            <div className="font-body-md font-semibold text-gray-900">Password & Security</div>
            <div className="font-body-sm text-on-surface-variant">Update your password</div>
          </div>
          <button className="text-primary font-body-sm font-semibold hover:underline bg-transparent border-none cursor-pointer">
            Update
          </button>
        </div>
      </div>

      <div className="mt-6 pt-4">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-body-md font-semibold text-error hover:bg-error/10 transition-colors border border-error/30"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Sign Out
        </button>
      </div>
    </div>
  );
};
