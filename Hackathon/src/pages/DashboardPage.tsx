import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { GlassCard } from '../components/ui/GlassCard';
import { ProgressRing } from '../components/ui/ProgressRing';
import { Checkbox } from '../components/ui/Checkbox';
import { Badge } from '../components/ui/Badge';
import { MOCK_TASKS, type TaskItem } from '../mock/data';
import { aiService } from '../services/aiService';
import { useDailyMood, MOOD_OPTIONS, type StudentMood } from '../services/moodService';
import { useUserProfile, useStudyProgress, useStudyStats } from '../mock/userProfile';
import { ProfileAvatar } from '../components/profile/ProfileAvatar';
import { progressService } from '../services/progressService';
import { focusAreaService, type DynamicFocusArea } from '../services/focusAreaService';
import { MoodCheckInModal } from '../components/dashboard/MoodCheckInModal';
import { MoodBadgeIndicator } from '../components/dashboard/MoodBadgeIndicator';
import { SubjectSelectorDropdown } from '../components/dashboard/SubjectSelectorDropdown';
import { curriculumService, subscribeCurriculum } from '../services/curriculumService';
import { SyllabusUploadModal } from '../components/dashboard/SyllabusUploadModal';
import { notifyProgressListeners } from '../services/progressService';
import { useEffect } from 'react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentMood, selectedSubjectCode, isCheckInNeeded, selectMood, selectSubject } =
    useDailyMood();
  const { profile, startStudySession } = useUserProfile();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [curriculumVersion, setCurriculumVersion] = useState(0);

  useEffect(() => {
    return subscribeCurriculum(() => {
      setCurriculumVersion((v) => v + 1);
      try {
        notifyProgressListeners();
      } catch (e) {}
    });
  }, []);

  const hasCustom = curriculumService.hasCustomSyllabus();
  const syllabus = curriculumService.getCustomSyllabus();
  const courseStr = hasCustom && syllabus ? syllabus.course : (profile?.course || 'B.Tech');
  const branchStr = hasCustom && syllabus ? (syllabus.branch.includes('Computer Science') ? 'CSE' : syllabus.branch) : (profile?.branch ? (profile.branch.includes('Computer Science') ? 'CSE' : profile.branch) : 'CSE');
  const yearStr = hasCustom && syllabus ? syllabus.year : (profile?.year || '1st Year');
  const hasCurriculumData = hasCustom;

  console.log(`[DASHBOARD] hasCustom: ${hasCustom}`);
  console.log(`[DASHBOARD] subjects: ${curriculumService.getSubjectsSync().length}`);
  console.log(`[DASHBOARD] topics: ${curriculumService.getTopicsSync().length}`);
  const { completedCount, totalCount, percentage } = useStudyProgress();
  const { hoursStudied, streakDays } = useStudyStats();

  const currentMoodObj = !isCheckInNeeded && currentMood
    ? MOOD_OPTIONS.find((m) => m.id === currentMood)
    : null;

  const [isModalOpen, setIsModalOpen] = useState<boolean>(isCheckInNeeded);
  const [tasks, setTasks] = useState<TaskItem[]>(MOCK_TASKS);

  // Generate MAKAUT Syllabus + Deadline + Mood aware Daily Plan bounded strictly to selectedSubjectCode
  const plannerResult = aiService.adaptDailyPlanWithMood(
    currentMood || 'good',
    selectedSubjectCode || 'ES-CS201',
    tasks
  );

  // Generate personalized dynamic Focus Areas derived from real student signals
  const dynamicFocusAreas = focusAreaService.getDynamicFocusAreas(selectedSubjectCode || 'ES-CS201');

  const toggleTask = (id: string) => {
    progressService.toggleTopicCompleted(id);
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task))
    );
  };

  const handleSelectMoodAndSubject = (mood: StudentMood, subjectCode: string) => {
    selectMood(mood, subjectCode);
    setIsModalOpen(false);
  };

  const handleGetStarted = (task: TaskItem) => {
    startStudySession({
      topicId: task.id,
      topicTitle: task.title,
      subjectName: plannerResult.selectedSubjectName,
      subjectCode: task.subject,
      module: task.subtitle.split('•')[0].trim(),
      semester: 1,
      duration: task.estimatedDuration || '30 mins',
      mood: currentMood || 'good',
      completed: progressService.isTopicCompleted(task.id),
    });
    navigate(`/topic-companion/${encodeURIComponent(task.id)}`, {
      state: { task, subjectName: plannerResult.selectedSubjectName },
    });
  };

  const handleFocusAreaAction = (area: DynamicFocusArea) => {
    startStudySession({
      topicId: area.topicId,
      topicTitle: area.title,
      subjectName: area.subjectName,
      subjectCode: area.subjectCode,
      module: area.topic.module,
      semester: 1,
      duration: area.topic.estimatedDuration || '30 mins',
      mood: currentMood || 'good',
      completed: progressService.isTopicCompleted(area.topicId),
    });

    if (area.actionType === 'practice') {
      aiService.generatePracticeSet(area.title);
    }
    navigate(`/topic-companion/${encodeURIComponent(area.topicId)}`, {
      state: { area },
    });
  };

  const remainingTasks = plannerResult.tasks.filter(
    (t) => !progressService.isTopicCompleted(t.id)
  ).length;

  return (
    <AppShell>
      {/* Syllabus Upload Modal */}
      <SyllabusUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onConfirm={() => {
          setIsModalOpen(true);
        }}
      />

      {/* 2-Step Onboarding Check-In Modal (Mood + Subject) */}
      <MoodCheckInModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectMoodAndSubject={handleSelectMoodAndSubject}
      />

      <div className="pt-24 md:pt-12 pb-32 px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-6">
          <div>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">
              Welcome back, {profile?.name || 'Student'}.
            </h1>
            <p className="text-on-surface-variant">
              {courseStr} {branchStr} {yearStr} • {hasCustom ? 'Uploaded Syllabus' : 'No Syllabus'} & Deadline-Aware Daily Overview
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface border border-white/10 hover:border-white/20 font-semibold text-sm rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">upload_file</span>
              <span>Upload Syllabus</span>
            </button>
            {!isCheckInNeeded && currentMood && (
              <MoodBadgeIndicator mood={currentMood} onEditMood={() => setIsModalOpen(true)} />
            )}

            <div className="hidden md:flex items-center gap-3 border-l border-outline-variant/30 pl-4">
              <button
                aria-label="Notifications"
                className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-surface-dim transition-colors relative"
              >
                <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full"></span>
              </button>
              <div className="h-10 w-10 rounded-full border-2 border-primary-container overflow-hidden flex items-center justify-center">
                <ProfileAvatar
                  avatarUrl={profile?.avatarUrl}
                  name={profile?.name || 'Student'}
                  className="w-full h-full"
                  iconSize="text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Dynamic Study Progress Widget */}
          <GlassCard className="p-panel-padding progress-widget flex flex-col items-center justify-center relative overflow-hidden group">
            <h2 className="font-headline-md text-headline-md text-on-surface w-full text-left mb-6">
              Study Progress
            </h2>
            <ProgressRing percentage={percentage} />
            <div className="mt-3 text-xs text-on-surface-variant/90 font-medium bg-surface-container/60 px-3 py-1 rounded-full border border-white/10">
              {completedCount} / {totalCount} topics completed
            </div>
            <div className="mt-6 flex justify-between w-full text-sm">
              <div className="text-center">
                <div className="text-on-surface-variant mb-1">Hours Studied</div>
                <div className="text-primary font-semibold text-lg">{hoursStudied}</div>
              </div>
              <div className="text-center">
                <div className="text-on-surface-variant mb-1">Streak</div>
                <div className="text-primary font-semibold text-lg">{streakDays}</div>
              </div>
            </div>
          </GlassCard>

          {/* Daily Plan Widget */}
          <GlassCard key={curriculumVersion} className="p-panel-padding plan-widget flex flex-col hover:border-white/40 transition-colors duration-300">
            {hasCurriculumData ? (
              <>
                <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <h2 className="font-headline-md text-headline-md text-on-surface">Daily Plan</h2>
                      {currentMoodObj && (
                        <span className="text-xl leading-none select-none" title={`Current Mood: ${currentMoodObj.title}`}>
                          {currentMoodObj.emoji}
                        </span>
                      )}
                    </div>
                    {/* Active Subject Selector Dropdown */}
                    <SubjectSelectorDropdown
                      selectedSubjectCode={plannerResult.selectedSubjectCode}
                      onSelectSubject={(code) => selectSubject(code)}
                    />
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-medium">
                      {plannerResult.modeTitle}
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm px-3 py-1 bg-surface-container rounded-full text-on-surface-variant">
                    {remainingTasks} Tasks Remaining
                  </span>
                </div>

                {plannerResult.summaryNote && (
                  <p className="text-xs text-on-surface-variant mb-4 font-medium">
                    {plannerResult.summaryNote}
                  </p>
                )}

                {/* Task List - strictly bounded to selected subject with Get Started button */}
                <div className="flex flex-col gap-3 flex-grow justify-center">
                  {plannerResult.tasks.map((task) => {
                    const isDone = progressService.isTopicCompleted(task.id);
                    return (
                      <div
                        key={task.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-surface-container-high/50 border border-outline-variant/30 hover:bg-surface-container-high transition-colors ${isDone ? 'opacity-60' : ''
                          }`}
                      >
                        <label className="flex items-center gap-4 cursor-pointer min-w-0 flex-1">
                          <Checkbox
                            checked={isDone}
                            onChange={() => toggleTask(task.id)}
                          />
                          <div className={`flex flex-col flex-1 min-w-0 ${isDone ? 'line-through' : ''}`}>
                            <div className="flex items-center gap-2">
                              <span className="text-on-surface font-medium truncate">{task.title}</span>
                              {task.urgent && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-error/20 text-error border border-error/30 uppercase font-semibold shrink-0">
                                  Exam Urgent
                                </span>
                              )}
                            </div>
                            <span className="text-on-surface-variant text-xs truncate">{task.subtitle}</span>
                          </div>
                        </label>
 
                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                          <Badge variant={task.subjectColor} className="shrink-0">
                            {task.subject}
                          </Badge>
                          <button
                            type="button"
                            onClick={() => handleGetStarted(task)}
                            className="bg-primary text-on-primary hover:bg-primary/90 font-semibold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all active:scale-95 shadow-sm shrink-0"
                          >
                            <span>Get Started</span>
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
 
                {/* Mood Break Recommendation */}
                {plannerResult.suggestedBreakText && (
                  <div className="mt-4 pt-3 border-t border-outline-variant/30 flex items-center gap-2 text-xs text-on-surface-variant/80">
                    <span className="material-symbols-outlined text-sm text-tertiary">spa</span>
                    <span>{plannerResult.suggestedBreakText}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-6 bg-surface-container-high/30 border border-outline-variant/20 rounded-xl">
                <span className="material-symbols-outlined text-primary text-4xl mb-3">
                  menu_book
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">
                  No syllabus uploaded
                </h3>
                <p className="text-sm text-on-surface-variant max-w-md mb-4">
                  Upload your syllabus to see your subjects here.
                </p>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="mb-4 px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 font-semibold text-sm rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">upload_file</span>
                  <span>Upload Syllabus</span>
                </button>
                <div className="p-3.5 bg-surface-variant/40 rounded-lg text-xs text-on-surface-variant border border-white/5 w-full text-left space-y-1">
                  <div><strong>Selected Course:</strong> {profile?.course || 'N/A'}</div>
                  <div><strong>Selected Branch:</strong> {profile?.branch || 'N/A'}</div>
                  <div><strong>Selected Year:</strong> {profile?.year || 'N/A'}</div>
                  <div><strong>Selected Semester:</strong> {profile?.semester || 'N/A'}</div>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Dynamic Focus Areas Widget */}
          <GlassCard key={`focus-${curriculumVersion}`} className="p-panel-padding weak-widget mt-4">
            <div className="flex items-center gap-2 mb-6">
              <span
                className="material-symbols-outlined text-error"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                warning
              </span>
              <h2 className="font-headline-md text-headline-md text-on-surface">Focus Areas</h2>
            </div>

            {hasCurriculumData ? (
              dynamicFocusAreas.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {dynamicFocusAreas.map((area) => (
                    <div
                      key={area.id}
                      className={`bg-surface-container-high rounded-lg p-4 border flex flex-col justify-between gap-3 transition-colors ${area.scoreColor === 'error'
                        ? 'border-error/30 bg-error/5'
                        : 'border-outline-variant/30'
                        }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant={area.subjectColor}>{area.subjectCode}</Badge>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded ${area.scoreColor === 'error'
                              ? 'bg-error/20 text-error border border-error/30'
                              : 'bg-primary/20 text-primary border border-primary/30'
                              }`}
                          >
                            {area.scoreDisplay}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-on-surface line-clamp-1">{area.title}</h3>
                        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{area.description}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleFocusAreaAction(area)}
                        className="text-xs text-primary hover:text-primary-fixed text-left font-semibold transition-colors flex items-center gap-1 mt-1"
                      >
                        <span>{area.actionText}</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-surface-container-high/50 rounded-xl p-8 border border-outline-variant/20 text-center flex flex-col items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-3xl">check_circle</span>
                  <p className="text-sm text-on-surface font-medium">All active topics for this subject are complete!</p>
                  <p className="text-xs text-on-surface-variant">Great job keeping up with your study plan.</p>
                </div>
              )
            ) : (
              <div className="bg-surface-container-high/50 rounded-xl p-8 border border-outline-variant/20 text-center flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant/40 text-3xl">info</span>
                <p className="text-sm text-on-surface font-medium">Focus Areas Not Available</p>
                <p className="text-xs text-on-surface-variant">Upload your syllabus to see personalized dynamic focus areas.</p>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </AppShell>
  );
};
