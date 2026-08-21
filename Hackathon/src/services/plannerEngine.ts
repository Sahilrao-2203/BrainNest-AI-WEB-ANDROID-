import { type CurriculumTopic } from '../data/makautCurriculum';
import type { StudentMood } from './moodService';
import type { TaskItem } from '../mock/data';
import { curriculumService } from './curriculumService';

export interface ExamDeadline {
  id: string;
  subjectCode: string;
  subjectName: string;
  title: string;
  daysRemaining: number;
  isExam: boolean;
}

export interface PlannerResult {
  mood: StudentMood;
  selectedSubjectCode: string;
  selectedSubjectName: string;
  modeTitle: string;
  summaryNote: string;
  suggestedBreakText: string;
  tasks: TaskItem[];
  curriculumTopics: CurriculumTopic[];
}

export const MOCK_EXAM_DEADLINES: ExamDeadline[] = [
  {
    id: 'dl-1',
    subjectCode: 'ES-CS201',
    subjectName: 'Programming for Problem Solving',
    title: 'CSE Programming Mid-Term Exam',
    daysRemaining: 1, // Due tomorrow!
    isExam: true,
  },
  {
    id: 'dl-2',
    subjectCode: 'BS-CH201',
    subjectName: 'Chemistry - I',
    title: 'Thermodynamics & Equilibria Quiz',
    daysRemaining: 3,
    isExam: false,
  },
];

export const plannerEngine = {
  /**
   * Generates a Mood-Aware, Syllabus-Aware & Deadline-Aware Daily Plan
   * STRICTLY BOUNDED to the selected subject from the MAKAUT 1st Year B.Tech CSE Curriculum.
   */
  generateDailyPlan(
    mood: StudentMood,
    selectedSubjectCode: string = 'ES-CS201',
    _existingTasks: TaskItem[] = [],
    deadlines: ExamDeadline[] = MOCK_EXAM_DEADLINES
  ): PlannerResult {
    const subjects = curriculumService.getSubjectsSync();
    const topics = curriculumService.getTopicsSync();
    console.log('[PLANNER] available topics:', topics.length);

    // Look up subject details
    const subjectInfo =
      subjects.find((s) => s.code === selectedSubjectCode) || subjects[0] || { code: '', name: 'N/A', icon: 'menu_book', color: 'primary' };

    // PHASE 5 STRICT SUBJECT BOUNDARY: Filter curriculum ONLY for the selected subject
    const subjectTopics = topics.filter(
      (t) => t.subjectCode === subjectInfo.code
    );

    // Score topics ONLY within the selected subject
    const scoredTopics = subjectTopics.map((topic) => {
      let score = 0;

      // Mood Suitability Score
      if (topic.moodSuitability.includes(mood)) {
        score += 40;
      }

      // Difficulty Alignment Score
      if (mood === 'great') {
        if (topic.difficulty === 'hard') score += 35;
        if (topic.difficulty === 'medium') score += 15;
      } else if (mood === 'good') {
        if (topic.difficulty === 'medium') score += 30;
        if (topic.difficulty === 'hard') score += 20;
      } else if (mood === 'okay') {
        if (topic.difficulty === 'easy') score += 25;
        if (topic.difficulty === 'medium') score += 20;
        if (topic.difficulty === 'hard') score -= 15;
      } else if (mood === 'low') {
        if (topic.difficulty === 'easy') score += 35;
        if (topic.difficulty === 'hard') score -= 30;
      } else if (mood === 'sad') {
        if (topic.difficulty === 'easy') score += 40;
        if (topic.difficulty === 'hard') score -= 40;
      }

      // Deadline & Exam Urgency Score for this subject
      const matchingDeadline = deadlines.find((d) => d.subjectCode === topic.subjectCode);
      if (matchingDeadline) {
        if (matchingDeadline.daysRemaining <= 1) {
          // Imminent exam/deadline overrides general mood penalty!
          score += matchingDeadline.isExam ? 80 : 50;
        } else if (matchingDeadline.daysRemaining <= 3) {
          score += 30;
        }
      }

      // Priority bonus
      if (topic.priority === 'high') score += 15;

      return { topic, score, matchingDeadline };
    });

    // Sort topics descending by score
    scoredTopics.sort((a, b) => b.score - a.score);

    // Determine target task count and messaging based on mood
    let targetCount = 3;
    let modeTitle = 'Productive Mode';
    let summaryNote = `Focused exclusively on ${subjectInfo.name} (${subjectInfo.code}).`;
    let suggestedBreakText = 'Take a 10-min break between study sessions.';

    switch (mood) {
      case 'great':
        targetCount = 4;
        modeTitle = 'Challenge Mode';
        summaryNote = `High-cognitive ${subjectInfo.name} problem-solving & advanced topics.`;
        suggestedBreakText = 'Take a 10-min hydration break after completing 2 deep sessions.';
        break;
      case 'good':
        targetCount = 3;
        modeTitle = 'Productive Mode';
        summaryNote = `Balanced ${subjectInfo.name} core concepts & practice.`;
        suggestedBreakText = 'Take a 10-min break between topics.';
        break;
      case 'okay':
        targetCount = 3;
        modeTitle = 'Balanced Mode';
        summaryNote = `Core ${subjectInfo.name} concept revision & steady pace.`;
        suggestedBreakText = 'Take a 15-min break after every task.';
        break;
      case 'low':
        targetCount = 2;
        modeTitle = 'Light Mode';
        summaryNote = `Manageable ${subjectInfo.name} foundational concepts.`;
        suggestedBreakText = 'Take a 15–20 min rest between tasks. Gentle progress counts!';
        break;
      case 'sad':
        targetCount = 2;
        modeTitle = 'Gentle Mode';
        summaryNote = `Low-pressure, manageable ${subjectInfo.name} revision.`;
        suggestedBreakText = 'Take generous 20-min breaks. Take your time today.';
        break;
      case 'stressed':
        targetCount = 2;
        modeTitle = 'Priority Focus Mode';
        summaryNote = `Urgent ${subjectInfo.name} exam priorities in small, calm steps.`;
        suggestedBreakText = 'Breathe deeply. Focus on one small step at a time.';
        break;
    }

    // Select top N scored topics strictly from the subject
    const selectedScored = scoredTopics.slice(0, targetCount);
    const selectedCurriculumTopics = selectedScored.map((s) => s.topic);

    // Convert curriculum topics into TaskItems for the Daily Plan UI using CANONICAL TOPIC ID
    const generatedTasks: TaskItem[] = selectedScored.map((item) => {
      const { topic, matchingDeadline } = item;

      let displayTitle = topic.topic;
      let displaySubtitle = `${topic.module} • ${topic.estimatedDuration}`;

      if (mood === 'sad' && topic.difficulty === 'hard' && matchingDeadline) {
        displayTitle = `Review short notes for ${topic.topic}`;
        displaySubtitle = `Urgent Exam Prep (${topic.subjectCode}) • 15 min gentle step`;
      } else if (mood === 'stressed') {
        if (matchingDeadline) {
          displayTitle = `[Urgent Exam Prep] ${topic.topic}`;
          displaySubtitle = `Due ${matchingDeadline.daysRemaining === 1 ? 'Tomorrow' : 'in ' + matchingDeadline.daysRemaining + ' days'} • ${topic.estimatedDuration}`;
        } else {
          displayTitle = `Calm Focus: ${topic.topic}`;
          displaySubtitle = `${topic.module} • 15 min step`;
        }
      }

      return {
        id: topic.id, // STABLE CANONICAL TOPIC ID (e.g. cs-u1-1)
        title: displayTitle,
        subtitle: displaySubtitle,
        subject: topic.subjectCode,
        subjectColor: topic.subjectColor,
        completed: false, // Evaluated dynamically via progressService.isTopicCompleted(topic.id)
        priority: topic.priority,
        difficulty: topic.difficulty,
        estimatedDuration: topic.estimatedDuration,
        urgent: !!matchingDeadline && matchingDeadline.daysRemaining <= 1,
      };
    });

    return {
      mood,
      selectedSubjectCode: subjectInfo.code,
      selectedSubjectName: subjectInfo.name,
      modeTitle,
      summaryNote,
      suggestedBreakText,
      tasks: generatedTasks,
      curriculumTopics: selectedCurriculumTopics,
    };
  },
};
