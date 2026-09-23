'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Quiz, QuizStatus } from '@/types/quiz';
import { quizService } from '@/lib/api/quizService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { animatePageEntrance } from '@/animations/gsap';
import { Plus, Play, Pause, Eye, Clock, Trash2, AlertTriangle } from 'lucide-react';

export default function QuizManagementPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuizForDuration, setSelectedQuizForDuration] = useState<Quiz | null>(null);
  const [selectedQuizForDelete, setSelectedQuizForDelete] = useState<Quiz | null>(null);
  const [newDuration, setNewDuration] = useState<number>(15);
  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    animatePageEntrance(containerRef.current);
    const unsubscribe = quizService.subscribeToQuizzes((list) => {
      setQuizzes(list);
      setLoading(false);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleStatusToggle = async (quizId: number, currentStatus: QuizStatus) => {
    const newStatus: QuizStatus = currentStatus === 'live' ? 'closed' : 'live';
    await quizService.updateQuizStatus(quizId, newStatus);
  };

  const openDurationModal = (quiz: Quiz) => {
    setSelectedQuizForDuration(quiz);
    setNewDuration(quiz.duration_minutes);
    setIsDurationModalOpen(true);
  };

  const handleSaveDuration = async () => {
    if (!selectedQuizForDuration) return;
    await quizService.updateQuizDuration(selectedQuizForDuration.quiz_id, newDuration);
    setIsDurationModalOpen(false);
  };

  const openDeleteModal = (quiz: Quiz) => {
    setSelectedQuizForDelete(quiz);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedQuizForDelete) return;
    setIsDeleting(true);
    try {
      await quizService.deleteQuiz(selectedQuizForDelete.quiz_id);
      setIsDeleteModalOpen(false);
      setSelectedQuizForDelete(null);
    } catch (err) {
      console.error('Failed to delete quiz:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            Quiz Management
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Create, configure, and manage active quizzes.
          </p>
        </div>

        <Link href="/admin/quizzes/create">
          <Button variant="primary" size="md" className="gap-2 shadow-xs">
            <Plus className="w-4 h-4" />
            <span>Create Quiz</span>
          </Button>
        </Link>
      </div>

      {/* Quizzes Table / Card List */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/70 text-neutral-400 font-medium text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-6">Quiz Title</th>
                <th className="py-3.5 px-6">Quiz Code</th>
                <th className="py-3.5 px-6 text-center">Questions</th>
                <th className="py-3.5 px-6 text-center">Duration</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Created</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    Loading quizzes...
                  </td>
                </tr>
              ) : quizzes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    <p className="font-semibold text-neutral-900">No quizzes yet.</p>
                    <p className="text-xs text-neutral-400 mt-1">Create your first BugBusters quiz round.</p>
                  </td>
                </tr>
              ) : (
                quizzes.map((quiz) => (
                  <tr key={quiz.quiz_id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <span className="font-semibold text-neutral-900 block">{quiz.title}</span>
                        {quiz.description && (
                          <span className="text-[11px] text-neutral-400 block truncate max-w-xs mt-0.5">
                            {quiz.description}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6 font-mono-tabular font-bold text-neutral-800">
                      <span className="bg-neutral-100 px-2.5 py-1 rounded-lg border border-neutral-200 text-xs">
                        {quiz.code}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-center font-mono-tabular text-neutral-700">
                      {quiz.question_count}
                    </td>

                    <td className="py-4 px-6 text-center font-mono-tabular text-neutral-700">
                      <button
                        onClick={() => openDurationModal(quiz)}
                        title="Click to adjust duration"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-neutral-100 text-neutral-900 transition-colors"
                      >
                        <span>{quiz.duration_minutes} mins</span>
                        <Clock className="w-3 h-3 text-neutral-400" />
                      </button>
                    </td>

                    <td className="py-4 px-6">
                      <Badge
                        variant={
                          quiz.status === 'live'
                            ? 'success'
                            : quiz.status === 'draft'
                            ? 'neutral'
                            : 'warning'
                        }
                        dot
                      >
                        {quiz.status.toUpperCase()}
                      </Badge>
                    </td>

                    <td className="py-4 px-6 text-xs text-neutral-500 font-mono-tabular">
                      {new Date(quiz.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDurationModal(quiz)}
                          className="h-8 px-2.5 text-xs gap-1 text-neutral-700 hover:text-neutral-950"
                          title="Adjust Duration"
                        >
                          <Clock className="w-3 h-3 text-neutral-500" />
                          <span>Timer</span>
                        </Button>

                        <Link href={`/admin/quizzes/${quiz.quiz_id}`}>
                          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1" title="View Quiz Details">
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </Button>
                        </Link>

                        {quiz.status === 'live' ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleStatusToggle(quiz.quiz_id, quiz.status)}
                            className="h-8 px-2.5 text-xs gap-1 text-neutral-700 hover:text-neutral-950"
                            title="Close Admissions"
                          >
                            <Pause className="w-3.5 h-3.5" />
                            <span>Close</span>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusToggle(quiz.quiz_id, quiz.status)}
                            className="h-8 px-2.5 text-xs gap-1 text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                            title="Reopen Quiz"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Start</span>
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteModal(quiz)}
                          className="h-8 w-8 p-0 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Quiz"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Adjust Duration Modal */}
      <Modal
        isOpen={isDurationModalOpen}
        onClose={() => setIsDurationModalOpen(false)}
        title="Adjust Quiz Duration"
        description="Change the duration limit for this quiz round. Running participant countdowns will dynamically update without resetting."
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
              • If increased (e.g. 15 → 20 mins): Active participants receive the extra 5 minutes on their existing attempt.
            </p>
            <p className="mt-1">
              • If decreased below elapsed time: The participant&apos;s attempt will be automatically submitted immediately.
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

      {/* Delete Confirmation Modal */}
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
                Are you sure you want to delete &ldquo;{selectedQuizForDelete?.title}&rdquo; ({selectedQuizForDelete?.code})?
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
