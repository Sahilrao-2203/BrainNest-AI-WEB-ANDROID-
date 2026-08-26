import React from 'react';
import type { UserProfile } from '../../mock/userProfile';

interface AcademicIdentityProps {
  profile: UserProfile;
}

export const AcademicIdentity: React.FC<AcademicIdentityProps> = ({ profile }) => {
  const formatSemester = (sem?: string) => {
    if (!sem) return 'N/A';
    const s = sem.toString();
    if (s.endsWith('th') || s.endsWith('st') || s.endsWith('nd') || s.endsWith('rd')) return `${s} Semester`;
    return `${s}th Semester`;
  };

  return (
    <div className="md:col-span-4 bg-white rounded-2xl p-6 shadow-sm border border-outline-variant flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <span className="material-symbols-outlined text-primary">badge</span>
        <h4 className="font-headline-sm font-bold text-gray-900">Academic Identity</h4>
      </div>
      <div className="space-y-4 flex-1">
        <div className="flex justify-between items-center p-3 rounded-xl bg-surface-container-low">
          <span className="font-label-md text-on-surface-variant">Enrollment ID</span>
          <span className="font-body-md font-semibold text-gray-900">{profile.studentId || 'N/A'}</span>
        </div>
        <div className="flex justify-between items-center p-3 rounded-xl bg-surface-container-low">
          <span className="font-label-md text-on-surface-variant">Semester</span>
          <span className="font-body-md font-semibold text-gray-900">{formatSemester(profile.semester)}</span>
        </div>
        <div className="flex justify-between items-center p-3 rounded-xl bg-surface-container-low">
          <span className="font-label-md text-on-surface-variant">Branch</span>
          <span className="font-body-md font-semibold text-gray-900 text-right max-w-[150px] truncate" title={profile.branch || ''}>{profile.branch || 'N/A'}</span>
        </div>
        <div className="flex justify-between items-center p-3 rounded-xl bg-surface-container-low">
          <span className="font-label-md text-on-surface-variant">Batch Year</span>
          <span className="font-body-md font-semibold text-gray-900">{profile.year || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
};
