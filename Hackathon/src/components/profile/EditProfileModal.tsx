import React, { useRef, useState } from 'react';
import type { UserProfile } from '../../mock/userProfile';
import { DEFAULT_AVATAR_URL } from '../../mock/userProfile';
import { ProfileAvatar } from './ProfileAvatar';

const BRANCHES = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
];

interface EditProfileModalProps {
  isOpen: boolean;
  profile: UserProfile;
  onClose: () => void;
  onSave: (updated: Partial<UserProfile>) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  profile,
  onClose,
  onSave,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: profile.name,
    course: profile.course,
    branch: profile.branch,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl || DEFAULT_AVATAR_URL,
    year: profile.year || '',
    semester: profile.semester || '',
    collegeName: profile.collegeName || '',
    universityRollNo: profile.universityRollNo || '',
    phoneNumber: profile.phoneNumber || '',
    dateOfBirth: profile.dateOfBirth || '',
    gender: profile.gender || '',
  });

  const branchOptions = [...BRANCHES];
  if (profile.branch && !BRANCHES.includes(profile.branch)) {
    branchOptions.unshift(profile.branch);
  }

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  if (!isOpen) return null;

  const showStatus = (text: string, isError = false) => {
    setStatusMessage({ text, isError });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

function compressProfileImage(file: File, maxDim = 512, quality = 0.80): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get 2D context from canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };

      img.onerror = () => reject(new Error('Failed to load image for processing'));
      img.src = event.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      showStatus('Invalid file type. Please select a JPG, PNG, or WebP image.', true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showStatus('File size exceeds 5MB limit. Please choose a smaller image.', true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    showStatus('Optimizing image preview...');
    try {
      const compressedUrl = await compressProfileImage(file, 512, 0.80);
      setFormData((prev) => ({ ...prev, avatarUrl: compressedUrl }));
      showStatus('Photo optimized successfully!');
    } catch (err) {
      console.error('Failed to compress image:', err);
      showStatus('Failed to process image file.', true);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, avatarUrl: DEFAULT_AVATAR_URL }));
    showStatus('Photo reset to default!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    // Validation
    if (!formData.name.trim()) {
      setError('Full Name is required');
      return;
    }

    if (formData.collegeName && formData.collegeName.trim() === '') {
      setError('College Name cannot consist only of whitespace.');
      return;
    }

    if (formData.universityRollNo && formData.universityRollNo.trim() === '') {
      setError('University Roll No cannot consist only of whitespace.');
      return;
    }

    if (formData.phoneNumber && formData.phoneNumber.trim() !== '') {
      const phoneRegex = /^(\+91)?\d{10}$/;
      if (!phoneRegex.test(formData.phoneNumber.trim())) {
        setError('Please enter a valid phone number.');
        return;
      }
    }

    if (formData.dateOfBirth && formData.dateOfBirth.trim() !== '') {
      const dobDate = new Date(formData.dateOfBirth);
      if (isNaN(dobDate.getTime())) {
        setError('Please enter a valid Date of Birth.');
        return;
      }
      if (dobDate > new Date()) {
        setError('Date of Birth cannot be in the future.');
        return;
      }
    }

    if (formData.gender && formData.gender !== '') {
      if (!['Male', 'Female', 'Prefer not to say'].includes(formData.gender)) {
        setError('Please select a valid gender.');
        return;
      }
    }

    setError('');
    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        name: formData.name.trim(),
        collegeName: formData.collegeName.trim(),
        universityRollNo: formData.universityRollNo.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        dateOfBirth: formData.dateOfBirth.trim(),
        gender: formData.gender,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const isCustomAvatar = formData.avatarUrl && formData.avatarUrl !== DEFAULT_AVATAR_URL;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-surface-container rounded-2xl w-full max-w-lg max-h-[90vh] border border-white/10 shadow-2xl overflow-hidden transform transition-all flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center flex-shrink-0">
          <h3 className="font-headline-md text-headline-md text-on-surface">Edit Profile</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 bg-error-container/40 border border-error/30 text-error rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Profile Photo Section */}
            <div className="flex items-center gap-4 p-3 bg-surface-variant/40 border border-white/5 rounded-xl">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-white/10 flex-shrink-0 bg-surface-container flex items-center justify-center">
                <ProfileAvatar
                  avatarUrl={formData.avatarUrl}
                  name={formData.name}
                  className="w-full h-full"
                  iconSize="text-2xl"
                />
              </div>
              <div className="flex-1 space-y-1">
                <div className="font-label-sm text-on-surface-variant">Profile Photo</div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isSaving}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSaving}
                    className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-xs">upload</span>
                    Change Photo
                  </button>
                  {isCustomAvatar && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={isSaving}
                      className="px-3 py-1.5 bg-error-container/30 hover:bg-error-container/50 border border-error/30 text-error text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-xs">delete</span>
                      Remove Photo
                    </button>
                  )}
                </div>
                {statusMessage && (
                  <p
                    className={`text-[11px] font-medium pt-1 ${
                      statusMessage.isError ? 'text-error' : 'text-primary'
                    }`}
                  >
                    {statusMessage.text}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block font-label-sm text-on-surface-variant mb-1">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isSaving}
                className="w-full bg-surface-variant border border-white/10 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-body-md disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block font-label-sm text-on-surface-variant mb-1">Student ID</label>
              <input
                type="text"
                disabled
                value={profile.studentId}
                className="w-full bg-surface/50 border border-white/5 rounded-lg px-4 py-2.5 text-on-surface-variant opacity-70 cursor-not-allowed font-body-md"
              />
            </div>

            <div>
              <label className="block font-label-sm text-on-surface-variant mb-1">College Name</label>
              <input
                type="text"
                value={formData.collegeName}
                placeholder="Enter your college name"
                onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                disabled={isSaving}
                className="w-full bg-surface-variant border border-white/10 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-body-md disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block font-label-sm text-on-surface-variant mb-1">University Roll No</label>
              <input
                type="text"
                value={formData.universityRollNo}
                placeholder="Enter university roll number"
                onChange={(e) => setFormData({ ...formData, universityRollNo: e.target.value })}
                disabled={isSaving}
                className="w-full bg-surface-variant border border-white/10 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-body-md disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-label-sm text-on-surface-variant mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  placeholder="Enter phone number"
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  disabled={isSaving}
                  className="w-full bg-surface-variant border border-white/10 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-body-md disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block font-label-sm text-on-surface-variant mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  disabled={isSaving}
                  className="w-full bg-surface-variant border border-white/10 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-body-md disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block font-label-sm text-on-surface-variant mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                disabled={isSaving}
                className="w-full bg-surface-variant border border-white/10 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-body-md cursor-pointer disabled:opacity-60"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-label-sm text-on-surface-variant mb-1">Course</label>
                <input
                  type="text"
                  value={formData.course}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                  disabled={isSaving}
                  className="w-full bg-surface-variant border border-white/10 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-body-md disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block font-label-sm text-on-surface-variant mb-1">Branch</label>
                <select
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  disabled={isSaving}
                  className="w-full bg-surface-variant border border-white/10 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-body-md cursor-pointer disabled:opacity-60"
                >
                  {branchOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-label-sm text-on-surface-variant mb-1">Year</label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  disabled={isSaving}
                  className="w-full bg-surface-variant border border-white/10 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-body-md cursor-pointer disabled:opacity-60"
                >
                  <option value="">Select Year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
              <div>
                <label className="block font-label-sm text-on-surface-variant mb-1">Semester</label>
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  disabled={isSaving}
                  className="w-full bg-surface-variant border border-white/10 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-body-md cursor-pointer disabled:opacity-60"
                >
                  <option value="">Select Semester</option>
                  <option value="Semester 1">Semester 1</option>
                  <option value="Semester 2">Semester 2</option>
                  <option value="Semester 3">Semester 3</option>
                  <option value="Semester 4">Semester 4</option>
                  <option value="Semester 5">Semester 5</option>
                  <option value="Semester 6">Semester 6</option>
                  <option value="Semester 7">Semester 7</option>
                  <option value="Semester 8">Semester 8</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-label-sm text-on-surface-variant mb-1">Bio</label>
              <textarea
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                disabled={isSaving}
                className="w-full bg-surface-variant border border-white/10 rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none font-body-md disabled:opacity-60"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-surface-container-high/50 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-lg font-body-md font-semibold text-on-surface-variant hover:bg-white/5 transition-colors border border-transparent disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-lg font-body-md font-semibold bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
