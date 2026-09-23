'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Quiz, Question } from '@/types/quiz';
import { quizService } from '@/lib/api/quizService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ArrowLeft, Play, Pause, Clock, Trash2, AlertTriangle } from 'lucide-react';

export default function QuizDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const quizId = Number(resolvedParams.id);
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newDuration, setNewDuration] = useState<number>(15);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const q = await quizService.getQuiz(quizId);
      if (q) {
        setQuiz(q);
        setNewDuration(q.duration_minutes);
        const qList = await quizService.getQuestions(q.question_ids);
        setQuestions(qList);
      }
      setLoading(false);
    }
    load();
  }, [quizId]);

  const handleSaveDuration = async () => {
    if (!quiz) return;
    await quizService.updateQuizDuration(quiz.quiz_id, newDuration);
    setQuiz((prev) => (prev ? { ...prev, duration_minutes: newDuration } : null));
    setIsDurationModalOpen(false);
  };

  const toggleStatus = async () => {
    if (!quiz) return;
    const newStatus = quiz.status === 'live' ? 'closed' : 'live';
    const updated = await quizService.updateQuizStatus(quiz.quiz_id, newStatus);
    setQuiz(updated);
  };

  const handleConfirmDelete = async () => {
    if (!quiz) return;
    setIsDeleting(true);
    try {
      await quizService.deleteQuiz(quiz.quiz_id);
      router.push('/admin/quizzes');
    } catch (err) {
      console.error('Failed to delete quiz:', err);
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-neutral-400">Loading quiz details...</div>
    );
  }

  if (!quiz) {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="font-semibold text-neutral-900">Quiz not found</p>
        <Link href="/admin/quizzes">
          <Button variant="outline" size="sm">
            Back to Quizzes
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/quizzes"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Quizzes</span>
        </Link>
        <Badge
          variant={
            quiz.status === 'live' ? 'success' : quiz.status === 'draft' ? 'neutral' : 'warning'
          }
          dot
        >
          {quiz.status.toUpperCase()}
        </Badge>
      </div>

      {/* Title & Quick Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            {quiz.title}
          </h1>
          {quiz.description && (
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">{quiz.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNewDuration(quiz.duration_minutes);
              setIsDurationModalOpen(true);
            }}
            className="text-neutral-700 gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Adjust Duration</span>
          </Button>

          {quiz.status === 'live' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleStatus}
              className="text-neutral-700 gap-1.5"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Close Admissions</span>
            </Button>
          ) : (
            <Button
              variant="success"
              size="sm"
              onClick={toggleStatus}
              className="gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Reopen Quiz</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-rose-700 hover:bg-rose-50 border-rose-200 gap-1.5"
            title="Delete Quiz"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <span className="text-xs text-neutral-400 font-medium block">Quiz Code</span>
          <span className="text-xl font-bold font-mono-tabular text-neutral-900 mt-1 block">
            {quiz.code}
          </span>
        </Card>
        <Card
          className="p-4 text-center cursor-pointer hover:border-neutral-400 transition-colors group"
          onClick={() => {
            setNewDuration(quiz.duration_minutes);
            setIsDurationModalOpen(true);
          }}
          title="Click to adjust duration"
        >
          <div className="flex items-center justify-center gap-1 text-xs text-neutral-400 font-medium">
            <span>Duration</span>
            <Clock className="w-3 h-3 group-hover:text-neutral-900 transition-colors" />
          </div>
          <span className="text-xl font-bold font-mono-tabular text-neutral-900 mt-1 block">
            {quiz.duration_minutes} Mins
          </span>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-xs text-neutral-400 font-medium block">Questions Served</span>
          <span className="text-xl font-bold font-mono-tabular text-neutral-900 mt-1 block">
            {quiz.question_count}
          </span>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-xs text-neutral-400 font-medium block">Pool Size</span>
          <span className="text-xl font-bold font-mono-tabular text-neutral-900 mt-1 block">
            {quiz.question_ids.length}
          </span>
        </Card>
      </div>

      {/* Questions in this Quiz */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Question Pool</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              These questions are randomly sampled and served to students.
            </p>
          </div>
          <span className="text-xs text-neutral-400 font-mono-tabular">
            {questions.length} Questions
          </span>
        </div>

        <div className="divide-y divide-neutral-100 space-y-2">
          {questions.map((q, idx) => (
            <div key={q.question_id} className="pt-3 pb-2 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-900 font-mono-tabular">
                  #{idx + 1} (QID: {q.question_id})
                </span>
                <span className="text-[11px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded font-medium">
                  {q.category}
                </span>
              </div>
              <p className="text-neutral-800 font-medium">{q.question}</p>
              {q.code_snippet && (
                <pre className="p-2.5 bg-neutral-900 text-neutral-100 rounded-lg text-[11px] font-mono-tabular overflow-x-auto">
                  <code>{q.code_snippet}</code>
                </pre>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Adjust Duration Modal */}
      <Modal
        isOpen={isDurationModalOpen}
        onClose={() => setIsDurationModalOpen(false)}
        title="Adjust Quiz Duration"
        description={`Modify duration limit for "${quiz.title}". Running attempts recalculate their remaining time seamlessly.`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Duration Limit (Minutes)
            </label>
            <input
              type="number"
              min={1}
              max={180}
              value={newDuration}
              onChange={(e) => setNewDuration(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono-tabular font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white"
            />
          </div>

          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600 leading-relaxed">
            <p>
              • If increased: Active participants receive the extra time without their timer resetting.
            </p>
            <p className="mt-1">
              • If decreased below elapsed time: The attempt auto-submits immediately.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
            <Button variant="outline" size="sm" onClick={() => setIsDurationModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveDuration}>
              Apply New Duration
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Quiz Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Quiz Round"
        description="Permanently remove this quiz from the symposium system."
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 leading-relaxed">
              <p className="font-semibold">
                Are you sure you want to delete &ldquo;{quiz.title}&rdquo; ({quiz.code})?
              </p>
              <p className="mt-1 text-rose-700">
                This will delete the quiz definition from <code className="bg-rose-100 px-1 py-0.5 rounded font-mono">data/quizzes.json</code>. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Delete Quiz'}</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
