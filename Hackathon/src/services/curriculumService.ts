import { type MakautSubject, type CurriculumTopic } from '../data/makautCurriculum';
import { getCurrentUserId } from '../mock/userProfile';

const STORAGE_SYLLABUS_PREFIX = 'studyflow_custom_syllabus_';

const listeners = new Set<() => void>();

export function notifyCurriculumListeners() {
  listeners.forEach((listener) => listener());
}

export function subscribeCurriculum(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let cachedSubjects: MakautSubject[] | null = null;
let cachedTopics: CurriculumTopic[] | null = null;

// Helpers
const norm = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/and/g, '');
const extractNum = (str?: string) => {
  const m = (str || '').match(/\d+/);
  return m ? m[0] : '';
};

// Profile matching normalization check
export function checkProfileMatch(syllabus: any, profile: any): boolean {
  if (!syllabus || !profile) return false;

  const syllabusCourse = norm(syllabus.course);
  const profileCourse = norm(profile.course);

  const syllabusBranch = norm(syllabus.branch);
  const profileBranch = norm(profile.branch);

  const syllabusYear = extractNum(syllabus.year);
  const profileYear = extractNum(profile.year);

  const syllabusSem = extractNum(syllabus.semester);
  const profileSem = extractNum(profile.semester);

  // All four must match
  const courseMatch = syllabusCourse === profileCourse;
  const branchMatch = syllabusBranch === profileBranch;
  const yearMatch = syllabusYear === profileYear;
  const semMatch = syllabusSem === profileSem;

  return courseMatch && branchMatch && yearMatch && semMatch;
}

// Convert raw syllabus structure into flat subjects & topics
function transformSyllabus(syllabus: any): { subjects: MakautSubject[]; topics: CurriculumTopic[] } {
  if (!syllabus || !Array.isArray(syllabus.subjects)) {
    return { subjects: [], topics: [] };
  }

  const subjects: MakautSubject[] = [];
  const topics: CurriculumTopic[] = [];
  const semNumber = parseInt(extractNum(syllabus.semester), 10) || 1;

  const getSubjectIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('math')) return 'calculate';
    if (n.includes('physics')) return 'blur_on';
    if (n.includes('chemistry')) return 'science';
    if (n.includes('programming') || n.includes('computer') || n.includes('coding')) return 'code';
    if (n.includes('english') || n.includes('communication')) return 'translate';
    if (n.includes('electrical')) return 'electrical_services';
    if (n.includes('graphic') || n.includes('drawing')) return 'draw';
    return 'menu_book';
  };

  const getSubjectColor = (idx: number) => {
    const colors = ['primary', 'secondary', 'tertiary', 'error', 'info', 'warning'];
    return colors[idx % colors.length] as any;
  };

  syllabus.subjects.forEach((s: any, subIdx: number) => {
    const code = s.code || `SUBJ-${subIdx + 1}`;
    subjects.push({
      code,
      name: s.name,
      semester: semNumber,
      icon: getSubjectIcon(s.name),
      color: getSubjectColor(subIdx)
    });

    if (Array.isArray(s.units)) {
      s.units.forEach((u: any, unitIdx: number) => {
        if (Array.isArray(u.topics)) {
          u.topics.forEach((topicObj: any, topicIdx: number) => {
            const topicName = typeof topicObj === 'string' ? topicObj : (topicObj.name || '');
            const subtopicsList = (topicObj && Array.isArray(topicObj.subtopics))
              ? topicObj.subtopics.join(', ')
              : '';

            topics.push({
              id: `custom-${code}-${unitIdx}-${topicIdx}`,
              subject: s.name,
              subjectCode: code,
              semester: semNumber,
              module: u.name || `Unit ${unitIdx + 1}`,
              topic: topicName,
              subtopic: subtopicsList,
              difficulty: topicIdx % 3 === 0 ? 'easy' : (topicIdx % 3 === 1 ? 'medium' : 'hard'),
              moodSuitability: ['low', 'sad', 'okay', 'good', 'great', 'stressed'],
              learningType: topicIdx % 2 === 0 ? 'learning' : 'practice',
              priority: topicIdx % 2 === 0 ? 'high' : 'medium',
              subjectColor: getSubjectColor(subIdx),
              estimatedDuration: '30 mins'
            });
          });
        }
      });
    }
  });

  console.log(`[SYLLABUS] Parsed subjects: ${subjects.length}`);
  console.log(`[SYLLABUS] Parsed topics: ${topics.length}`);
  return { subjects, topics };
}

export const curriculumService = {
  getCustomSyllabus(userId?: string): any {
    const uid = userId || getCurrentUserId();
    const customKey = `${STORAGE_SYLLABUS_PREFIX}${uid}`;
    try {
      const raw = localStorage.getItem(customKey);
      if (raw) {
        const syllabus = JSON.parse(raw);
        console.log('[SYLLABUS] Retrieved syllabus:', syllabus);
        return syllabus;
      }
    } catch (e) {
      console.error('Failed to parse cached custom syllabus:', e);
    }
    console.log('[SYLLABUS] Retrieved syllabus: null');
    return null;
  },

  getSubjectsSync(userId?: string): MakautSubject[] {
    const uid = userId || getCurrentUserId();
    const syllabus = this.getCustomSyllabus(uid);

    if (syllabus) {
      if (cachedSubjects) {
        console.log('[SYLLABUS] Retrieved subjects (cached):', cachedSubjects.length);
        return cachedSubjects;
      }
      const { subjects } = transformSyllabus(syllabus);
      cachedSubjects = subjects;
      console.log('[SYLLABUS] Retrieved subjects:', subjects.length);
      return subjects;
    }

    console.log('[SYLLABUS] Retrieved subjects: 0 (no syllabus)');
    return [];
  },

  getTopicsSync(userId?: string): CurriculumTopic[] {
    const uid = userId || getCurrentUserId();
    const syllabus = this.getCustomSyllabus(uid);

    if (syllabus) {
      if (cachedTopics) {
        console.log('[SYLLABUS] Retrieved topics (cached):', cachedTopics.length);
        return cachedTopics;
      }
      const { topics } = transformSyllabus(syllabus);
      cachedTopics = topics;
      console.log('[SYLLABUS] Retrieved topics:', topics.length);
      return topics;
    }

    console.log('[SYLLABUS] Retrieved topics: 0 (no syllabus)');
    return [];
  },

  hasCustomSyllabus(userId?: string): boolean {
    const uid = userId || getCurrentUserId();
    const syllabus = this.getCustomSyllabus(uid);
    return !!syllabus;
  },

  async loadCurriculumFromServer(userId?: string): Promise<void> {
    const uid = userId || getCurrentUserId();
    try {
      const res = await fetch('/api/curriculum/custom', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        const customKey = `${STORAGE_SYLLABUS_PREFIX}${uid}`;
        if (data.success && data.syllabus) {
          localStorage.setItem(customKey, JSON.stringify(data.syllabus));
        } else {
          localStorage.removeItem(customKey);
        }
      }
    } catch (e) {
      console.warn('Sync custom syllabus from server failed:', e);
    }

    cachedSubjects = null;
    cachedTopics = null;
    notifyCurriculumListeners();
  },

  async saveCustomSyllabus(syllabus: any): Promise<void> {
    const uid = getCurrentUserId();
    const customKey = `${STORAGE_SYLLABUS_PREFIX}${uid}`;

    const res = await fetch('/api/curriculum/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(syllabus),
    });

    if (!res.ok) {
      throw new Error('Server failed to save the custom syllabus.');
    }

    // Update local cache on successful save
    try {
      localStorage.setItem(customKey, JSON.stringify(syllabus));
    } catch (e) {
      console.error('Failed to store custom syllabus locally:', e);
    }

    console.log('[SYLLABUS] Saved syllabus for user ID:', uid);
    cachedSubjects = null;
    cachedTopics = null;
    notifyCurriculumListeners();
  },

  async deleteCustomSyllabus(): Promise<void> {
    const uid = getCurrentUserId();
    const customKey = `${STORAGE_SYLLABUS_PREFIX}${uid}`;

    try {
      localStorage.removeItem(customKey);
    } catch (e) { }

    cachedSubjects = null;
    cachedTopics = null;
    notifyCurriculumListeners();

    await fetch('/api/curriculum/custom', {
      method: 'DELETE',
      credentials: 'include',
    });
  }
};

// Initial background sync
try {
  curriculumService.loadCurriculumFromServer();
} catch (e) { }