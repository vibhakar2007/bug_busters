import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QuizSession, Quiz } from '@/types/quiz';
import { Participant } from '@/types/participant';
import { quizService } from '@/lib/api/quizService';
import { participantService } from '@/lib/api/participantService';
import { activityService } from '@/lib/api/activityService';
import { questionService } from '@/lib/api/questionService';
import {
  createOrRestoreQuizSession,
  saveQuizSession,
  updateSessionDuration,
  randomizeQuestionOptions,
  getQuestionAnswer,
  isQuestionAnswered,
} from '@/lib/quiz/sessionEngine';
import { calculateQuizResult } from '@/lib/quiz/scoring';
import { realtimeBus } from '@/lib/api/eventBus';
import { formatDurationSeconds } from '@/lib/utils/time';

interface UseQuizProps {
  quizCode?: string;
  phone?: string;
}

export function useQuiz({ quizCode, phone }: UseQuizProps) {
  const router = useRouter();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const sessionRef = useRef<QuizSession | null>(null);
  const progressDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingProgressRef = useRef<{ participantId: number; answeredCount: number; qIndex: number; total: number } | null>(null);

  const flushPendingProgress = useCallback(() => {
    if (progressDebounceTimerRef.current) {
      clearTimeout(progressDebounceTimerRef.current);
      progressDebounceTimerRef.current = null;
    }
    if (pendingProgressRef.current) {
      const { participantId, answeredCount, qIndex, total } = pendingProgressRef.current;
      pendingProgressRef.current = null;
      participantService
        .updateParticipant(participantId, {
          current_question: answeredCount,
          last_activity_description: `Answered Question ${qIndex + 1} (${answeredCount}/${total})`,
        })
        .catch((err) => console.warn('Failed to update participant progress:', err));
    }
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Submit Quiz Callback
  const submitQuiz = useCallback(async (isAutoClosed = false) => {
    flushPendingProgress();
    const currentSession = sessionRef.current;
    if (!currentSession || currentSession.isSubmitted) return;
    setIsSubmitting(true);

    try {
      // Ensure we fetch latest participant state to guarantee accurate violation counts
      const latestParticipant = await participantService.getParticipant(currentSession.participant_id);
      const exactViolations = Math.max(
        latestParticipant?.violation_count ?? 0,
        currentSession.violationCount ?? 0
      );

      const submissionTime = new Date().toISOString();
      const finalizedSession: QuizSession = {
        ...currentSession,
        violationCount: exactViolations,
        isSubmitted: true,
        submittedAt: submissionTime,
      };

      saveQuizSession(finalizedSession);

      // Calculate score & results with complete review items
      const result = calculateQuizResult(finalizedSession);

      // Authoritative time taken calculation
      const startMs = latestParticipant?.start_time
        ? new Date(latestParticipant.start_time).getTime()
        : new Date(currentSession.startTime).getTime();
      const endMs = new Date(submissionTime).getTime();
      const durationSec = Math.max(1, Math.round((endMs - startMs) / 1000));
      const formattedTime = formatDurationSeconds(durationSec);

      result.end_time = submissionTime;
      result.time_taken_seconds = durationSec;
      result.time_taken_formatted = formattedTime;

      // Save result in localStorage and sessionStorage for /result page
      if (typeof window !== 'undefined') {
        const json = JSON.stringify(result);
        localStorage.setItem('bugbusters_latest_result', json);
        sessionStorage.setItem('bugbusters_latest_result', json);
      }

      // Record result in participant service repository for admin review
      const autoClosed = isAutoClosed === true;

      if (autoClosed) {
        // Event closed! Mark participant completed immediately
        await participantService.updateParticipant(currentSession.participant_id, {
          score: result.score,
          violation_count: exactViolations,
          status: 'completed',
          end_time: submissionTime,
          time_taken_seconds: durationSec,
          time_taken_formatted: formattedTime,
          last_activity_description: 'Event concluded by administrator',
        });

        await activityService.recordActivity({
          participant_id: currentSession.participant_id,
          participant_name: currentSession.participant_name,
          registration_number: currentSession.phone,
          question_id: null,
          event_type: 'quiz_submitted',
          details: `Event concluded by administrator. Quiz auto-submitted (${result.score}/${result.total_questions}).`,
        });

        window.location.href = `/result?closed=true&pid=${currentSession.participant_id}`;
      } else {
        // Update participant in DB with Phase 1 MCQ score
        await participantService.updateParticipant(currentSession.participant_id, {
          score: result.score,
          violation_count: exactViolations,
          time_taken_seconds: durationSec,
          time_taken_formatted: formattedTime,
          status: 'active',
          last_activity_description: `Phase 1 completed (${result.score}/${result.total_questions}) - Starting Hands-On Debugging`,
        });

        // Record activity
        await activityService.recordActivity({
          participant_id: currentSession.participant_id,
          participant_name: currentSession.participant_name,
          registration_number: currentSession.phone,
          question_id: null,
          event_type: 'answer_selected',
          details: `Phase 1 completed (${result.score}/${result.total_questions}). Advancing to Phase 2: Hands-On Debugging.`,
        });

        // Store active participant credentials so Hands-on Debugging has immediate access
        if (typeof window !== 'undefined') {
          const participantObj = {
            ...latestParticipant,
            participant_id: currentSession.participant_id,
            name: currentSession.participant_name,
            phone: currentSession.phone,
            quiz_id: currentSession.quiz_id,
            score: result.score,
            status: 'active',
          };
          sessionStorage.setItem('bugbusters_active_participant', JSON.stringify(participantObj));
          localStorage.setItem('bugbusters_active_participant', JSON.stringify(participantObj));
          localStorage.setItem('bugbusters_active_participant_id', String(currentSession.participant_id));
        }

        // Direct, infallible redirection to Hands-On Live Debugging round
        window.location.href = `/hands-on-debug?pid=${currentSession.participant_id}`;
      }
    } catch (err) {
      console.error('Failed to submit quiz:', err);
      setIsSubmitting(false);
    }
  }, [router, flushPendingProgress]);

  // Initialize session
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      setIsLoading(true);
      setError(null);

      try {
        let code = quizCode || '';
        let participantPhone = phone || '';
        let participantId: number | null = null;

        // 1. Read URL query parameters (essential for mobile tunnels)
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const uCode = urlParams.get('code');
          const uPhone = urlParams.get('phone');
          const uPid = urlParams.get('pid');

          if (uCode) code = uCode;
          if (uPhone) participantPhone = uPhone;
          if (uPid) participantId = Number(uPid);

          // 2. Fallback to localStorage or default TECH26
          if (!code) code = localStorage.getItem('bugbusters_active_quiz_code') || 'TECH26';
          if (!participantPhone) {
            participantPhone =
              localStorage.getItem('bugbusters_active_phone') ||
              localStorage.getItem('bugbusters_active_reg_no') ||
              '';
          }
          if (!participantId) {
            const sPid = localStorage.getItem('bugbusters_active_participant_id');
            if (sPid) participantId = Number(sPid);
          }
        }

        if (!code || !participantPhone) {
          setError('No active quiz session found. Please enter through the join page.');
          setIsLoading(false);
          return;
        }

        // 3. Fetch quiz from quizService or host machine API
        let quiz = await quizService.getQuizByCode(code);
        if (!quiz) {
          try {
            const qRes = await fetch('/api/quizzes?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true', {
              headers: {
                'Accept': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                'bypass-tunnel-reminder': 'true',
              },
            });
            if (qRes.ok) {
              const text = await qRes.text();
              const allQuizzes: Quiz[] = JSON.parse(text);
              if (Array.isArray(allQuizzes)) {
                quiz = allQuizzes.find((q) => q.code.toUpperCase() === code.toUpperCase()) || null;
              }
            }
          } catch (e) {
            console.warn('Failed direct fetch of quizzes:', e);
          }
        }

        if (!quiz) {
          setError(`Quiz code "${code}" not found.`);
          setIsLoading(false);
          return;
        }

        if (quiz.status === 'closed') {
          window.location.href = `/result?closed=true${participantId ? `&pid=${participantId}` : ''}`;
          return;
        }

        // 4. Fetch participant directly from host machine API
        let participant: Participant | null = null;
        try {
          const queryUrl = participantId
            ? `/api/participants/${participantId}?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true`
            : `/api/participants?phone=${encodeURIComponent(participantPhone)}&quiz_id=${quiz.quiz_id}&ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true`;

          const pRes = await fetch(queryUrl, {
            headers: {
              'Accept': 'application/json',
              'ngrok-skip-browser-warning': 'true',
              'bypass-tunnel-reminder': 'true',
            },
          });
          if (pRes.ok) {
            const text = await pRes.text();
            participant = JSON.parse(text);
          }
        } catch (e) {
          console.warn('Failed direct fetch of participant from machine:', e);
        }

        if (!participant) {
          participant = await participantService.getParticipantByPhone(participantPhone, quiz.quiz_id);
        }

        if (!participant && typeof window !== 'undefined') {
          const storedPart = sessionStorage.getItem('bugbusters_active_participant');
          if (storedPart) {
            try {
              participant = JSON.parse(storedPart);
            } catch {}
          }
        }

        if (!participant) {
          setError('Participant record not found. Please return to the join page and enter your credentials.');
          setIsLoading(false);
          return;
        }

        if (participant.status === 'completed') {
          if (participant.hands_on_score !== undefined && participant.hands_on_score !== null) {
            window.location.href = `/result?pid=${participant.participant_id}`;
          } else {
            window.location.href = `/hands-on-debug?pid=${participant.participant_id}`;
          }
          return;
        }

        const activeSession = await createOrRestoreQuizSession(quiz, participant);
        if (isMounted) {
          setSession(activeSession);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        console.error('Error initializing quiz session:', err);
        if (isMounted) {
          setError('Failed to load quiz session. Please check your connection.');
          setIsLoading(false);
        }
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [quizCode, phone, router]);

  // Listen for authoritative quiz closure during quiz
  useEffect(() => {
    if (!session || session.isSubmitted) return;

    let isMounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    const handleQuizClosed = () => {
      if (isMounted) {
        submitQuiz(true);
      }
    };

    const unsub = realtimeBus.on<{ quiz_id?: number; status?: string }>('quiz_status_changed', (evt) => {
      if (evt && (evt.quiz_id === undefined || evt.quiz_id === session.quiz_id) && evt.status === 'closed') {
        handleQuizClosed();
      }
    });

    pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/quizzes/${session.quiz_id}?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true`, {
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
  }, [session, submitQuiz]);

  // Listen for dynamic admin duration changes
  useEffect(() => {
    const unsubscribe = realtimeBus.on<{ quiz_id: number; duration_minutes: number }>(
      'quiz_duration_changed',
      (payload) => {
        const current = sessionRef.current;
        if (!current || current.isSubmitted || current.quiz_id !== payload.quiz_id) return;

        const { updatedSession, hasExpired } = updateSessionDuration(
          current,
          payload.duration_minutes
        );

        setSession(updatedSession);

        if (hasExpired) {
          console.warn('New quiz duration has already elapsed. Submitting quiz now.');
          submitQuiz();
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [submitQuiz]);

  // Answer selection
  const selectOption = useCallback((optionKey: string) => {
    const current = sessionRef.current;
    if (!current || current.isSubmitted) return;

    const currentQ = current.questions[current.currentQuestionIndex];
    if (!currentQ) return;

    const normKey = optionKey.trim().toUpperCase();
    const updatedAnswers = {
      ...current.answers,
      [currentQ.question_id]: normKey,
    };

    if (currentQ.concept_id) {
      (updatedAnswers as unknown as Record<string, string>)[currentQ.concept_id] = normKey;
    }

    const updatedSession: QuizSession = {
      ...current,
      answers: updatedAnswers,
    };

    sessionRef.current = updatedSession;
    setSession(updatedSession);
    saveQuizSession(updatedSession);

    // Calculate exact number of answered questions in the session
    const actualAnsweredCount = current.questions.filter((q) => {
      if (q.question_id === currentQ.question_id) return true;
      return isQuestionAnswered(q, updatedAnswers);
    }).length;

    // Throttle/debounce participant progress calls so rapid clicks don't saturate Cloudflare tunnel
    pendingProgressRef.current = {
      participantId: current.participant_id,
      answeredCount: actualAnsweredCount,
      qIndex: current.currentQuestionIndex,
      total: current.questions.length,
    };

    if (progressDebounceTimerRef.current) {
      clearTimeout(progressDebounceTimerRef.current);
    }
    progressDebounceTimerRef.current = setTimeout(() => {
      flushPendingProgress();
    }, 1200);
  }, [flushPendingProgress]);

  // Navigation
  const goToNext = useCallback(() => {
    flushPendingProgress();
    const current = sessionRef.current;
    if (!current) return;
    if (current.currentQuestionIndex < current.questions.length - 1) {
      const updated: QuizSession = {
        ...current,
        currentQuestionIndex: current.currentQuestionIndex + 1,
      };
      sessionRef.current = updated;
      setSession(updated);
      saveQuizSession(updated);
    }
  }, [flushPendingProgress]);

  const goToPrevious = useCallback(() => {
    flushPendingProgress();
    const current = sessionRef.current;
    if (!current) return;
    if (current.currentQuestionIndex > 0) {
      const updated: QuizSession = {
        ...current,
        currentQuestionIndex: current.currentQuestionIndex - 1,
      };
      sessionRef.current = updated;
      setSession(updated);
      saveQuizSession(updated);
    }
  }, [flushPendingProgress]);

  const goToQuestion = useCallback((index: number) => {
    flushPendingProgress();
    const current = sessionRef.current;
    if (!current) return;
    if (index >= 0 && index < current.questions.length) {
      const updated: QuizSession = {
        ...current,
        currentQuestionIndex: index,
      };
      sessionRef.current = updated;
      setSession(updated);
      saveQuizSession(updated);
    }
  }, [flushPendingProgress]);

  const syncViolationCount = useCallback((count?: number) => {
    const current = sessionRef.current;
    if (!current) return;
    const newCount = count !== undefined ? count : (current.violationCount || 0) + 1;
    const updated = { ...current, violationCount: newCount };
    sessionRef.current = updated;
    setSession(updated);
    saveQuizSession(updated);
  }, []);

  const switchDebugLanguage = useCallback(
    async (targetLanguage: string) => {
      const current = sessionRef.current;
      if (!current || current.isSubmitted) return;

      const currentQ = current.questions[current.currentQuestionIndex];
      if (!currentQ || currentQ.question_type !== 'debug') return;

      if ((currentQ.language || '').trim().toLowerCase() === targetLanguage.trim().toLowerCase()) {
        return;
      }

      // 1. Look up identical concept question in the target language
      let selectedNewQ = currentQ.concept_id
        ? await questionService.getDebugQuestionByConceptAndLanguage(currentQ.concept_id, targetLanguage)
        : null;

      // 2. Fallback: select unused question from debug pool
      if (!selectedNewQ) {
        const debugPool = await questionService.getDebugQuestionsByLanguage(targetLanguage);
        if (debugPool.length === 0) return;
        const currentSlotQId = currentQ.question_id;
        const usedIds = new Set(
          current.questions
            .filter((_, idx) => idx !== current.currentQuestionIndex)
            .map((q) => q.question_id)
        );
        const candidatePool = debugPool.filter(
          (q) => !usedIds.has(q.question_id) && q.question_id !== currentSlotQId
        );
        selectedNewQ = candidatePool.length > 0 ? candidatePool[0] : debugPool[0];
      }

      if (!selectedNewQ) return;

      const newSessionQ = randomizeQuestionOptions(selectedNewQ);

      const updatedQuestions = [...current.questions];
      updatedQuestions[current.currentQuestionIndex] = newSessionQ;

      // 3. Preserve any already answered choice for this question/concept
      const previousAnswerKey = getQuestionAnswer(currentQ, current.answers);

      const updatedAnswers = { ...current.answers };

      if (previousAnswerKey) {
        // Find text of what the student selected
        const oldOption = currentQ.options.find(
          (opt) => opt.key.toUpperCase() === previousAnswerKey.toUpperCase()
        );
        const oldSelectedText = oldOption ? oldOption.text.trim().toLowerCase() : null;

        let matchedKey: string | null = null;
        if (oldSelectedText) {
          const matchedOpt = newSessionQ.options.find(
            (opt) => opt.text.trim().toLowerCase() === oldSelectedText
          );
          if (matchedOpt) {
            matchedKey = matchedOpt.key;
          }
        }

        if (!matchedKey) {
          const hasSameKey = newSessionQ.options.some(
            (opt) => opt.key.toUpperCase() === previousAnswerKey.toUpperCase()
          );
          if (hasSameKey) {
            matchedKey = previousAnswerKey;
          } else {
            matchedKey = newSessionQ.options[0]?.key || 'A';
          }
        }

        if (matchedKey) {
          const upperKey = matchedKey.toUpperCase();
          updatedAnswers[newSessionQ.question_id] = upperKey;
          if (newSessionQ.concept_id) {
            (updatedAnswers as unknown as Record<string, string>)[newSessionQ.concept_id] = upperKey;
          }
        }
      }

      const updatedSession: QuizSession = {
        ...current,
        questions: updatedQuestions,
        answers: updatedAnswers,
      };

      sessionRef.current = updatedSession;
      setSession(updatedSession);
      saveQuizSession(updatedSession);

      activityService
        .recordActivity({
          participant_id: current.participant_id,
          participant_name: current.participant_name,
          registration_number: current.phone,
          question_id: newSessionQ.question_id,
          event_type: 'answer_selected',
          details: `Switched Question #${current.currentQuestionIndex + 1} language to ${targetLanguage}`,
        })
        .catch((err) => console.warn('Failed recording switch language:', err));
    },
    []
  );

  const currentQuestion = session ? session.questions[session.currentQuestionIndex] : null;
  const currentAnswer =
    session && currentQuestion ? getQuestionAnswer(currentQuestion, session.answers) : null;
  const totalQuestions = session ? session.questions.length : 0;
  const answeredCount = session
    ? session.questions.filter((q) => isQuestionAnswered(q, session.answers)).length
    : 0;
  const unansweredIndices = session
    ? session.questions
        .map((q, idx) => (isQuestionAnswered(q, session.answers) ? -1 : idx + 1))
        .filter((idx) => idx !== -1)
    : [];
  const isFirstQuestion = session ? session.currentQuestionIndex === 0 : true;
  const isLastQuestion = session ? session.currentQuestionIndex === totalQuestions - 1 : false;

  return {
    session,
    isLoading,
    error,
    isSubmitting,
    currentQuestion,
    currentQuestionIndex: session ? session.currentQuestionIndex : 0,
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
  };
}
