'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { quizService } from '@/lib/api/quizService';
import { Question, QuizStatus } from '@/types/quiz';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { QuestionPicker } from '@/components/admin/QuestionPicker';
import { animatePageEntrance } from '@/animations/gsap';
import { ArrowLeft, Sparkles, Check, AlertCircle } from 'lucide-react';

export default function CreateQuizPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('Technica Round 1');
  const [code, setCode] = useState('TECH26');
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [status, setStatus] = useState<QuizStatus>('live');
  const [description, setDescription] = useState('Technica symposium technical round. Randomized MCQs from common pool.');

  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    animatePageEntrance(containerRef.current);
    quizService.getAllQuestions().then((questions) => {
      setAvailableQuestions(questions);
      // Pre-select first 20 questions by default for pool
      const defaultSelection = questions.slice(0, 20).map((q) => q.question_id);
      setSelectedQuestionIds(defaultSelection);
    });
  }, []);

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'TECH';
    for (let i = 0; i < 2; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanTitle = title.trim();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanTitle) {
      setError('Quiz title is required.');
      return;
    }

    if (!cleanCode) {
      setError('Quiz admission code is required.');
      return;
    }

    if (selectedQuestionIds.length === 0) {
      setError('Please select at least one question for the quiz pool.');
      return;
    }

    if (questionCount > selectedQuestionIds.length) {
      setError(
        `Question count (${questionCount}) cannot exceed total selected questions in the bank (${selectedQuestionIds.length}).`
      );
      return;
    }

    if (questionCount <= 0) {
      setError('Question count must be at least 1.');
      return;
    }

    setIsLoading(true);

    try {
      await quizService.createQuiz({
        title: cleanTitle,
        code: cleanCode,
        duration_minutes: durationMinutes,
        question_count: questionCount,
        question_ids: selectedQuestionIds,
        status: status,
        description: description.trim() || undefined,
      });

      router.push('/admin/quizzes');
    } catch (err: unknown) {
      console.error('Failed to create quiz:', err);
      setError('An error occurred while creating the quiz.');
      setIsLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-6 max-w-4xl mx-auto">
      {/* Back Link & Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/quizzes"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Quizzes</span>
        </Link>
        <span className="text-xs text-neutral-400 font-mono-tabular">Symposium Round Creator</span>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
          Create New Quiz Round
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Select questions from the common question bank, set question count per participant, and configure the countdown duration.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Metadata Card */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-neutral-900 pb-2 border-b border-neutral-100">
            Quiz Configuration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Quiz Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Technica Round 1"
                required
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
              />
            </div>

            {/* Code */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Quiz Code
                </label>
                <button
                  type="button"
                  onClick={generateRandomCode}
                  className="text-[11px] text-neutral-500 hover:text-neutral-900 flex items-center gap-1 font-medium"
                >
                  <Sparkles className="w-3 h-3" />
                  Generate
                </button>
              </div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="TECH26"
                maxLength={8}
                required
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono-tabular font-bold tracking-wider uppercase text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as QuizStatus)}
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
              >
                <option value="live">Live (Accepting Participants)</option>
                <option value="draft">Draft (Private)</option>
                <option value="closed">Closed (Finished)</option>
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Duration (Minutes)
              </label>
              <input
                type="number"
                min={1}
                max={180}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                required
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono-tabular text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
              />
              <span className="text-[11px] text-neutral-400 mt-1 block">
                Can be updated by admin anytime while quiz is running
              </span>
            </div>

            {/* Questions to Serve to Participant */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Question Count per Participant
              </label>
              <input
                type="number"
                min={1}
                max={Math.max(1, selectedQuestionIds.length)}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                required
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono-tabular text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
              />
              <span className="text-[11px] text-neutral-500 font-medium mt-1 block">
                Every participant receives exactly {questionCount} randomized questions.
              </span>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Symposium rules, instructions, or focus areas..."
                rows={2}
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
              />
            </div>
          </div>
        </Card>

        {/* Question Selector Pool */}
        <QuestionPicker
          questions={availableQuestions}
          selectedIds={selectedQuestionIds}
          onChange={setSelectedQuestionIds}
        />

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link href="/admin/quizzes">
            <Button variant="outline" size="md">
              Cancel
            </Button>
          </Link>
          <Button variant="primary" size="md" type="submit" isLoading={isLoading} className="gap-2">
            <Check className="w-4 h-4" />
            <span>Publish Quiz</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
