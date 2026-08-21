import React, { useState, useRef, useEffect } from 'react';
import { useUserProfile } from '../../mock/userProfile';
import { curriculumService, subscribeCurriculum } from '../../services/curriculumService';

interface SubjectSelectorDropdownProps {
  selectedSubjectCode: string;
  onSelectSubject: (code: string) => void;
}

export const SubjectSelectorDropdown: React.FC<SubjectSelectorDropdownProps> = ({
  selectedSubjectCode,
  onSelectSubject,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [curriculumVersion, setCurriculumVersion] = useState(0);

  useEffect(() => {
    return subscribeCurriculum(() => {
      setCurriculumVersion((v) => v + 1);
    });
  }, []);

  const { profile } = useUserProfile();
  const syllabus = curriculumService.getCustomSyllabus();
  
  // Extract dynamic semester display label
  const syllabusSem = syllabus?.semester || '';
  const semesterDisplay = syllabusSem
    ? (typeof syllabusSem === 'string' && syllabusSem.toLowerCase().includes('semester') ? syllabusSem : `Semester ${syllabusSem}`)
    : (profile?.semester ? profile.semester : 'Semester 1');

  const availableSubjects = curriculumService.getSubjectsSync();

  const activeSubject =
    availableSubjects.find((s) => s.code === selectedSubjectCode) || availableSubjects[0] || { code: '', name: 'Select Subject', icon: 'menu_book', color: 'primary' };

  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.some((s) => s.code === selectedSubjectCode)) {
      onSelectSubject(availableSubjects[0].code);
    }
  }, [availableSubjects, selectedSubjectCode, onSelectSubject]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div key={curriculumVersion} className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3.5 py-1.5 rounded-lg bg-surface-variant/60 border border-white/10 hover:bg-surface-variant hover:border-white/20 text-on-surface font-body-md text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
      >
        <span className="material-symbols-outlined text-primary text-base">
          {activeSubject.icon}
        </span>
        <span className="truncate max-w-[200px] md:max-w-none">{activeSubject.name}</span>
        <span className="text-xs font-mono text-on-surface-variant bg-surface px-1.5 py-0.5 rounded border border-white/5">
          {activeSubject.code}
        </span>
        <span className="material-symbols-outlined text-sm text-on-surface-variant">
          expand_more
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 md:w-80 rounded-xl bg-surface-container-high border border-white/15 shadow-2xl z-50 overflow-hidden py-1 animate-fade-in">
          <div className="px-3 py-2 border-b border-white/10 text-xs font-label-sm uppercase tracking-wider text-on-surface-variant/70">
            Select Active Subject ({semesterDisplay})
          </div>
          <div className="max-h-64 overflow-y-auto">
            {availableSubjects.map((subj) => {
              const isSelected = subj.code === selectedSubjectCode;
              return (
                <button
                  key={subj.code}
                  type="button"
                  onClick={() => {
                    onSelectSubject(subj.code);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 flex items-center justify-between text-sm transition-colors ${
                    isSelected
                      ? 'bg-primary-container/60 text-primary font-semibold'
                      : 'text-on-surface hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="material-symbols-outlined text-base text-primary/80">
                      {subj.icon}
                    </span>
                    <span className="truncate">{subj.name}</span>
                  </div>
                  <span className="text-xs font-mono text-on-surface-variant shrink-0 ml-2">
                    {subj.code}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
