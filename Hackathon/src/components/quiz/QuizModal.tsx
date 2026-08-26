import React, { useState, useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { quizService, type QuizQuestion, type QuizAttempt } from '../../services/quizService';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: string;
  topicTitle: string;
  subjectCode: string;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  isOpen,
  onClose,
  topicId,
  topicTitle,
  subjectCode,
}) => {
  const [activeTab, setActiveTab] = useState<'quiz' | 'history'>('quiz');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [resultAttempt, setResultAttempt] = useState<QuizAttempt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [history, setHistory] = useState<QuizAttempt[]>([]);

  useEffect(() => {
    if (isOpen) {
      const generated = quizService.generateQuizQuestions(topicId || 'cs-u1-1', topicTitle || 'General Study', subjectCode || 'ES-CS201');
      setQuestions(generated);
      setCurrentIdx(0);
      setUserAnswers({});
      setResultAttempt(null);
      setStartTime(Date.now());
      setActiveTab('quiz');
      setHistory(quizService.getQuizHistory());
    }
  }, [isOpen, topicId, topicTitle, subjectCode]);

  if (!isOpen) return null;

  const currentQ = questions[currentIdx];
  const totalQ = questions.length || 10;
  const isLastQuestion = currentIdx === totalQ - 1;

  const handleOptionSelect = (optionIdx: number) => {
    setUserAnswers((prev) => ({ ...prev, [currentIdx]: optionIdx }));
  };

  const handleSubmitQuiz = async () => {
    setIsSubmitting(true);
    const answersArr = questions.map((_, idx) => (userAnswers[idx] !== undefined ? userAnswers[idx] : -1));

    const attempt = await quizService.saveQuizAttempt({
      subjectCode: subjectCode || 'ES-CS201',
      topicId: topicId || 'cs-u1-1',
      topic: topicTitle || 'General Study',
      questions,
      answers: answersArr,
      startedAt: startTime,
      completedAt: Date.now(),
    });

    setResultAttempt(attempt);
    setHistory(quizService.getQuizHistory());
    setIsSubmitting(false);
  };

  const handleRetakeQuiz = () => {
    const generated = quizService.generateQuizQuestions(topicId, topicTitle, subjectCode);
    setQuestions(generated);
    setCurrentIdx(0);
    setUserAnswers({});
    setResultAttempt(null);
    setStartTime(Date.now());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
      <GlassCard className="w-full max-w-3xl max-h-[calc(100vh-2rem)] flex flex-col p-4 md:p-6 relative overflow-hidden border border-white/20 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4 shrink-0">
          <div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-medium">
              {subjectCode}
            </span>
            <h2 className="font-headline-md text-headline-md text-on-surface mt-1">
              Quiz: {topicTitle}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-surface-container/60 rounded-full p-1 border border-white/10 text-xs">
              <button
                onClick={() => setActiveTab('quiz')}
                className={`px-3 py-1 rounded-full transition-colors ${
                  activeTab === 'quiz' ? 'bg-primary text-on-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Quiz
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 rounded-full transition-colors ${
                  activeTab === 'history' ? 'bg-primary text-on-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                History ({history.length})
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Active Quiz / Result */}
        {activeTab === 'quiz' && (
          <div className="flex-1 overflow-y-auto pr-1">
            {!resultAttempt ? (
              <>
                {/* Progress bar */}
                <div className="flex items-center justify-between text-xs text-on-surface-variant mb-2">
                  <span>Question {currentIdx + 1} of {totalQ}</span>
                  <span>{Math.round(((currentIdx + 1) / totalQ) * 100)}% Completed</span>
                </div>
                <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden mb-6">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${((currentIdx + 1) / totalQ) * 100}%` }}
                  />
                </div>

                {/* Question Text */}
                {currentQ && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant capitalize">
                        {currentQ.difficulty || 'medium'}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-on-surface leading-snug">
                      {currentQ.question}
                    </h3>
                  </div>
                )}

                {/* Multiple Choice Options */}
                {currentQ && (
                  <div className="space-y-3 mb-8">
                    {currentQ.options.map((optText, optIdx) => {
                      const isSelected = userAnswers[currentIdx] === optIdx;
                      const optionLetters = ['A', 'B', 'C', 'D'];
                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleOptionSelect(optIdx)}
                          className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-3 ${
                            isSelected
                              ? 'bg-primary/20 border-primary text-on-surface shadow-md'
                              : 'bg-surface-container/40 border-white/10 hover:border-white/30 text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-full text-xs flex items-center justify-center font-bold border ${
                              isSelected
                                ? 'bg-primary text-on-primary border-primary'
                                : 'bg-surface-container-high border-white/20 text-on-surface-variant'
                            }`}
                          >
                            {optionLetters[optIdx] || optIdx + 1}
                          </span>
                          <span className="text-sm font-medium flex-1">{optText}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Footer Navigation */}
                <div className="flex justify-between items-center pt-4 border-t border-white/10">
                  <button
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                    className="px-4 py-2 rounded-xl text-sm font-medium border border-white/10 text-on-surface-variant hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-3">
                    {!isLastQuestion ? (
                      <button
                        onClick={() => setCurrentIdx((prev) => Math.min(totalQ - 1, prev + 1))}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-on-primary hover:bg-primary-hover shadow-md transition-all"
                      >
                        Next Question
                      </button>
                    ) : (
                      <button
                        disabled={isSubmitting}
                        onClick={handleSubmitQuiz}
                        className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-tertiary text-on-tertiary hover:bg-tertiary-hover shadow-lg transition-all"
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* Quiz Result Screen */
              <div className="py-4 space-y-6">
                <div className="text-center p-6 bg-surface-container/60 rounded-2xl border border-white/10">
                  <div className="text-5xl font-extrabold text-primary mb-2">
                    {resultAttempt.percentage}%
                  </div>
                  <div className="text-base font-semibold text-on-surface mb-1">
                    Score: {resultAttempt.correctAnswers} / {resultAttempt.totalQuestions} Correct
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    {resultAttempt.percentage >= 80
                      ? '🌟 Outstanding performance! You mastered this topic.'
                      : resultAttempt.percentage >= 60
                      ? '👍 Good job! Review the questions below to polish weak points.'
                      : '💪 Keep practicing! Check explanations below to improve.'}
                  </p>
                  <div className="flex justify-center gap-4 mt-4 text-xs">
                    <span className="px-3 py-1 rounded-full bg-tertiary/20 text-tertiary border border-tertiary/30 font-medium">
                      ✓ {resultAttempt.correctAnswers} Correct
                    </span>
                    <span className="px-3 py-1 rounded-full bg-error/20 text-error border border-error/30 font-medium">
                      ✕ {resultAttempt.incorrectAnswers} Incorrect
                    </span>
                  </div>
                </div>

                {/* Question Breakdown */}
                <h3 className="font-headline-sm text-on-surface">Detailed Breakdown</h3>
                <div className="space-y-4">
                  {resultAttempt.questions.map((q, idx) => {
                    const userAns = resultAttempt.answers[idx];
                    const isCorrect = userAns === q.correctAnswer;
                    const optionLetters = ['A', 'B', 'C', 'D'];

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border ${
                          isCorrect ? 'bg-tertiary/10 border-tertiary/30' : 'bg-error/10 border-error/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-sm font-semibold text-on-surface">
                            {idx + 1}. {q.question}
                          </h4>
                          <span className={`text-xs px-2 py-0.5 rounded font-bold ${isCorrect ? 'bg-tertiary/20 text-tertiary' : 'bg-error/20 text-error'}`}>
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>

                        <div className="text-xs space-y-1 text-on-surface-variant mb-2">
                          <div>
                            Your Answer:{' '}
                            <span className={isCorrect ? 'text-tertiary font-medium' : 'text-error font-medium'}>
                              {userAns >= 0 ? `${optionLetters[userAns]}: ${q.options[userAns]}` : 'Not Answered'}
                            </span>
                          </div>
                          {!isCorrect && (
                            <div className="text-tertiary font-medium">
                              Correct Answer: {optionLetters[q.correctAnswer]}: {q.options[q.correctAnswer]}
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-on-surface-variant/90 bg-surface-container/60 p-2.5 rounded-lg border border-white/5">
                          <span className="font-semibold text-on-surface">Explanation:</span> {q.explanation}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-white/10">
                  <button
                    onClick={handleRetakeQuiz}
                    className="px-4 py-2 rounded-xl text-sm font-medium border border-white/10 text-on-surface hover:bg-surface-container"
                  >
                    Retake Quiz
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-on-primary hover:bg-primary-hover shadow-md"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Quiz History */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant text-sm">
                No quiz history yet. Complete a quiz to view past results here!
              </div>
            ) : (
              history.map((att, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-surface-container/40 border border-white/10 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-medium">
                        {att.subjectCode}
                      </span>
                      <h4 className="text-sm font-semibold text-on-surface">{att.topic}</h4>
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      {new Date(att.completedAt || att.createdAt || Date.now()).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${att.percentage >= 60 ? 'text-primary' : 'text-error'}`}>
                      {att.percentage}%
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      {att.correctAnswers} / {att.totalQuestions}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
};
