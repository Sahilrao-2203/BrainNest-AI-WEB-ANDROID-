import { type CurriculumTopic } from '../data/makautCurriculum';
import { progressService } from './progressService';
import { MOCK_EXAM_DEADLINES } from './plannerEngine';
import { getCurrentUserId } from '../mock/userProfile';
import { curriculumService } from './curriculumService';

export interface DynamicFocusArea {
  id: string;
  topicId: string;
  subjectCode: string;
  subjectName: string;
  subjectColor: 'primary' | 'tertiary' | 'outline' | 'error';
  scoreDisplay: string;
  scoreColor: 'error' | 'primary' | 'outline';
  title: string;
  description: string;
  actionType: 'practice' | 'notes';
  actionText: string;
  topic: CurriculumTopic;
}

const STORAGE_QUIZ_PREFIX = 'studyflow_quiz_scores_';

function getQuizStorageKey(userId?: string): string {
  const uid = userId || getCurrentUserId();
  return `${STORAGE_QUIZ_PREFIX}${uid}`;
}

export const focusAreaService = {
  getQuizScores(userId?: string): Record<string, number> {
    const key = getQuizStorageKey(userId);
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);

      // Legacy key fallback
      const legacyRaw = localStorage.getItem('studyflow_quiz_scores');
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if ((userId || getCurrentUserId()) === 'SF-2024-0892') {
          localStorage.setItem(key, JSON.stringify(parsed));
          return parsed;
        }
      }
      return {};
    } catch (e) {
      console.error('Failed to read quiz scores from storage:', e);
      return {};
    }
  },

  getQuizScore(topicId: string, userId?: string): number | null {
    const scores = this.getQuizScores(userId);
    const cleanId = topicId.replace(/^(task-|makaut-)/, '');
    if (scores[topicId] !== undefined) return scores[topicId];
    if (scores[cleanId] !== undefined) return scores[cleanId];
    return null;
  },

  saveQuizScore(topicId: string, scorePercentage: number, userId?: string): void {
    const activeUserId = userId || getCurrentUserId();
    const scores = this.getQuizScores(activeUserId);
    const cleanId = topicId.replace(/^(task-|makaut-)/, '');
    scores[topicId] = scorePercentage;
    scores[cleanId] = scorePercentage;
    try {
      const key = getQuizStorageKey(activeUserId);
      localStorage.setItem(key, JSON.stringify(scores));
    } catch (e) {
      console.error('Failed to save quiz score:', e);
    }
  },

  /**
   * Generates dynamic, personalized Focus Areas based on selected subject,
   * topic completion state, real quiz scores, and exam deadlines.
   */
  getDynamicFocusAreas(selectedSubjectCode: string = 'ES-CS201', userId?: string): DynamicFocusArea[] {
    const activeUserId = userId || getCurrentUserId();
    const subjects = curriculumService.getSubjectsSync();
    const topics = curriculumService.getTopicsSync();

    const subjectInfo =
      subjects.find((s) => s.code === selectedSubjectCode) || subjects[0] || { code: '', name: 'N/A', icon: 'menu_book', color: 'primary' };

    // Get curriculum topics for selected subject
    let candidateTopics = topics.filter(
      (t) => t.subjectCode === subjectInfo.code
    );

    // Fallback if subject has no topics
    if (candidateTopics.length === 0) {
      candidateTopics = topics;
    }

    const scoredAreas: Array<{ area: DynamicFocusArea; priorityScore: number }> = [];

    candidateTopics.forEach((topic) => {
      const isCompleted = progressService.isTopicCompleted(topic.id, activeUserId);
      const quizScore = this.getQuizScore(topic.id, activeUserId);
      const matchingDeadline = MOCK_EXAM_DEADLINES.find((d) => d.subjectCode === topic.subjectCode);

      // Skip completed topics unless quiz score is poor (< 60%)
      if (isCompleted && (quizScore === null || quizScore >= 60)) {
        return;
      }

      let priorityScore = 0;
      let scoreDisplay = 'Not Started';
      let scoreColor: 'error' | 'primary' | 'outline' = 'outline';
      let description = `Scheduled topic in ${topic.module}.`;
      let actionType: 'practice' | 'notes' = 'practice';
      let actionText = 'Generate Practice Set →';

      // Signal 1: Low Quiz Score (< 60%)
      if (quizScore !== null && quizScore < 60) {
        priorityScore += 100;
        scoreDisplay = `${quizScore}%`;
        scoreColor = 'error';
        description = `Recent quiz score is ${quizScore}%. Review and practice recommended.`;
        actionType = 'practice';
        actionText = 'Generate Practice Set →';
      }
      // Signal 2: Imminent Exam Deadline (<= 1 day)
      else if (matchingDeadline && matchingDeadline.daysRemaining <= 1) {
        priorityScore += 80;
        scoreDisplay = 'Exam Urgent';
        scoreColor = 'error';
        description = `${matchingDeadline.title} due tomorrow. Focus on core formulas & practice.`;
        actionType = 'notes';
        actionText = 'Review AI Notes →';
      }
      // Signal 3: High Priority Incomplete Topic
      else if (topic.priority === 'high') {
        priorityScore += 50;
        scoreDisplay = 'Not Started';
        scoreColor = 'primary';
        description = `High-priority core topic in ${topic.module}.`;
        actionType = 'practice';
        actionText = 'Generate Practice Set →';
      }
      // Signal 4: Medium Priority Incomplete Topic
      else {
        priorityScore += 20;
        scoreDisplay = 'Not Started';
        scoreColor = 'outline';
        description = `Foundational concept in ${topic.module}.`;
        actionType = 'notes';
        actionText = 'Review AI Notes →';
      }

      scoredAreas.push({
        priorityScore,
        area: {
          id: `focus-${topic.id}`,
          topicId: topic.id,
          subjectCode: topic.subjectCode,
          subjectName: topic.subject,
          subjectColor: topic.subjectColor,
          scoreDisplay,
          scoreColor,
          title: topic.topic,
          description,
          actionType,
          actionText,
          topic,
        },
      });
    });

    // Sort descending by priority score
    scoredAreas.sort((a, b) => b.priorityScore - a.priorityScore);

    // Return top 2 to 3 Focus Areas
    return scoredAreas.slice(0, 3).map((item) => item.area);
  },

  async fetchDynamicFocusAreas(selectedSubjectCode: string = 'ES-CS201', userId?: string): Promise<DynamicFocusArea[]> {
    const activeUserId = userId || getCurrentUserId();
    try {
      const res = await fetch(`/api/focus-areas?userId=${encodeURIComponent(activeUserId)}&subjectCode=${encodeURIComponent(selectedSubjectCode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.focusAreas) && data.focusAreas.length > 0) {
          return data.focusAreas;
        }
      }
    } catch (e) {
      // Fallback
    }
    return this.getDynamicFocusAreas(selectedSubjectCode, activeUserId);
  },
};

