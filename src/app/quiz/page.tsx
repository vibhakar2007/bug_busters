'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { ParticipantNavbar } from '@/components/layout/ParticipantNavbar';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { OptionButton } from '@/components/quiz/OptionButton';
import { ViolationWarningToast } from '@/components/quiz/ViolationWarningToast';
import { SubmitModal } from '@/components/quiz/SubmitModal';
import { QuestionPaletteModal } from '@/components/quiz/QuestionPaletteModal';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { useQuiz } from '@/hooks/useQuiz';
import { useViolationMonitor } from '@/hooks/useViolationMonitor';
import { RandomizedOption } from '@/types/quiz';
import {
  ChevronLeft,
  ChevronRight,
  Send,
  Grid,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export default function QuizPage() {
  const {
    session,
    isLoading,
    error,
    isSubmitting,
    currentQuestion,
    currentQuestionIndex,
    currentAnswer,
    totalQuestions,
    answeredCount,
    unansweredIndices,
    isFirstQuestion,
    isLastQuestion,
    selectOption,
    goToNext,
    goToPrevious,
    goToQuestion,
    submitQuiz,
    syncViolationCount,
    switchDebugLanguage,
  } = useQuiz({});

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isPaletteModalOpen, setIsPaletteModalOpen] = useState(false);
  const questionContainerRef = useRef<HTMLDivElement>(null);

  // Anti-cheating telemetry
  const {
    violationCount,
    activeWarning,
    dismissWarning,
  } = useViolationMonitor({
    participantId: session ? session.participant_id : 0,
    participantName: session ? session.participant_name : '',
    registrationNumber: session ? session.phone : '',
    currentQuestionId: currentQuestion ? currentQuestion.question_id : null,
    enabled: Boolean(session && !session.isSubmitted),
    onViolation: () => {
      syncViolationCount();
    },
  });

  const requestFullscreen = () => {
    if (typeof document !== 'undefined' && document.documentElement?.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const handleNext = () => {
    goToNext();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrev = () => {
    goToPrevious();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070916] flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <div className="w-10 h-10 border-2 border-[#283f5f] border-t-[#9db40c] rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-white">Configuring Quiz Session</h2>
        <p className="text-xs text-slate-400 mt-1">Randomizing questions & option sequences...</p>
      </div>
    );
  }

  // Error state
  if (error || !session || !currentQuestion) {
    return (
      <div className="min-h-screen bg-[#070916] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto text-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800 flex items-center justify-center text-rose-400 mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Session Error</h2>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          {error || 'Unable to load quiz session. Please return to the join page and enter your credentials.'}
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link href="/join">
            <Button variant="primary" size="md">
              Return to Join Page
            </Button>
          </Link>
          <Button variant="outline" size="md" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Reload
          </Button>
        </div>
      </div>
    );
  }

  const optionLabels = ['A', 'B', 'C', 'D'];
  const progressPercent = Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100);

  return (
    <div className="min-h-screen bg-[#070916] text-white flex flex-col justify-between selection:bg-[#9db40c] selection:text-[#070916]">
      {/* 
        Unified Sticky Header Block:
        Deep obsidian background ensures that scrolling question content
        never bleeds through or overlaps with navbar text or controls.
      */}
      <div className="sticky top-0 z-30 bg-[#070916]/95 backdrop-blur-md border-b border-[#283f5f]/40 shadow-lg">
        {/* Top Navbar Row */}
        <ParticipantNavbar
          quizTitle={session.quiz_title}
          phone={session.phone}
          onFullscreenRequest={requestFullscreen}
          isSticky={false}
          className="border-b-0 bg-transparent"
        />

        {/* Subheader: Question Progress, Palette & Timer */}
        <div className="border-t border-[#283f5f]/30 bg-[#0d1224]/90">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
            {/* Question Index Pill */}
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm font-bold text-white font-mono-tabular">
                Question {String(currentQuestionIndex + 1).padStart(2, '0')} / {String(totalQuestions).padStart(2, '0')}
              </span>
              <span className="text-[#283f5f] hidden sm:inline">•</span>
              <span className="text-xs text-slate-400 font-mono-tabular hidden sm:inline">
                <strong className="text-[#9db40c]">{answeredCount}</strong> of {totalQuestions} answered
              </span>
            </div>

            {/* Controls: Palette button & Submit */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setIsPaletteModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl border border-[#283f5f] bg-[#0d1224] hover:bg-[#283f5f]/35 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                title="View all questions"
              >
                <Grid className="w-3.5 h-3.5 text-[#9db40c]" />
                <span className="hidden sm:inline">Palette</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-[#9db40c] hover:bg-[#b0c90e] text-[#070916] text-xs font-black flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
                title="Submit Quiz"
              >
                <Send className="w-3 h-3 text-[#070916]" />
                <span>Submit</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <Progress value={progressPercent} className="h-1 rounded-none bg-[#070916]" barClassName="bg-[#9db40c]" />
        </div>
      </div>

      {/* Violation Alert Toast */}
      <ViolationWarningToast
        warning={activeWarning}
        violationCount={violationCount}
        onDismiss={dismissWarning}
      />

      {/* Main Question Content */}
      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 flex-1 flex flex-col justify-start">
        <div ref={questionContainerRef} className="space-y-6 sm:space-y-8">
          {/* Question Prompt */}
          <QuestionCard
            question={currentQuestion}
            onSwitchLanguage={switchDebugLanguage}
          />

          {/* MCQ Options A, B, C, D */}
          <div className="space-y-3 pt-2">
            {currentQuestion.options.map((option: RandomizedOption, index: number) => {
              const isSelected =
                String(currentAnswer || '').trim().toUpperCase() ===
                String(option.key || '').trim().toUpperCase();
              const label = option.displayLabel || optionLabels[index] || '•';

              return (
                <OptionButton
                  key={option.key}
                  optionKey={option.key}
                  label={label}
                  text={option.text}
                  isSelected={isSelected}
                  onSelect={selectOption}
                />
              );
            })}
          </div>
        </div>
      </main>

      {/* Sticky Bottom Navigation Bar */}
      <footer className="border-t border-[#283f5f]/50 bg-[#0d1224] sticky bottom-0 z-20 py-3.5 px-4 sm:px-6 shadow-[0_-4px_16px_rgba(0,0,0,0.5)]">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          {/* Previous Button */}
          <Button
            variant="outline"
            size="md"
            onClick={handlePrev}
            disabled={isFirstQuestion}
            className="gap-1 px-3 sm:px-4 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          {/* Middle status & quick submit */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono-tabular">
              <span className="text-[#9db40c] font-black">{answeredCount}</span>/{totalQuestions} Answered
            </span>
            {!isLastQuestion && (
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="text-xs font-bold text-slate-400 hover:text-[#9db40c] underline underline-offset-2 transition-colors cursor-pointer"
              >
                Submit
              </button>
            )}
          </div>

          {/* Next / Primary Submit Button */}
          {isLastQuestion ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsSubmitModalOpen(true)}
              className="gap-1.5 px-5 sm:px-7 cursor-pointer"
            >
              <span>Submit Quiz</span>
              <Send className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleNext}
              className="gap-1 px-4 sm:px-6 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </footer>

      {/* Confirmation & Palette Modals */}
      <SubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirm={() => submitQuiz(false)}
        totalQuestions={totalQuestions}
        answeredCount={answeredCount}
        unansweredIndices={unansweredIndices}
        onJumpToQuestion={goToQuestion}
        isSubmitting={isSubmitting}
      />

      <QuestionPaletteModal
        isOpen={isPaletteModalOpen}
        onClose={() => setIsPaletteModalOpen(false)}
        questions={session.questions}
        currentIndex={currentQuestionIndex}
        answers={session.answers}
        onSelectQuestion={(idx) => {
          goToQuestion(idx);
        }}
      />
    </div>
  );
}
