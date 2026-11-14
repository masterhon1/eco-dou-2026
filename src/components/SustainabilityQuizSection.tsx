import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Droplets,
  Leaf,
  Lightbulb,
  RotateCcw,
  Star,
  Utensils,
  XCircle,
} from 'lucide-react';
import { soundFx } from '../game/audio';
import {
  getQuizRank,
  QuizTopic,
  SUSTAINABILITY_QUESTIONS,
  SustainabilityQuestion,
} from '../game/quizData';

const QUIZ_BEST_KEY = 'ecosplit_quiz_best_v1';

interface QuizAnswerRecord {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
}

function loadBestAccuracy(): number {
  try {
    const raw = localStorage.getItem(QUIZ_BEST_KEY);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

export const SustainabilityQuizSection: React.FC = () => {
  const [topic, setTopic] = useState<QuizTopic>('all');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<QuizAnswerRecord[]>([]);
  const [completed, setCompleted] = useState(false);
  const [bestAccuracyPct, setBestAccuracyPct] = useState<number>(() => loadBestAccuracy());

  const activeQuestions: SustainabilityQuestion[] = useMemo(() => {
    if (topic === 'all') return SUSTAINABILITY_QUESTIONS;
    return SUSTAINABILITY_QUESTIONS.filter((q) => q.topic === topic);
  }, [topic]);

  const currentQuestion = activeQuestions[questionIndex] ?? activeQuestions[0];
  const correctCount = useMemo(
    () => answers.filter((a) => a.isCorrect).length,
    [answers]
  );

  const handleSelectTopic = (nextTopic: QuizTopic) => {
    setTopic(nextTopic);
    setQuestionIndex(0);
    setSelectedOption(null);
    setAnswers([]);
    setCompleted(false);
  };

  const handleChooseOption = (idx: number) => {
    if (selectedOption !== null || !currentQuestion) return;
    setSelectedOption(idx);
    const isCorrect = idx === currentQuestion.correctIndex;
    if (isCorrect) {
      soundFx.playTutorialStep();
    }
    const nextAnswers = [
      ...answers,
      { questionId: currentQuestion.id, selectedIndex: idx, isCorrect },
    ];
    setAnswers(nextAnswers);
  };

  const handleNext = () => {
    if (questionIndex + 1 < activeQuestions.length) {
      setQuestionIndex((i) => i + 1);
      setSelectedOption(null);
    } else {
      setCompleted(true);
      soundFx.playVictory();
      const pct = Math.round((correctCount / Math.max(1, activeQuestions.length)) * 100);
      if (pct > bestAccuracyPct) {
        setBestAccuracyPct(pct);
        try {
          localStorage.setItem(QUIZ_BEST_KEY, String(pct));
        } catch {
          // ignore storage errors
        }
      }
    }
  };

  const handleRetake = () => {
    soundFx.playTapFix();
    setQuestionIndex(0);
    setSelectedOption(null);
    setAnswers([]);
    setCompleted(false);
  };

  const progressPct = completed
    ? 100
    : Math.round(((questionIndex + (selectedOption !== null ? 1 : 0)) / Math.max(1, activeQuestions.length)) * 100);

  const rank = getQuizRank(correctCount, activeQuestions.length);

  return (
    <section
      id="eco-quiz"
      aria-labelledby="eco-quiz-heading"
      className="space-y-4"
    >
      {/* Section Heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-300 tracking-wide">
            Interactive Learning · Water, Food &amp; Circular Habits
          </p>
          <h2
            id="eco-quiz-heading"
            className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5 [text-wrap:balance]"
          >
            Test Your Sustainability Knowledge
          </h2>
          <p className="text-sm sm:text-base text-slate-200 mt-1 max-w-2xl">
            Take a quick quiz on real-world water saving, food rescue, and everyday energy habits.
          </p>
        </div>

        {/* Topic Filter Controls */}
        <div
          role="group"
          aria-label="Quiz topic filter"
          className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 shrink-0"
        >
          {(
            [
              { id: 'all', label: 'All Topics (12)', icon: Leaf },
              { id: 'water', label: 'Water (4)', icon: Droplets },
              { id: 'food', label: 'Food Rescue (4)', icon: Utensils },
              { id: 'energy', label: 'Circular (4)', icon: Lightbulb },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = topic === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => handleSelectTopic(tab.id)}
                className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-200 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Quiz Card */}
      <div className="rounded-2xl bg-slate-900 border border-slate-700/90 overflow-hidden">
        {/* Top Progress & Telemetry Bar */}
        <div className="px-5 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 font-mono-tabular">
            <span className="font-semibold text-white">
              {completed
                ? `Completed ${activeQuestions.length} Questions`
                : `Question ${questionIndex + 1} of ${activeQuestions.length}`}
            </span>
            {!completed && currentQuestion && (
              <>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="font-sans text-sky-300 font-semibold">
                  {currentQuestion.topicLabel}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs sm:text-sm font-mono-tabular">
            <span className="text-emerald-300 font-bold">
              Score {correctCount}/{activeQuestions.length}
            </span>
            {bestAccuracyPct > 0 && (
              <span className="text-amber-300 font-semibold">
                Best {bestAccuracyPct}%
              </span>
            )}
          </div>
        </div>

        {/* Thin Linear Progress Track */}
        <div className="h-1.5 w-full bg-slate-950">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {!completed && currentQuestion ? (
          <div className="p-5 sm:p-7 space-y-6">
            {/* Question Prompt */}
            <h3 className="font-display text-xl sm:text-2xl font-bold text-white leading-snug [text-wrap:balance]">
              {currentQuestion.prompt}
            </h3>

            {/* 4 Interactive Option Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {currentQuestion.options.map((opt, idx) => {
                const answered = selectedOption !== null;
                const isSelected = selectedOption === idx;
                const isRightOption = idx === currentQuestion.correctIndex;
                const letters = ['A', 'B', 'C', 'D'];

                let cardStyle =
                  'bg-slate-950/75 hover:bg-slate-800/80 border-slate-700 hover:border-sky-400 text-slate-100';
                if (answered) {
                  if (isRightOption) {
                    cardStyle = 'bg-emerald-950/65 border-emerald-400 text-emerald-50';
                  } else if (isSelected && !isRightOption) {
                    cardStyle = 'bg-red-950/65 border-red-400 text-red-50';
                  } else {
                    cardStyle = 'bg-slate-950/40 border-slate-800 text-slate-400 opacity-75';
                  }
                }

                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={answered}
                    onClick={() => handleChooseOption(idx)}
                    className={`min-h-[58px] p-4 rounded-xl border-2 text-left flex items-start justify-between gap-3 transition-colors ${
                      answered ? 'cursor-default' : 'cursor-pointer'
                    } ${cardStyle}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="font-mono-tabular text-xs font-bold mt-0.5 text-slate-400 shrink-0">
                        {letters[idx]}
                      </span>
                      <span className="text-sm sm:text-base font-medium leading-snug">{opt}</span>
                    </div>

                    {answered && isRightOption && (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-300 shrink-0">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Correct</span>
                      </span>
                    )}
                    {answered && isSelected && !isRightOption && (
                      <span className="flex items-center gap-1 text-xs font-bold text-red-300 shrink-0">
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>Miss</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Instant Explanation & Real-World Action Tip */}
            {selectedOption !== null && (
              <div className="pt-4 border-t border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-3xl">
                  <div
                    className={`text-sm font-bold flex items-center gap-1.5 ${
                      selectedOption === currentQuestion.correctIndex
                        ? 'text-emerald-300'
                        : 'text-amber-300'
                    }`}
                  >
                    {selectedOption === currentQuestion.correctIndex ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Correct Answer</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>
                          Not Quite — Correct answer:{' '}
                          {currentQuestion.options[currentQuestion.correctIndex]}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {currentQuestion.explanation}
                  </p>
                  <p className="text-xs sm:text-sm text-sky-300 font-medium">
                    Action Tip: {currentQuestion.actionTip}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="min-h-[48px] px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>
                    {questionIndex + 1 < activeQuestions.length
                      ? 'Next Question'
                      : 'View Quiz Results'}
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Quiz Completion Summary */
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-400">
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      className={`w-6 h-6 ${
                        s <= rank.stars ? 'fill-amber-400' : 'text-slate-700'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm font-semibold text-amber-300 flex items-center gap-1">
                    <Award className="w-4 h-4 shrink-0" />
                    <span>{rank.title}</span>
                  </span>
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-white [text-wrap:balance]">
                  You Scored {correctCount} out of {activeQuestions.length} (
                  {Math.round((correctCount / Math.max(1, activeQuestions.length)) * 100)}%)
                </h3>
                <p className="text-sm sm:text-base text-slate-200 max-w-2xl">{rank.message}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="min-h-[48px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-4 h-4 shrink-0" />
                  <span>Retake Quiz</span>
                </button>
                {topic !== 'all' && (
                  <button
                    type="button"
                    onClick={() => handleSelectTopic('all')}
                    className="min-h-[48px] px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold text-sm cursor-pointer whitespace-nowrap"
                  >
                    Try All 12 Questions
                  </button>
                )}
              </div>
            </div>

            {/* Key Takeaways Recap Grid */}
            <div className="space-y-2.5">
              <h4 className="font-display text-base font-bold text-slate-200">
                Question Review &amp; Takeaways
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeQuestions.map((q, idx) => {
                  const ans = answers[idx];
                  const hit = ans?.isCorrect ?? false;
                  return (
                    <div
                      key={q.id}
                      className="rounded-xl bg-slate-950/75 border border-slate-800 p-4 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-400 font-medium">{q.topicLabel}</span>
                        <span
                          className={`font-semibold flex items-center gap-1 ${
                            hit ? 'text-emerald-300' : 'text-red-300'
                          }`}
                        >
                          {hit ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Correct</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>Missed</span>
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white leading-snug">{q.prompt}</p>
                      <p className="text-xs text-sky-300">{q.actionTip}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
