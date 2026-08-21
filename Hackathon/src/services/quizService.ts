import { getCurrentUserId } from '../mock/userProfile';
import { focusAreaService } from './focusAreaService';

export interface QuizQuestion {
  questionId: string;
  subjectCode: string;
  topicId: string;
  topic: string;
  question: string;
  options: string[];
  correctAnswer: number; // 0-indexed option
  explanation: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface QuizAttempt {
  id?: string;
  userId: string;
  subjectCode: string;
  topicId: string;
  topic: string;
  questions: QuizQuestion[];
  answers: number[];
  score: number;
  correctAnswers: number;
  incorrectAnswers: number;
  totalQuestions: number;
  percentage: number;
  startedAt: number;
  completedAt: number;
  createdAt?: number;
}

const STORAGE_QUIZ_HISTORY_PREFIX = 'studyflow_quiz_history_';

function getHistoryKey(userId?: string): string {
  const uid = userId || getCurrentUserId();
  return `${STORAGE_QUIZ_HISTORY_PREFIX}${uid}`;
}

const listeners = new Set<() => void>();

export function notifyQuizListeners() {
  listeners.forEach((listener) => listener());
}

export function subscribeQuiz(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const quizService = {
  getQuizHistory(userId?: string): QuizAttempt[] {
    const key = getHistoryKey(userId);
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);

      // Legacy fallback
      const legacyRaw = localStorage.getItem('studyflow_quiz_history');
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if ((userId || getCurrentUserId()) === 'SF-2024-0892') {
          localStorage.setItem(key, JSON.stringify(parsed));
          return parsed;
        }
      }
      return [];
    } catch (e) {
      console.error('Failed to read quiz history from storage:', e);
      return [];
    }
  },

  async saveQuizAttempt(
    attemptData: Omit<QuizAttempt, 'userId' | 'score' | 'correctAnswers' | 'incorrectAnswers' | 'totalQuestions' | 'percentage'>,
    userId?: string
  ): Promise<QuizAttempt> {
    const activeUserId = userId || getCurrentUserId();

    // 1. Calculate Score
    const totalQuestions = attemptData.questions.length;
    let correctAnswers = 0;

    attemptData.questions.forEach((q, idx) => {
      const userAns = attemptData.answers[idx];
      if (userAns !== undefined && userAns === q.correctAnswer) {
        correctAnswers++;
      }
    });

    const incorrectAnswers = Math.max(0, totalQuestions - correctAnswers);
    const score = correctAnswers;
    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    const fullAttempt: QuizAttempt = {
      ...attemptData,
      userId: activeUserId,
      score,
      correctAnswers,
      incorrectAnswers,
      totalQuestions,
      percentage,
      createdAt: Date.now(),
    };

    // 2. Update Local History & Scores
    const history = this.getQuizHistory(activeUserId);
    history.unshift(fullAttempt);

    try {
      const key = getHistoryKey(activeUserId);
      localStorage.setItem(key, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save quiz attempt to local storage:', e);
    }

    // Save score in focusAreaService as well
    focusAreaService.saveQuizScore(fullAttempt.topicId, percentage, activeUserId);

    notifyQuizListeners();

    // 3. Post Attempt to MongoDB API
    try {
      await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullAttempt),
      });
    } catch (e) {
      // Retain local fallback
    }

    return fullAttempt;
  },

  async syncWithServer(userId?: string): Promise<void> {
    const activeUserId = userId || getCurrentUserId();
    try {
      const res = await fetch(`/api/quiz-attempts?userId=${encodeURIComponent(activeUserId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.attempts)) {
          const key = getHistoryKey(activeUserId);
          localStorage.setItem(key, JSON.stringify(data.attempts));
          notifyQuizListeners();
        }
      }
    } catch (e) {
      // Offline fallback
    }
  },

  generateQuizQuestions(topicId: string, topicTitle: string, subjectCode = 'ES-CS201'): QuizQuestion[] {
    const isProgramming = subjectCode === 'ES-CS201' || /code|pointer|array|function|variable|loop|algorithm/i.test(topicTitle);
    const isMath = subjectCode.startsWith('BS-M') || /calculus|matrix|derivative|integral|vector|differential/i.test(topicTitle);

    const questions: QuizQuestion[] = [];

    for (let i = 1; i <= 10; i++) {
      let qText = '';
      let options: string[] = [];
      let correctAnswer = (i % 4);
      let explanation = '';
      let difficulty: 'easy' | 'medium' | 'hard' = i <= 3 ? 'easy' : i <= 7 ? 'medium' : 'hard';

      if (isProgramming) {
        if (i === 1) {
          qText = `What is the primary function of ${topicTitle} in C programming?`;
          options = ['Managing dynamic memory', 'Handling stream input/output', 'Defining preprocessor macros', 'Building user interfaces'];
          correctAnswer = 0;
          explanation = `${topicTitle} plays a central role in direct memory allocation and execution efficiency in C.`;
        } else if (i === 2) {
          qText = `Which operator is used to obtain the memory address when working with ${topicTitle}?`;
          options = ['& (Address-of operator)', '* (Dereference operator)', '-> (Structure pointer operator)', '. (Dot operator)'];
          correctAnswer = 0;
          explanation = 'The ampersand (&) operator retrieves the exact memory location of a variable.';
        } else if (i === 3) {
          qText = `What happens if a pointer variable assigned during ${topicTitle} is dereferenced without initialization?`;
          options = ['Segmentation fault / undefined behavior', 'Compilation warning only', 'Returns value 0 automatically', 'Converts value to NULL'];
          correctAnswer = 0;
          explanation = 'Dereferencing an uninitialized or wild pointer accesses arbitrary memory, triggering a segmentation fault.';
        } else if (i === 4) {
          qText = `In the context of ${topicTitle}, what does the dereference operator (*) return when applied to a pointer?`;
          options = ['The value stored at the memory location', 'The memory address itself', 'The size of the variable in bytes', 'The data type keyword'];
          correctAnswer = 0;
          explanation = 'The dereference operator (*) accesses the actual value stored at the memory location held by the pointer.';
        } else if (i === 5) {
          qText = `Which dynamic memory allocation function in C returns uninitialized memory for ${topicTitle}?`;
          options = ['malloc()', 'calloc()', 'realloc()', 'free()'];
          correctAnswer = 0;
          explanation = 'malloc() allocates raw bytes without initializing them, whereas calloc() zeroes out memory.';
        } else if (i === 6) {
          qText = `What is a memory leak associated with ${topicTitle}?`;
          options = ['Allocated memory that is never freed', 'Writing beyond array bounds', 'Stack overflow during recursion', 'Using uninitialized variables'];
          correctAnswer = 0;
          explanation = 'A memory leak occurs when dynamically allocated heap memory is not released with free() after use.';
        } else if (i === 7) {
          qText = `What is the output of pointer arithmetic when incrementing an int pointer (e.g. ptr++) on a 64-bit architecture?`;
          options = ['Address increases by sizeof(int) bytes', 'Address increases by exactly 1 byte', 'Address doubles in magnitude', 'Address resets to NULL'];
          correctAnswer = 0;
          explanation = 'Incrementing a pointer adds sizeof(datatype) bytes to the address (typically 4 bytes for 32-bit int).';
        } else if (i === 8) {
          qText = `Which keyword is used in C to declare a constant pointer variable in ${topicTitle}?`;
          options = ['const', 'static', 'volatile', 'register'];
          correctAnswer = 0;
          explanation = 'The const modifier prevents modifying either the pointer value or the data pointed to depending on placement.';
        } else if (i === 9) {
          qText = `What is a NULL pointer in C programming?`;
          options = ['A pointer that points to no valid memory location (0)', 'A pointer that points to negative memory', 'A pointer that automatically frees memory', 'A function pointer'];
          correctAnswer = 0;
          explanation = 'A NULL pointer explicitly points to address 0, signifying it currently references no object.';
        } else {
          qText = `Which statement correctly describes pass-by-reference using ${topicTitle}?`;
          options = ['Function receives memory addresses to modify caller values directly', 'Function receives copies of variable values', 'Function executes asynchronously', 'Function cannot return a value'];
          correctAnswer = 0;
          explanation = 'Passing pointers allows functions to mutate original variable values in the caller workspace.';
        }
      } else if (isMath) {
        qText = `Question ${i}: Which mathematical property is fundamental to ${topicTitle}?`;
        options = ['Linearity and convergence', 'Orthogonality', 'Discontinuity', 'Divergence only'];
        correctAnswer = 0;
        explanation = `Linearity and convergence are core mathematical properties when evaluating ${topicTitle}.`;
      } else {
        qText = `Question ${i}: What key concept underpins ${topicTitle}?`;
        options = ['Foundational principles and application', 'Secondary observation', 'Experimental anomaly', 'Static equilibrium'];
        correctAnswer = 0;
        explanation = `Understanding foundational principles is crucial when analyzing ${topicTitle}.`;
      }

      questions.push({
        questionId: `q-${topicId}-${i}`,
        subjectCode,
        topicId,
        topic: topicTitle,
        question: qText,
        options,
        correctAnswer,
        explanation,
        difficulty,
      });
    }

    return questions;
  },
};

// Background initial sync
quizService.syncWithServer();
