'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ParticipantResult } from '@/types/participant';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { animatePageEntrance, animateResultReveal, animateStaggerCards } from '@/animations/gsap';
import {
  AlertTriangle,
  Clock,
  ShieldCheck,
  HelpCircle,
  Check,
  X,
  MinusCircle,
  BookOpen,
} from 'lucide-react';
import { cn, formatTime } from '@/lib/utils/cn';
import { participantService } from '@/lib/api/participantService';

export default function ResultPage() {
  const [result, setResult] = useState<ParticipantResult | null>(null);
  const [displayedScore, setDisplayedScore] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    animatePageEntrance(containerRef.current);

    let isMounted = true;
    const loadResult = async () => {
      if (typeof window !== 'undefined') {
        try {
          const activeParticipantId = localStorage.getItem('bugbusters_active_participant_id');
          const stored = localStorage.getItem('bugbusters_latest_result');
          let parsed: ParticipantResult | null = null;

          if (stored) {
            try {
              const obj: ParticipantResult = JSON.parse(stored);
              if (!activeParticipantId || String(obj.participant_id) === String(activeParticipantId)) {
                parsed = obj;
              }
            } catch {
              // ignore parse errors
            }
          }

          if (!parsed && activeParticipantId) {
            parsed = await participantService.getParticipantResult(Number(activeParticipantId));
          }

          if (isMounted && parsed) {
            setResult(parsed);
            setDisplayedScore(parsed.score);
          }
        } catch (err) {
          console.warn('Failed to load result:', err);
        }
      }
      if (isMounted) setIsLoaded(true);
    };

    loadResult();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (result) {
      if (scoreRef.current) {
        animateResultReveal(scoreRef.current, result.score, (val) => {
          setDisplayedScore(val);
        });
      }
      const timer = setTimeout(() => {
        animateStaggerCards('.review-card');
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [result]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-500 mb-4">
          <HelpCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900">No Result Found</h2>
        <p className="text-sm text-neutral-500 mt-2 max-w-sm">
          No recently submitted quiz session was detected on this device.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link href="/join">
            <Button variant="primary" size="md">
              Join a Quiz
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="md">
              Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-white flex flex-col justify-between selection:bg-neutral-900 selection:text-white px-4 py-8 sm:py-12"
    >
      {/* Top Header */}
      <div className="max-w-2xl mx-auto w-full flex items-center justify-between pb-6 border-b border-neutral-100">
        <div className="flex items-center">
          <span className="font-bold text-base sm:text-lg text-neutral-950 tracking-tight">Bug Busters</span>
        </div>
        <Badge variant="success" dot>
          Completed
        </Badge>
      </div>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto w-full my-8 space-y-8">
        {/* Header Title */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-neutral-950 tracking-tight">
            Quiz Completed
          </h1>
          <p className="text-sm text-neutral-500 mt-1.5">
            Participant: <strong className="text-neutral-900 font-semibold">{result.name}</strong> •{' '}
            <span className="font-mono-tabular">{result.phone}</span>
          </p>
        </div>

        {/* Primary Scorecard */}
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="text-center pb-6 border-b border-neutral-100">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
              Final Score
            </span>
            <div className="flex items-baseline justify-center gap-2">
              <span
                ref={scoreRef}
                className="text-6xl sm:text-7xl font-bold tracking-tight text-neutral-950 font-mono-tabular"
              >
                {displayedScore > 0 ? displayedScore : result.score}
              </span>
              <span className="text-2xl sm:text-3xl font-medium text-neutral-400 font-mono-tabular">
                / {result.total_questions}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-center text-xs font-medium text-neutral-500">
              <span className="bg-neutral-100 px-3 py-1 rounded-full text-neutral-800 font-mono-tabular font-semibold">
                {result.percentage}% Accuracy
              </span>
            </div>
          </div>

          {/* Metric Grid: Correct, Wrong, Unanswered, Time Taken, Violations */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Correct */}
            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/80 text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-700 text-xs font-medium mb-1">
                <Check className="w-3.5 h-3.5" />
                <span>Correct</span>
              </div>
              <span className="text-xl font-bold text-emerald-950 font-mono-tabular">
                {result.correct_count}
              </span>
            </div>

            {/* Wrong */}
            <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200/80 text-center">
              <div className="flex items-center justify-center gap-1 text-rose-700 text-xs font-medium mb-1">
                <X className="w-3.5 h-3.5" />
                <span>Wrong</span>
              </div>
              <span className="text-xl font-bold text-rose-950 font-mono-tabular">
                {result.incorrect_count}
              </span>
            </div>

            {/* Unanswered */}
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 text-center">
              <div className="flex items-center justify-center gap-1 text-neutral-500 text-xs font-medium mb-1">
                <MinusCircle className="w-3.5 h-3.5" />
                <span>Unanswered</span>
              </div>
              <span className="text-xl font-bold text-neutral-800 font-mono-tabular">
                {result.unanswered_count}
              </span>
            </div>

            {/* Time Taken */}
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 text-center">
              <div className="flex items-center justify-center gap-1 text-neutral-500 text-xs font-medium mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Time Taken</span>
              </div>
              <span className="text-xl font-bold text-neutral-900 font-mono-tabular">
                {result.time_taken_seconds && result.time_taken_seconds > (result.total_questions || 20) * 60
                  ? formatTime((result.total_questions || 20) * 60)
                  : result.time_taken_formatted || formatTime(result.time_taken_seconds || 0)}
              </span>
            </div>

            {/* Violations */}
            <div
              className={cn(
                'p-3.5 rounded-xl border text-center col-span-2 sm:col-span-1',
                result.violation_count > 0
                  ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                  : 'bg-neutral-50 border-neutral-200/80 text-neutral-900'
              )}
            >
              <div className="flex items-center justify-center gap-1 text-xs font-medium mb-1 opacity-80">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Violations</span>
              </div>
              <span className="text-xl font-bold font-mono-tabular">
                {result.violation_count}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 font-mono-tabular">
            <span>Quiz: {result.quiz_title}</span>
            <span className="flex items-center gap-1 text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
              Verified Telemetry
            </span>
          </div>

          <div className="pt-2 flex items-center justify-center">
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="outline" size="md" className="w-full sm:w-48">
                Return to Home
              </Button>
            </Link>
          </div>
        </Card>

        {/* Complete Answer Review Section (Module 12) */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-neutral-900" />
              <h2 className="text-lg font-bold text-neutral-950 tracking-tight">
                Complete Answer Review
              </h2>
            </div>
            <span className="text-xs text-neutral-500 font-mono-tabular">
              {result.review_items ? result.review_items.length : result.total_questions} Questions
            </span>
          </div>

          <p className="text-xs text-neutral-500">
            Review every question, your submitted choice, the correct answer, and detailed technical explanations.
          </p>

          {/* Question Review List */}
          <div className="space-y-4 mt-4">
            {result.review_items && result.review_items.length > 0 ? (
              result.review_items.map((item, idx) => {
                return (
                  <Card
                    key={`${item.question_id}-${item.question_index ?? idx}`}
                    className={cn(
                      'review-card p-5 sm:p-6 transition-all border',
                      item.is_correct
                        ? 'border-emerald-200/80 bg-white'
                        : item.is_unanswered
                        ? 'border-neutral-200 bg-white'
                        : 'border-rose-200/80 bg-white'
                    )}
                  >
                    {/* Header: Question Number & Status Badge */}
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-mono-tabular">
                        Question {String(item.question_index).padStart(2, '0')}
                      </span>

                      {item.is_correct ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <Check className="w-3.5 h-3.5" />
                          <span>Correct</span>
                        </span>
                      ) : item.is_unanswered ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 rounded-full">
                          <MinusCircle className="w-3.5 h-3.5" />
                          <span>Unanswered</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                          <X className="w-3.5 h-3.5" />
                          <span>Incorrect</span>
                        </span>
                      )}
                    </div>

                    {/* Question Prompt */}
                    <h3 className="text-sm sm:text-base font-semibold text-neutral-900 leading-snug mt-3">
                      {item.question}
                    </h3>

                    {/* Answers Breakdown */}
                    <div className="mt-4 space-y-2 text-xs sm:text-sm">
                      {/* User's Selected Answer */}
                      <div className="flex items-start gap-2">
                        <span className="text-neutral-500 min-w-[100px] shrink-0 font-medium">
                          Your answer:
                        </span>
                        <span
                          className={cn(
                            'font-semibold',
                            item.is_correct
                              ? 'text-emerald-700'
                              : item.is_unanswered
                              ? 'text-neutral-400 italic'
                              : 'text-rose-700'
                          )}
                        >
                          {item.user_selected_text ? (
                            <span>
                              {item.user_selected_key ? `(${item.user_selected_key}) ` : ''}
                              {item.user_selected_text}
                            </span>
                          ) : (
                            'Not answered'
                          )}
                        </span>
                      </div>

                      {/* Correct Answer */}
                      <div className="flex items-start gap-2">
                        <span className="text-neutral-500 min-w-[100px] shrink-0 font-medium">
                          Correct answer:
                        </span>
                        <span className="font-semibold text-emerald-800">
                          {item.correct_option_key ? `(${item.correct_option_key}) ` : ''}
                          {item.correct_option_text}
                        </span>
                      </div>
                    </div>

                    {/* Explanation Box */}
                    <div className="mt-4 pt-3 border-t border-neutral-100">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                        Explanation
                      </span>
                      <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                        {item.explanation}
                      </p>
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-neutral-400 bg-neutral-50 rounded-2xl border border-neutral-200">
                Detailed question review is being compiled.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-2xl mx-auto w-full text-center text-xs text-neutral-400 pt-8 border-t border-neutral-100">
        BugBusters Platform • Technica Symposium Results
      </footer>
    </div>
  );
}
