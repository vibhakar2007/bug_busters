'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Quiz, QuizStatus } from '@/types/quiz';
import { quizService } from '@/lib/api/quizService';
import { participantService } from '@/lib/api/participantService';
import { activityService } from '@/lib/api/activityService';
import { exportScoresToExcel, buildExportItemsFromData } from '@/lib/utils/exportXlsx';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { animatePageEntrance } from '@/animations/gsap';
import { Plus, Play, Pause, Eye, Trash2, AlertTriangle, Clock, Download, RotateCcw, Check } from 'lucide-react';

export default function QuizManagementPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuizForDelete, setSelectedQuizForDelete] = useState<Quiz | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedQuizForDuration, setSelectedQuizForDuration] = useState<Quiz | null>(null);
  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);
  const [newDuration, setNewDuration] = useState<number>(15);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

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

  const openDurationModal = (quiz: Quiz) => {
    setSelectedQuizForDuration(quiz);
    setNewDuration(quiz.duration_minutes);
    setIsDurationModalOpen(true);
  };

  const handleSaveDuration = async () => {
    if (!selectedQuizForDuration) return;
    await quizService.updateQuizDuration(selectedQuizForDuration.quiz_id, newDuration);
    setIsDurationModalOpen(false);
    setSelectedQuizForDuration(null);
  };

  const handleResetAllData = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'bypass-tunnel-reminder': 'true',
        },
      });

      participantService.clearAll();
      activityService.clearAll();

      if (res.ok) {
        setResetSuccessMessage('All participants, activity logs, and scores have been erased.');
        setIsResetModalOpen(false);
        setTimeout(() => setResetSuccessMessage(null), 5000);
      } else {
        alert('Server returned an error while resetting data.');
      }
    } catch (err) {
      console.error('Failed to reset records:', err);
      alert('Network error while resetting records.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleDownloadScores = async () => {
    setIsDownloading(true);
    try {
      const [pList, rList] = await Promise.all([
        participantService.getAllParticipants(),
        participantService.getResults(),
      ]);
      const items = buildExportItemsFromData(pList, rList);
      exportScoresToExcel(items, 'BugBusters_Scores.xlsx');
    } catch (err) {
      console.error('Failed to download scores:', err);
      alert('Failed to generate Excel score report.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Quiz Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Create, configure, and manage active quizzes.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadScores}
            disabled={isDownloading}
            className="text-slate-200 bg-[#0d1224] border-[#283f5f] hover:bg-[#283f5f]/30 gap-1.5 shadow-2xs"
            title="Download full score sheet as XLSX"
          >
            <Download className="w-3.5 h-3.5 text-[#9db40c]" />
            <span>{isDownloading ? 'Exporting...' : 'Export Scores (.xlsx)'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsResetModalOpen(true)}
            className="text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/40 gap-1.5 shadow-2xs"
            title="Erase all participants and activity logs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>Erase All Records</span>
          </Button>

          <Link href="/admin/quizzes/create">
            <Button variant="primary" size="sm" className="gap-2 shadow-xs font-bold">
              <Plus className="w-4 h-4" />
              <span>Create Quiz</span>
            </Button>
          </Link>
        </div>
      </div>

      {resetSuccessMessage && (
        <div className="p-3.5 bg-[#506022]/25 border border-[#9db40c]/40 rounded-xl flex items-center gap-2.5 text-xs text-[#9db40c]">
          <Check className="w-4 h-4 text-[#9db40c] shrink-0" />
          <span className="font-semibold">{resetSuccessMessage}</span>
        </div>
      )}

      {/* Quizzes Table / Card List */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[#283f5f] bg-[#070916] text-slate-400 font-medium text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-6">Quiz Title</th>
                <th className="py-3.5 px-6">Quiz Code</th>
                <th className="py-3.5 px-6 text-center">Questions</th>
                <th className="py-3.5 px-6 text-center">Duration</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Created</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#283f5f]/40">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading quizzes...
                  </td>
                </tr>
              ) : quizzes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-white">No quizzes yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Create your first BugBusters quiz round.</p>
                  </td>
                </tr>
              ) : (
                quizzes.map((quiz) => (
                  <tr key={quiz.quiz_id} className="hover:bg-[#283f5f]/15 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <span className="font-semibold text-white block">{quiz.title}</span>
                        {quiz.description && (
                          <span className="text-[11px] text-slate-400 block truncate max-w-xs mt-0.5">
                            {quiz.description}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6 font-mono-tabular font-bold">
                      <span className="bg-[#070916] px-2.5 py-1 rounded-lg border border-[#283f5f] text-xs text-[#9db40c]">
                        {quiz.code}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-center font-mono-tabular text-slate-300">
                      {quiz.question_count}
                    </td>

                    <td className="py-4 px-6 text-center font-mono-tabular text-slate-300">
                      <button
                        onClick={() => openDurationModal(quiz)}
                        title="Click to adjust duration"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-[#283f5f]/30 text-slate-200 transition-colors"
                      >
                        <span>{quiz.duration_minutes} mins</span>
                        <Clock className="w-3 h-3 text-slate-400" />
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

                    <td className="py-4 px-6 text-xs text-slate-400 font-mono-tabular">
                      {new Date(quiz.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDurationModal(quiz)}
                          className="h-8 px-2.5 text-xs gap-1 text-slate-300 hover:text-white border-[#283f5f]"
                          title="Adjust Duration"
                        >
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Timer</span>
                        </Button>

                        <Link href={`/admin/quizzes/${quiz.quiz_id}`}>
                          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1 text-slate-300 hover:text-white border-[#283f5f]" title="View Quiz Details">
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </Button>
                        </Link>

                        {quiz.status === 'live' ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleStatusToggle(quiz.quiz_id, quiz.status)}
                            className="h-8 px-2.5 text-xs gap-1"
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
                            className="h-8 px-2.5 text-xs gap-1 text-[#9db40c] bg-[#506022]/20 hover:bg-[#506022]/35 border-[#9db40c]/40 font-semibold"
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
                          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
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
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Duration Limit (Minutes)
            </label>
            <input
              type="number"
              min={1}
              max={180}
              value={newDuration}
              onChange={(e) => setNewDuration(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-[#070916] border border-[#283f5f] rounded-xl text-sm font-mono-tabular font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#9db40c] focus:border-[#9db40c]"
            />
          </div>

          <div className="p-3 bg-[#070916] rounded-xl border border-[#283f5f] text-xs text-slate-300 leading-relaxed">
            <p>
              • If increased (e.g. 15 → 20 mins): Active participants receive the extra 5 minutes on their existing attempt.
            </p>
            <p className="mt-1">
              • If decreased below elapsed time: The participant&apos;s attempt will be automatically submitted immediately.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#283f5f]">
            <Button variant="outline" size="sm" onClick={() => setIsDurationModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveDuration} className="font-bold">
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
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-300 leading-relaxed">
              <p className="font-semibold text-white">
                Are you sure you want to delete &ldquo;{selectedQuizForDelete?.title}&rdquo; ({selectedQuizForDelete?.code})?
              </p>
              <p className="mt-1 text-rose-300">
                This will delete the quiz definition from <code className="bg-rose-500/20 text-rose-200 px-1 py-0.5 rounded font-mono">data/quizzes.json</code>. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#283f5f]">
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
              className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Delete Quiz'}</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Erase All Participants & Activity Logs Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Erase All Records & Activity Logs"
        description="Completely wipe all registered participants, answers, and telemetry logs."
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-300 leading-relaxed">
              <p className="font-bold text-sm text-white">
                Danger: This will erase all participant data!
              </p>
              <p className="mt-1 text-rose-300">
                This operation will completely erase:
              </p>
              <ul className="list-disc list-inside mt-1.5 space-y-0.5 text-rose-200 font-medium">
                <li>All participant registrations and phone numbers</li>
                <li>All submitted answers, scores, and review logs</li>
                <li>All security activity logs, tab switch detections, and flags</li>
              </ul>
              <p className="mt-2 text-rose-200 font-semibold">
                The quiz questions and code will be kept intact. This cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#283f5f]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResetModalOpen(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleResetAllData}
              disabled={isResetting}
              className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5 font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isResetting ? 'Erasing Everything...' : 'Confirm Erase All Records'}</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
