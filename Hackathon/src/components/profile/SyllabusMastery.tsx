import React, { useEffect, useState } from 'react';
import { curriculumService, subscribeCurriculum } from '../../services/curriculumService';
import { progressService, getCanonicalTopicId, subscribeProgress } from '../../services/progressService';

export const SyllabusMastery: React.FC = () => {
  const [subjectProgress, setSubjectProgress] = useState<{ name: string, percentage: number }[]>([]);

  useEffect(() => {
    const calculateProgress = () => {
      const subjects = curriculumService.getSubjectsSync();
      const allTopics = curriculumService.getTopicsSync();
      const completedIds = progressService.getCompletedTopicIds();

      const progress = subjects.map(subject => {
        const subjectTopics = allTopics.filter(t => t.subject === subject.name);
        const total = subjectTopics.length;
        if (total === 0) return { name: subject.name, percentage: 0 };

        const completedCount = subjectTopics.filter(topic => {
          const cleanId = getCanonicalTopicId(topic.id);
          return completedIds.some((storedId) => {
            const canonical = getCanonicalTopicId(storedId);
            return storedId === topic.id || canonical === cleanId || storedId === cleanId;
          });
        }).length;

        return {
          name: subject.name,
          percentage: Math.round((completedCount / total) * 100)
        };
      });
      setSubjectProgress(progress.slice(0, 4)); // Take first 4 for display
    };

    calculateProgress();
    const unsub = subscribeProgress(calculateProgress);
    const unsubCurriculum = subscribeCurriculum(calculateProgress);
    return () => {
      unsub();
      unsubCurriculum();
    };
  }, []);


  if (subjectProgress.length === 0) {
    return (
      <div className="md:col-span-8 bg-white rounded-2xl p-6 shadow-sm border border-outline-variant flex flex-col justify-center items-center h-full min-h-[200px]">
        <span className="material-symbols-outlined text-gray-300 text-4xl mb-2">library_books</span>
        <p className="text-on-surface-variant text-sm">No syllabus data available.</p>
      </div>
    );
  }

  return (
    <div className="md:col-span-8 bg-white rounded-2xl p-6 shadow-sm border border-outline-variant flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <span className="material-symbols-outlined text-primary">school</span>
        <h3 className="font-headline-sm font-bold text-gray-900">Syllabus Mastery</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
        {subjectProgress.map((subj, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-body-md font-medium text-gray-800">{subj.name}</span>
              <span className="font-label-md text-on-surface-variant">{subj.percentage}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${subj.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
