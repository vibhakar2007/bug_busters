'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  HandsOnDebugQuestion,
  HandsOnSubmission,
  ExecutionOutcome,
  HandsOnLanguage,
} from '@/types/handsOnDebug';
import { Participant } from '@/types/participant';
import { handsOnDebugService } from '@/lib/api/handsOnDebugService';
import { participantService } from '@/lib/api/participantService';
import { activityService } from '@/lib/api/activityService';
import { executeInBrowserJavaScript } from '@/lib/quiz/browserRunner';
import { useViolationMonitor } from '@/hooks/useViolationMonitor';
import { ViolationWarningToast } from '@/components/quiz/ViolationWarningToast';
import { formatDurationSeconds } from '@/lib/utils/time';
import { realtimeBus } from '@/lib/api/eventBus';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Terminal,
  Bug,
  ChevronLeft,
  ChevronRight,
  Send,
  Sparkles,
  AlertTriangle,
  Code2,
  FileText,
  CheckSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const LANGUAGE_LABELS: Record<HandsOnLanguage, string> = {
  python: 'Python 3.10',
  javascript: 'JavaScript',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
};

export default function HandsOnDebugPage() {
  const router = useRouter();

  const [questions, setQuestions] = useState<HandsOnDebugQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [userCodes, setUserCodes] = useState<Record<number, string>>({});
  const [selectedLanguages, setSelectedLanguages] = useState<Record<number, HandsOnLanguage>>({});
  const [submissions, setSubmissions] = useState<Record<number, HandsOnSubmission>>({});
  const [executionOutcomes, setExecutionOutcomes] = useState<Record<number, ExecutionOutcome | null>>({});

  const [isRunning, setIsRunning] = useState(false);
  const [isSubmittingRound, setIsSubmittingRound] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [activeTab, setActiveTab] = useState<'tests' | 'terminal'>('tests');

  // Mobile navigation tab state: 'problem' | 'editor' | 'results'
  const [mobileTab, setMobileTab] = useState<'problem' | 'editor' | 'results'>('editor');

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const submissionsRef = useRef(submissions);
  useEffect(() => {
    submissionsRef.current = submissions;
  }, [submissions]);

  const participantRef = useRef(participant);
  useEffect(() => {
    participantRef.current = participant;
  }, [participant]);

  // Helper to retrieve initial starter code for a specific language
  const getStarterCode = useCallback((q: HandsOnDebugQuestion, lang: HandsOnLanguage): string => {
    switch (lang) {
      case 'python':
        return q.initial_code_python;
      case 'javascript':
        return q.initial_code;
      case 'java':
        return q.initial_code_java || q.initial_code;
      case 'c':
        return q.initial_code_c || q.initial_code_python;
      case 'cpp':
        return q.initial_code_cpp || q.initial_code_python;
    }
  }, []);

  // 1. Initialize participant and questions
  useEffect(() => {
    async function init() {
      let p: Participant | null = null;
      let targetPid: number | null = null;

      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const qPid = urlParams.get('pid');
        if (qPid) targetPid = Number(qPid);
        if (!targetPid) {
          const sPid = localStorage.getItem('bugbusters_active_participant_id') ||
                       sessionStorage.getItem('bugbusters_active_participant_id');
          if (sPid) targetPid = Number(sPid);
        }
      }

      if (targetPid) {
        try {
          p = await participantService.getParticipant(targetPid);
        } catch (e) {
          console.warn('Failed to load participant by ID:', e);
        }
      }

      if (!p && typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('bugbusters_active_participant') ||
                       localStorage.getItem('bugbusters_active_participant');
        if (stored) {
          try {
            p = JSON.parse(stored);
          } catch {}
        }
      }

      if (!p) {
        const all = await participantService.getAllParticipants();
        if (all.length > 0) {
          p = all[all.length - 1];
        }
      }

      if (p) {
        // ONLY redirect to /result if the participant has ALREADY finished Hands-on Debugging!
        if (p.status === 'completed' && p.hands_on_score !== undefined && p.hands_on_score !== null) {
          window.location.href = `/result?pid=${p.participant_id}`;
          return;
        }

        // If participant was marked completed prematurely before hands-on, reactivate them for hands-on
        if (p.status === 'completed' && (p.hands_on_score === undefined || p.hands_on_score === null)) {
          p = { ...p, status: 'active' };
          participantService.updateParticipant(p.participant_id, { status: 'active' }).catch(() => {});
        }

        // Check if quiz is already closed
        try {
          const qId = p.quiz_id || 1;
          const res = await fetch(`/api/quizzes/${qId}?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true`, {
            headers: { 'Accept': 'application/json' },
          });
          if (res.ok) {
            const qData = await res.json();
            if (qData && qData.status === 'closed') {
              window.location.href = `/result?closed=true&pid=${p.participant_id}`;
              return;
            }
          }
        } catch {}

        setParticipant(p);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('bugbusters_active_participant', JSON.stringify(p));
          localStorage.setItem('bugbusters_active_participant', JSON.stringify(p));
          localStorage.setItem('bugbusters_active_participant_id', String(p.participant_id));
        }

        const sessionState = handsOnDebugService.getSession(p.participant_id);
        setCurrentIndex(sessionState.currentQuestionIndex || 0);
        setUserCodes(sessionState.codes || {});
        setSelectedLanguages(sessionState.selectedLanguages || {});
        setSubmissions(sessionState.submissions || {});
      }

      const qList = await handsOnDebugService.getAllQuestions();
      setQuestions(qList);
    }

    init();
  }, [router]);

  const currentQ = questions[currentIndex] || null;
  const currentLang: HandsOnLanguage = currentQ
    ? selectedLanguages[currentQ.id] || (currentQ.language as HandsOnLanguage) || 'python'
    : 'python';

  const currentCode = currentQ
    ? userCodes[currentQ.id] !== undefined
      ? userCodes[currentQ.id]
      : getStarterCode(currentQ, currentLang)
    : '';

  const currentOutcome = currentQ ? executionOutcomes[currentQ.id] || null : null;
  const currentSubmission = currentQ ? submissions[currentQ.id] || null : null;

  // Anti-cheating monitor
  const {
    activeWarning,
    dismissWarning,
  } = useViolationMonitor({
    participantId: participant ? participant.participant_id : 0,
    participantName: participant ? participant.name : '',
    registrationNumber: participant ? participant.phone : '',
    currentQuestionId: currentQ ? currentQ.id : null,
    enabled: Boolean(participant),
    onViolation: () => {},
  });

  // Handle code change
  const handleCodeChange = (newCode: string) => {
    if (!currentQ) return;
    const updated = { ...userCodes, [currentQ.id]: newCode };
    setUserCodes(updated);

    if (participant) {
      const sessionState = handsOnDebugService.getSession(participant.participant_id);
      sessionState.codes[currentQ.id] = newCode;
      handsOnDebugService.saveSession(participant.participant_id, sessionState);
    }
  };

  // Switch between 5 languages
  const handleLanguageSwitch = (lang: HandsOnLanguage) => {
    if (!currentQ) return;
    setSelectedLanguages((prev) => ({ ...prev, [currentQ.id]: lang }));

    // Reset editor code to language default
    const defaultCode = getStarterCode(currentQ, lang);
    handleCodeChange(defaultCode);
    setExecutionOutcomes((prev) => ({ ...prev, [currentQ.id]: null }));

    if (participant) {
      const sessionState = handsOnDebugService.getSession(participant.participant_id);
      sessionState.selectedLanguages[currentQ.id] = lang;
      handsOnDebugService.saveSession(participant.participant_id, sessionState);
    }
  };

  // Reset to original buggy code
  const handleResetCode = () => {
    if (!currentQ) return;
    const defaultCode = getStarterCode(currentQ, currentLang);
    handleCodeChange(defaultCode);
    setExecutionOutcomes((prev) => ({ ...prev, [currentQ.id]: null }));
  };

  // Keydown helper for Tab key indentation in editor
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      handleCodeChange(newVal);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runCode();
    }
  };

  // Run Code against all test cases
  const runCode = useCallback(async () => {
    if (!currentQ || isRunning) return;
    setIsRunning(true);

    try {
      let outcome: ExecutionOutcome;

      if (currentLang === 'javascript') {
        outcome = await executeInBrowserJavaScript(
          currentCode,
          currentQ.function_name,
          currentQ.test_cases
        );
      } else {
        let fnName = currentQ.function_name_python;
        if (currentLang === 'java') fnName = currentQ.function_name_java || currentQ.function_name;
        if (currentLang === 'c') fnName = currentQ.function_name_c || currentQ.function_name_python;
        if (currentLang === 'cpp') fnName = currentQ.function_name_cpp || currentQ.function_name_python;

        const res = await fetch('/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: currentCode,
            language: currentLang,
            function_name: fnName,
            test_cases: currentQ.test_cases,
          }),
        });
        outcome = await res.json();
      }

      setExecutionOutcomes((prev) => ({ ...prev, [currentQ.id]: outcome }));

      // On mobile screens, automatically show results tab so the user sees feedback immediately
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setMobileTab('results');
      }

      // If logs exist, automatically switch to terminal tab to show logs
      if (outcome.logs && outcome.logs.length > 0) {
        setActiveTab('terminal');
      } else {
        setActiveTab('tests');
      }

      // If all test cases passed, record auto-submission
      if (participant && outcome.all_passed) {
        const sub: HandsOnSubmission = {
          question_id: currentQ.id,
          code: currentCode,
          language: currentLang,
          passed_test_cases: outcome.passed_count,
          total_test_cases: outcome.total_count,
          is_solved: true,
          submitted_at: new Date().toISOString(),
        };
        const updatedSession = handsOnDebugService.recordSubmission(participant.participant_id, sub);
        setSubmissions(updatedSession.submissions);

        // Record activity log
        activityService
          .recordActivity({
            participant_id: participant.participant_id,
            participant_name: participant.name,
            registration_number: participant.phone,
            question_id: currentQ.id,
            event_type: 'answer_selected',
            details: `Solved Hands-on Challenge #${currentQ.id} (${currentQ.title}) in ${currentLang}`,
          })
          .catch(() => {});
      }
    } catch (err: unknown) {
      console.error('Execution error:', err);
      setExecutionOutcomes((prev) => ({
        ...prev,
        [currentQ.id]: {
          success: false,
          logs: [],
          error: err instanceof Error ? err.message : 'Unknown execution failure',
          test_results: [],
          passed_count: 0,
          total_count: currentQ.test_cases.length,
          all_passed: false,
        },
      }));
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setMobileTab('results');
      }
    } finally {
      setIsRunning(false);
    }
  }, [currentQ, currentLang, currentCode, isRunning, participant]);

  // Navigate challenges
  const goToQuestion = (idx: number) => {
    if (idx >= 0 && idx < questions.length) {
      setCurrentIndex(idx);
      setShowHint(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (participant) {
        const state = handsOnDebugService.getSession(participant.participant_id);
        state.currentQuestionIndex = idx;
        handsOnDebugService.saveSession(participant.participant_id, state);
      }
    }
  };

  // Final submission of hands-on debugging round
  const handleFinalSubmitRound = useCallback(async (isAutoClosed = false) => {
    if (isSubmittingRound) return;
    setIsSubmittingRound(true);

    try {
      const currentSubs = submissionsRef.current;
      const currentPart = participantRef.current;
      const totalSolved = Object.values(currentSubs).filter((s) => s.is_solved).length;
      const handsOnTotal = questions.length;

      // Update participant with authoritative time, hands-on score and submissions
      if (currentPart) {
        const endTime = new Date().toISOString();
        const startMs = currentPart.start_time ? new Date(currentPart.start_time).getTime() : new Date().getTime();
        const endMs = new Date(endTime).getTime();
        const durationSec = Math.max(1, Math.round((endMs - startMs) / 1000));
        const formattedTime = formatDurationSeconds(durationSec);

        await participantService.updateParticipant(currentPart.participant_id, {
          hands_on_score: totalSolved,
          hands_on_total: handsOnTotal,
          hands_on_submissions: currentSubs,
          status: 'completed',
          end_time: endTime,
          time_taken_seconds: durationSec,
          time_taken_formatted: formattedTime,
          last_activity_description: isAutoClosed
            ? `Event concluded by administrator (${totalSolved}/${handsOnTotal} hands-on solved)`
            : `Completed Hands-on Debugging (${totalSolved}/${handsOnTotal} solved)`,
        });

        // Also update local and server participant result
        try {
          const existingResult = await participantService.getParticipantResult(currentPart.participant_id);
          if (existingResult) {
            existingResult.hands_on_score = totalSolved;
            existingResult.hands_on_total = handsOnTotal;
            existingResult.hands_on_submissions = currentSubs;
            existingResult.end_time = endTime;
            existingResult.time_taken_seconds = durationSec;
            existingResult.time_taken_formatted = formattedTime;
            await participantService.recordResult(existingResult);
          }
        } catch {}

        const storedResult = localStorage.getItem('bugbusters_latest_result') ||
                             sessionStorage.getItem('bugbusters_latest_result');
        if (storedResult) {
          try {
            const parsed = JSON.parse(storedResult);
            parsed.hands_on_score = totalSolved;
            parsed.hands_on_total = handsOnTotal;
            parsed.hands_on_submissions = currentSubs;
            parsed.end_time = endTime;
            parsed.time_taken_seconds = durationSec;
            parsed.time_taken_formatted = formattedTime;
            localStorage.setItem('bugbusters_latest_result', JSON.stringify(parsed));
            sessionStorage.setItem('bugbusters_latest_result', JSON.stringify(parsed));
          } catch {}
        }

        await activityService.recordActivity({
          participant_id: currentPart.participant_id,
          participant_name: currentPart.name,
          registration_number: currentPart.phone,
          question_id: null,
          event_type: 'quiz_submitted',
          details: isAutoClosed
            ? `Event concluded by administrator. Hands-on round auto-submitted with ${totalSolved}/${handsOnTotal} solved.`
            : `Hands-on round submitted. Solved ${totalSolved}/${handsOnTotal} challenges.`,
        });
      }

      const autoClosed = isAutoClosed === true;
      if (autoClosed) {
        window.location.href = `/result?closed=true&pid=${currentPart?.participant_id || ''}`;
      } else {
        window.location.href = `/result?pid=${currentPart?.participant_id || ''}`;
      }
    } catch (err) {
      console.error('Failed submitting hands-on round:', err);
      setIsSubmittingRound(false);
    }
  }, [isSubmittingRound, questions.length, router]);

  // Listen for authoritative quiz closure during hands-on round
  useEffect(() => {
    let isMounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    const handleQuizClosed = () => {
      if (isMounted) {
        handleFinalSubmitRound(true);
      }
    };

    const unsub = realtimeBus.on<{ quiz_id?: number; status?: string }>('quiz_status_changed', (evt) => {
      const currentPart = participantRef.current;
      if (evt && (evt.quiz_id === undefined || !currentPart || evt.quiz_id === currentPart.quiz_id) && evt.status === 'closed') {
        handleQuizClosed();
      }
    });

    pollInterval = setInterval(async () => {
      try {
        const currentPart = participantRef.current;
        const qId = currentPart?.quiz_id || 1;
        const res = await fetch(`/api/quizzes/${qId}?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true`, {
          headers: { 'Accept': 'application/json' },
        });
        if (res.ok) {
          const qData = await res.json();
          if (qData && qData.status === 'closed') {
            handleQuizClosed();
          }
        }
      } catch {}
    }, 3500);

    return () => {
      isMounted = false;
      unsub();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [handleFinalSubmitRound]);

  if (questions.length === 0 || !currentQ) {
    return (
      <div className="min-h-screen bg-[#070916] flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <div className="w-10 h-10 border-2 border-[#283f5f] border-t-[#9db40c] rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-white">Loading Challenges</h2>
        <p className="text-xs text-slate-400 mt-1">Please wait...</p>
      </div>
    );
  }

  const solvedCount = Object.values(submissions).filter((s) => s.is_solved).length;

  return (
    <div className="min-h-screen bg-[#070916] text-white flex flex-col selection:bg-[#031c6c] selection:text-white pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#070916]/95 backdrop-blur-md border-b border-[#283f5f] px-3 py-2.5 sm:px-6 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#031c6c] border border-[#283f5f] flex items-center justify-center text-[#9db40c] group-hover:scale-105 transition-transform">
                <Bug className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                <span className="font-bold text-xs sm:text-sm tracking-tight text-white block">
                  BugBusters
                </span>
                <span className="text-[9px] sm:text-[10px] font-semibold text-[#9db40c] uppercase tracking-wider block">
                  Hands-On Debugging
                </span>
              </div>
            </Link>

            <span className="hidden sm:inline-block text-[#283f5f]">|</span>

            {/* Section Badge */}
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#031c6c]/40 text-[#9db40c] border border-[#283f5f]">
              <Code2 className="w-3.5 h-3.5 text-[#9db40c]" />
              <span>Section 2</span>
            </span>
          </div>

          {/* Right Action: Solved Status & Submit Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 font-mono-tabular text-xs">
              <span className="text-slate-400 hidden sm:inline">Solved:</span>
              <span className="bg-[#0d1224] border border-[#283f5f] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-bold text-[#9db40c] text-xs">
                {solvedCount} / {questions.length}
              </span>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsConfirmModalOpen(true)}
              className="gap-1 sm:gap-1.5 font-bold cursor-pointer shadow-xs px-2.5 py-1 sm:px-3 sm:py-1.5"
            >
              <span>Finish</span>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 flex flex-col">
        {/* Mobile View Segmented Control (< lg) */}
        <div className="flex lg:hidden items-center justify-between p-1 bg-[#0d1224] border border-[#283f5f] rounded-xl text-xs font-semibold mb-3 sticky top-[53px] z-30 shadow-md">
          <button
            type="button"
            onClick={() => setMobileTab('problem')}
            className={cn(
              'flex-1 py-1.5 px-2 text-center rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer',
              mobileTab === 'problem'
                ? 'bg-[#031c6c] text-[#9db40c] border border-[#283f5f] font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Problem</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('editor')}
            className={cn(
              'flex-1 py-1.5 px-2 text-center rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer',
              mobileTab === 'editor'
                ? 'bg-[#031c6c] text-[#9db40c] border border-[#283f5f] font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Code Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('results')}
            className={cn(
              'flex-1 py-1.5 px-2 text-center rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer',
              mobileTab === 'results'
                ? 'bg-[#031c6c] text-[#9db40c] border border-[#283f5f] font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Test Results</span>
            {currentOutcome && (
              <span
                className={cn(
                  'ml-1 text-[10px] px-1 py-0.2 rounded font-mono font-bold',
                  currentOutcome.all_passed
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-300'
                )}
              >
                {currentOutcome.passed_count}/{currentOutcome.total_count}
              </span>
            )}
          </button>
        </div>

        {/* Dual-Column Desktop Grid / Responsive Mobile Views */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
          {/* Left Column (5 Cols on Desktop): Problem Description & Test Cases */}
          <div
            className={cn(
              'lg:col-span-5 flex-col space-y-4',
              mobileTab === 'problem' || mobileTab === 'results' ? 'flex' : 'hidden lg:flex'
            )}
          >
            {/* Problem Statement Card */}
            <Card
              className={cn(
                'p-4 sm:p-5 flex flex-col justify-between space-y-4 border-[#283f5f]',
                mobileTab === 'results' ? 'hidden lg:flex' : 'flex'
              )}
            >
              <div>
                {/* Question Meta Header */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#283f5f]/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono-tabular font-bold text-[#9db40c] bg-[#506022]/20 border border-[#9db40c]/40 px-2 py-0.5 rounded-md">
                      Challenge #{currentIndex + 1}
                    </span>
                    <Badge variant="outline" size="sm" className="capitalize border-[#283f5f] text-slate-300">
                      {currentQ.difficulty}
                    </Badge>
                  </div>

                  {currentSubmission?.is_solved ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#9db40c] bg-[#506022]/20 border border-[#9db40c]/40 px-2.5 py-0.5 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Solved</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 bg-[#0d1224] border border-[#283f5f] px-2.5 py-0.5 rounded-lg">
                      <span>Unsolved</span>
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <div className="mt-3 space-y-2">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {currentQ.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {currentQ.description}
                  </p>
                </div>

                {/* Hints Box */}
                <div className="mt-4 pt-3 border-t border-[#283f5f]/40">
                  <button
                    type="button"
                    onClick={() => setShowHint(!showHint)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9db40c] hover:text-[#b0c90e] transition-colors cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showHint ? 'Hide Debugging Hints' : 'Need a Hint?'}</span>
                  </button>

                  {showHint && (
                    <div className="mt-2.5 p-3 rounded-xl bg-[#070916] border border-[#283f5f] text-xs text-slate-300 space-y-1.5">
                      {currentQ.hints.map((h, i) => (
                        <p key={i} className="flex items-start gap-1.5">
                          <span className="text-[#9db40c] font-bold">•</span>
                          <span>{h}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Jump to Code Button on Mobile */}
              <div className="pt-2 lg:hidden">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setMobileTab('editor')}
                  className="w-full text-xs font-bold gap-1.5 cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Open Code Editor</span>
                </Button>
              </div>
            </Card>

            {/* Test Cases Viewer */}
            <Card
              className={cn(
                'p-4 sm:p-5 flex flex-col space-y-3 border-[#283f5f]',
                mobileTab === 'problem' ? 'hidden lg:flex' : 'flex'
              )}
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#283f5f]/60">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Verification Test Cases
                </h3>
                <span className="text-[11px] text-slate-400 font-mono-tabular font-semibold">
                  {currentOutcome ? `${currentOutcome.passed_count}/${currentQ.test_cases.length} Passed` : `${currentQ.test_cases.length} Cases`}
                </span>
              </div>

              <div className="space-y-2 max-h-72 sm:max-h-80 overflow-y-auto pr-1">
                {currentQ.test_cases.map((tc, i) => {
                  const testRes = currentOutcome?.test_results?.[i];
                  const isPassed = testRes?.passed;
                  const isFailed = testRes && !testRes.passed;

                  return (
                    <div
                      key={i}
                      className={cn(
                        'p-2.5 rounded-xl border text-xs font-mono-tabular space-y-1.5 transition-colors',
                        isPassed
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                          : isFailed
                          ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                          : 'bg-[#070916] border-[#283f5f] text-slate-300'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">
                          Case #{i + 1}: {tc.description}
                        </span>
                        {isPassed && (
                          <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Pass
                          </span>
                        )}
                        {isFailed && (
                          <span className="text-rose-400 text-[11px] font-bold flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Fail
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400">
                        <span>Input: </span>
                        <code className="text-white bg-[#0d1224] px-1 py-0.5 rounded border border-[#283f5f]/40">
                          {JSON.stringify(tc.inputs)}
                        </code>
                      </div>

                      <div className="text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-1">
                        <div>
                          <span>Expected: </span>
                          <code className="text-emerald-400 bg-[#0d1224] px-1 py-0.5 rounded border border-[#283f5f]/40">
                            {JSON.stringify(tc.expected)}
                          </code>
                        </div>

                        {testRes && (
                          <div>
                            <span>Actual: </span>
                            <code className={cn('px-1 py-0.5 rounded border border-[#283f5f]/40', isPassed ? 'text-emerald-400' : 'text-rose-400')}>
                              {testRes.error ? `Error: ${testRes.error}` : JSON.stringify(testRes.actual)}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* On mobile: Quick button back to editor */}
              <div className="pt-2 lg:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMobileTab('editor')}
                  className="w-full border-[#283f5f] text-slate-300 text-xs font-semibold"
                >
                  <Code2 className="w-3.5 h-3.5 mr-1" />
                  <span>Back to Code Editor</span>
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column (7 Cols on Desktop): Code Editor & Execution Console */}
          <div
            className={cn(
              'lg:col-span-7 flex-col space-y-4',
              mobileTab === 'editor' ? 'flex' : 'hidden lg:flex'
            )}
          >
            <Card className="p-0 overflow-hidden flex flex-col h-full border-[#283f5f]">
              {/* Editor Top Toolbar */}
              <div className="p-2.5 sm:p-3 bg-[#070916] border-b border-[#283f5f] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                {/* 5-Language Selector Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 max-w-full">
                  {(['python', 'javascript', 'java', 'c', 'cpp'] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => handleLanguageSwitch(lang)}
                      className={cn(
                        'px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
                        currentLang === lang
                          ? 'bg-[#031c6c] text-[#9db40c] border border-[#283f5f] shadow-xs'
                          : 'bg-[#0d1224] text-slate-400 hover:text-white border border-[#283f5f]/40'
                      )}
                    >
                      {LANGUAGE_LABELS[lang]}
                    </button>
                  ))}
                </div>

                {/* Action Buttons: Reset & Run */}
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetCode}
                    title="Reset to original buggy code"
                    className="h-8 px-2.5 text-xs text-slate-300 hover:text-white border-[#283f5f]"
                  >
                    <RotateCcw className="w-3.5 h-3.5 sm:mr-1" />
                    <span className="hidden sm:inline">Reset</span>
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={runCode}
                    disabled={isRunning}
                    className="h-8 px-4 text-xs font-bold gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Play className={cn('w-3.5 h-3.5 fill-current text-[#070916]', isRunning && 'animate-spin')} />
                    <span>{isRunning ? 'Running...' : 'Run Code'}</span>
                  </Button>
                </div>
              </div>

              {/* Code Editor Body */}
              <div className="relative flex-1 min-h-[320px] sm:min-h-[380px] bg-[#070916]">
                <textarea
                  ref={editorRef}
                  value={currentCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  className="w-full h-full min-h-[320px] sm:min-h-[380px] p-3 sm:p-4 font-mono text-xs sm:text-sm text-slate-100 bg-transparent resize-none focus:outline-none leading-relaxed selection:bg-[#031c6c] selection:text-white"
                  placeholder="// Type your code fix here..."
                />
              </div>

              {/* Bottom Console / Terminal Output */}
              <div className="border-t border-[#283f5f] bg-[#050711]">
                <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#070916] border-b border-[#283f5f]/60 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('tests')}
                      className={cn(
                        'px-2.5 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer',
                        activeTab === 'tests'
                          ? 'bg-[#031c6c] text-[#9db40c] border border-[#283f5f] font-bold'
                          : 'text-slate-400 hover:text-white'
                      )}
                    >
                      Status
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('terminal')}
                      className={cn(
                        'px-2.5 py-1 rounded-md font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer',
                        activeTab === 'terminal'
                          ? 'bg-[#031c6c] text-[#9db40c] border border-[#283f5f] font-bold'
                          : 'text-slate-400 hover:text-white'
                      )}
                    >
                      <Terminal className="w-3 h-3 text-[#9db40c]" />
                      <span>Console Log</span>
                      {currentOutcome?.logs && currentOutcome.logs.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-[#9db40c] animate-pulse ml-1" />
                      )}
                    </button>
                  </div>

                  {currentOutcome && (
                    <div className="font-mono-tabular text-xs">
                      {currentOutcome.all_passed ? (
                        <span className="text-[#9db40c] font-bold flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-[#9db40c]" /> All Passed!
                        </span>
                      ) : (
                        <span className="text-slate-300 font-semibold">
                          <span className="text-[#9db40c] font-bold">{currentOutcome.passed_count}</span>/{currentOutcome.total_count} Passed
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Console Body */}
                <div className="p-3 text-xs font-mono max-h-36 min-h-20 overflow-y-auto space-y-1">
                  {activeTab === 'terminal' ? (
                    currentOutcome?.logs && currentOutcome.logs.length > 0 ? (
                      currentOutcome.logs.map((log, i) => (
                        <div key={i} className="text-slate-300 leading-tight">
                          <span className="text-slate-500 mr-2">&gt;</span>
                          <span>{log}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 italic py-1">
                        No console output. Use print statements to inspect variables.
                      </div>
                    )
                  ) : currentOutcome?.error ? (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Compiler / Runtime Error:
                      </p>
                      <pre className="text-[11px] whitespace-pre-wrap">{currentOutcome.error}</pre>
                    </div>
                  ) : currentOutcome ? (
                    <div className="py-1 space-y-1">
                      <p className={currentOutcome.all_passed ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                        {currentOutcome.all_passed
                          ? '✓ Excellent! Your solution passed all test cases. Fix saved successfully.'
                          : `Execution finished: ${currentOutcome.passed_count} of ${currentOutcome.total_count} test cases passed. Inspect test results.`}
                      </p>
                    </div>
                  ) : (
                    <div className="text-slate-500 italic py-1">
                      Click &ldquo;Run Code&rdquo; to test your fix against the validation suite.
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Navigation Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#070916]/95 backdrop-blur-md border-t border-[#283f5f] px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Previous Question */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToQuestion(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="text-xs border-[#283f5f] text-slate-300 hover:text-white px-2.5 sm:px-3"
          >
            <ChevronLeft className="w-4 h-4 mr-0.5 sm:mr-1" />
            <span className="hidden sm:inline">Prev</span>
          </Button>

          {/* Quick Jump Palette (10 numbers) */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto max-w-[220px] sm:max-w-md py-0.5">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const isSolved = submissions[q.id]?.is_solved;

              return (
                <button
                  key={q.id}
                  onClick={() => goToQuestion(idx)}
                  className={cn(
                    'w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold font-mono-tabular transition-all shrink-0 cursor-pointer flex items-center justify-center',
                    isCurrent
                      ? 'ring-2 ring-[#9db40c] bg-[#031c6c] text-[#9db40c] font-extrabold shadow-sm'
                      : isSolved
                      ? 'bg-[#506022]/40 text-[#9db40c] border border-[#9db40c]/50 hover:bg-[#506022]/60'
                      : 'bg-[#0d1224] text-slate-400 border border-[#283f5f] hover:text-white hover:border-slate-400'
                  )}
                  title={`Question ${idx + 1}${isSolved ? ' (Solved)' : ''}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Next Question or Finish */}
          {currentIndex < questions.length - 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToQuestion(currentIndex + 1)}
              className="text-xs border-[#283f5f] text-slate-300 hover:text-white font-semibold px-2.5 sm:px-3"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4 ml-0.5 sm:ml-1" />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsConfirmModalOpen(true)}
              className="text-xs font-bold cursor-pointer px-2.5 sm:px-3"
            >
              <span>Finish</span>
              <Send className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>
      </footer>

      {/* Final Round Submission Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Finish & Submit?"
        description="Review your progress before submitting."
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#070916] border border-[#283f5f] space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Total Solved:</span>
              <span className="font-bold text-[#9db40c] font-mono-tabular text-base">
                {solvedCount} / {questions.length}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-[#283f5f]/60">
              {questions.map((q, i) => {
                const isSolved = submissions[q.id]?.is_solved;
                return (
                  <div
                    key={q.id}
                    className={cn(
                      'py-1.5 px-2 rounded-lg text-center text-xs font-mono-tabular font-bold border',
                      isSolved
                        ? 'bg-[#506022]/20 border-[#9db40c]/40 text-[#9db40c]'
                        : 'bg-[#0d1224] border-[#283f5f] text-slate-500'
                    )}
                  >
                    #{i + 1} {isSolved ? '✓' : '—'}
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Your results will be submitted and saved.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#283f5f]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={isSubmittingRound}
            >
              Keep Answering
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleFinalSubmitRound(false)}
              disabled={isSubmittingRound}
              className="font-bold gap-1.5 cursor-pointer shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmittingRound ? 'Submitting...' : 'Submit Final Results'}</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Anti-cheating Toast */}
      {activeWarning && (
        <ViolationWarningToast
          warning={activeWarning}
          violationCount={participant?.violation_count || 1}
          onDismiss={dismissWarning}
        />
      )}
    </div>
  );
}
