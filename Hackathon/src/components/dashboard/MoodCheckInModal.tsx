import React, { useState, useEffect } from 'react';
import { MOOD_OPTIONS, type StudentMood } from '../../services/moodService';
import { useUserProfile } from '../../mock/userProfile';
import { curriculumService } from '../../services/curriculumService';

interface MoodCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMoodAndSubject: (mood: StudentMood, subjectCode: string) => void;
}

export const MoodCheckInModal: React.FC<MoodCheckInModalProps> = ({
  isOpen,
  onClose,
  onSelectMoodAndSubject,
}) => {
  const { profile } = useUserProfile();
  const syllabus = curriculumService.getCustomSyllabus();
  const courseStr = profile?.course || 'B.Tech';
  const branchStr = profile?.branch ? (profile.branch.includes('Computer Science') ? 'CSE' : profile.branch) : 'CSE';
  const yearStr = profile?.year || '1st Year';
  const hasCurriculumData = curriculumService.hasCustomSyllabus();
  const availableSubjects = curriculumService.getSubjectsSync();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedMood, setSelectedMood] = useState<StudentMood | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (availableSubjects.length > 0 && (!selectedSubject || !availableSubjects.some((s) => s.code === selectedSubject))) {
      setSelectedSubject(availableSubjects[0].code);
    }
  }, [availableSubjects, selectedSubject]);

  if (!isOpen) return null;

  const handleNextStep = () => {
    if (!selectedMood) return;
    if (!hasCurriculumData) {
      onSelectMoodAndSubject(selectedMood, '');
      return;
    }
    setStep(2);
  };

  const handleGeneratePlan = () => {
    if (!selectedMood || !selectedSubject) return;
    setIsSubmitting(true);
    setTimeout(() => {
      onSelectMoodAndSubject(selectedMood, selectedSubject);
      setIsSubmitting(false);
      onClose();
    }, 500);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mood-modal-title"
    >
      <div className="bg-surface-container rounded-lg w-full max-w-xl border border-white/15 shadow-2xl overflow-hidden transform transition-all">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-label-sm text-xs px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-semibold">
                Step {step} of 2
              </span>
              <span className="font-label-sm text-xs text-on-surface-variant/70">
                {syllabus?.course || courseStr} {syllabus?.branch || branchStr} {syllabus?.year || yearStr}
              </span>
            </div>
            <h2
              id="mood-modal-title"
              className="font-headline-md text-headline-md text-on-surface mb-1"
            >
              {step === 1 ? 'How are you feeling today?' : 'Which subject would you like to study?'}
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {step === 1
                ? "Select your current mood to personalize today's learning experience."
                : 'Select ONE subject to set a strict topic boundary for today.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        {step === 1 ? (
          /* STEP 1: Mood Options */
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
            {MOOD_OPTIONS.map((opt) => {
              const isSelected = selectedMood === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedMood(opt.id)}
                  className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition-all duration-200 ${isSelected
                      ? 'bg-primary-container/60 border-primary shadow-[0_0_20px_rgba(185,199,228,0.2)] scale-[1.02]'
                      : 'bg-surface-variant/40 border-white/10 hover:bg-surface-variant/80 hover:border-white/20'
                    }`}
                >
                  <span className="text-2xl select-none" role="img" aria-label={opt.title}>
                    {opt.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-body-md font-semibold text-on-surface flex items-center gap-1.5 text-sm">
                      {opt.title}
                      {isSelected && (
                        <span className="material-symbols-outlined text-primary text-xs">
                          check_circle
                        </span>
                      )}
                    </div>
                    <div className="font-body-sm text-xs text-on-surface-variant truncate">
                      {opt.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* STEP 2: Subject Selection */
          <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
            {availableSubjects.map((subj) => {
              const isSelected = selectedSubject === subj.code;
              return (
                <button
                  key={subj.code}
                  type="button"
                  onClick={() => setSelectedSubject(subj.code)}
                  className={`w-full text-left p-4 rounded-xl border flex items-center justify-between gap-4 transition-all duration-200 ${isSelected
                      ? 'bg-primary-container/60 border-primary shadow-[0_0_20px_rgba(185,199,228,0.2)]'
                      : 'bg-surface-variant/40 border-white/10 hover:bg-surface-variant/80 hover:border-white/20'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-primary border border-white/10">
                      <span className="material-symbols-outlined text-xl">{subj.icon}</span>
                    </div>
                    <div>
                      <div className="font-body-md font-semibold text-on-surface flex items-center gap-2">
                        {subj.name}
                        <span className="text-xs px-2 py-0.5 rounded bg-surface border border-white/10 font-mono text-on-surface-variant">
                          {subj.code}
                        </span>
                      </div>
                      <div className="text-xs text-on-surface-variant">
                        Semester {subj.semester} • {syllabus?.course || courseStr} {syllabus?.branch || branchStr}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="material-symbols-outlined text-primary text-lg">
                      check_circle
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-surface-container-high/50 flex items-center justify-between gap-3">
          <span className="font-label-sm text-xs text-on-surface-variant/70">
            {step === 1 ? 'Resets daily' : 'Strict topic boundary enforced'}
          </span>
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl font-body-md text-sm font-semibold text-on-surface-variant hover:bg-white/5 transition-colors"
              >
                Back
              </button>
            )}
            {step === 1 ? (
              <button
                type="button"
                disabled={!selectedMood}
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl font-body-md text-sm font-semibold bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-lg flex items-center gap-2"
              >
                Next: Select Subject →
              </button>
            ) : (
              <button
                type="button"
                disabled={!selectedSubject || isSubmitting}
                onClick={handleGeneratePlan}
                className="px-6 py-2.5 rounded-xl font-body-md text-sm font-semibold bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-lg flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                    Generating Plan...
                  </>
                ) : (
                  'Generate Study Plan'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
