'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Quiz, Question } from '@/types/quiz';
import { quizService } from '@/lib/api/quizService';
import { participantService } from '@/lib/api/participantService';
import { activityService } from '@/lib/api/activityService';
import { exportScoresToExcel, buildExportItemsFromData } from '@/lib/utils/exportXlsx';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ArrowLeft, Play, Pause, Clock, Trash2, AlertTriangle, Download, RotateCcw, Check } from 'lucide-react';

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

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

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

      // Clear local memory/storage as well
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
        participantService.getResults(quiz?.quiz_id),
      ]);
      const items = buildExportItemsFromData(pList, rList);
      exportScoresToExcel(items, `${quiz?.code || 'Quiz'}_Final_Scores.xlsx`);
    } catch (err) {
      console.error('Failed to download scores:', err);
      alert('Failed to generate Excel score report.');
    } finally {
      setIsDownloading(false);
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
        <p className="font-semibold text-white">Quiz not found</p>
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
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {quiz.title}
          </h1>
          {quiz.description && (
            <p className="text-xs sm:text-sm text-slate-400 mt-1">{quiz.description}</p>
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
            className="text-slate-200 border-[#283f5f] hover:bg-[#283f5f]/30 gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Adjust Duration</span>
          </Button>

          {quiz.status === 'live' ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleStatus}
              className="gap-1.5 font-semibold"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Close Admissions</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={toggleStatus}
              className="gap-1.5 font-bold"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Reopen Quiz</span>
            </Button>
          )}

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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-rose-400 hover:bg-rose-500/10 border-rose-500/30 gap-1.5"
            title="Delete Quiz"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Quiz</span>
          </Button>
        </div>
      </div>

      {resetSuccessMessage && (
        <div className="p-3.5 bg-[#506022]/25 border border-[#9db40c]/40 rounded-xl flex items-center gap-2.5 text-xs text-[#9db40c]">
          <Check className="w-4 h-4 text-[#9db40c] shrink-0" />
          <span className="font-semibold">{resetSuccessMessage}</span>
        </div>
      )}

      {/* Meta Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <span className="text-xs text-slate-400 font-medium block">Quiz Code</span>
          <span className="text-xl font-bold font-mono-tabular text-[#9db40c] mt-1 block">
            {quiz.code}
          </span>
        </Card>
        <Card
          className="p-4 text-center cursor-pointer hover:border-[#9db40c]/50 transition-colors group"
          onClick={() => {
            setNewDuration(quiz.duration_minutes);
            setIsDurationModalOpen(true);
          }}
          title="Click to adjust duration"
        >
          <div className="flex items-center justify-center gap-1 text-xs text-slate-400 font-medium">
            <span>Duration</span>
            <Clock className="w-3 h-3 group-hover:text-[#9db40c] transition-colors" />
          </div>
          <span className="text-xl font-bold font-mono-tabular text-white mt-1 block">
            {quiz.duration_minutes} Mins
          </span>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-xs text-slate-400 font-medium block">Questions Served</span>
          <span className="text-xl font-bold font-mono-tabular text-white mt-1 block">
            {quiz.question_count}
          </span>
        </Card>
        <Card className="p-4 text-center">
          <span className="text-xs text-slate-400 font-medium block">Pool Size</span>
          <span className="text-xl font-bold font-mono-tabular text-white mt-1 block">
            {quiz.question_ids.length}
          </span>
        </Card>
      </div>

      {/* Questions in this Quiz */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#283f5f]/60">
          <div>
            <h3 className="text-sm font-semibold text-white">Question Pool</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              These questions are randomly sampled and served to students.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono-tabular">
            {questions.length} Questions
          </span>
        </div>

        <div className="divide-y divide-[#283f5f]/40 space-y-2">
          {questions.map((q, idx) => (
            <div key={q.question_id} className="pt-3 pb-2 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 font-mono-tabular">
                  #{idx + 1} (QID: {q.question_id})
                </span>
                <span className="text-[11px] bg-[#031c6c]/40 border border-[#283f5f] text-[#9db40c] px-2 py-0.5 rounded font-medium">
                  {q.category}
                </span>
              </div>
              <p className="text-white font-medium">{q.question}</p>
              {q.code_snippet && (
                <pre className="p-2.5 bg-[#070916] border border-[#283f5f] text-slate-200 rounded-lg text-[11px] font-mono-tabular overflow-x-auto">
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
              • If increased: Active participants receive the extra time without their timer resetting.
            </p>
            <p className="mt-1">
              • If decreased below elapsed time: The attempt auto-submits immediately.
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

      {/* Delete Quiz Modal */}
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
                Are you sure you want to delete &ldquo;{quiz.title}&rdquo; ({quiz.code})?
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
