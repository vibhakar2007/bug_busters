import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QuizSession } from '@/types/quiz';
import { quizService } from '@/lib/api/quizService';
import { participantService } from '@/lib/api/participantService';
import { activityService } from '@/lib/api/activityService';
import { createOrRestoreQuizSession, saveQuizSession, updateSessionDuration } from '@/lib/quiz/sessionEngine';
import { calculateQuizResult } from '@/lib/quiz/scoring';
import { realtimeBus } from '@/lib/api/eventBus';

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

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Submit Quiz Callback
  const submitQuiz = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (!currentSession || currentSession.isSubmitted) return;
    setIsSubmitting(true);

    try {
      const submissionTime = new Date().toISOString();
      const finalizedSession: QuizSession = {
        ...currentSession,
        isSubmitted: true,
        submittedAt: submissionTime,
      };

      saveQuizSession(finalizedSession);

      // Calculate score & results with complete review items
      const result = calculateQuizResult(finalizedSession);

      // Save result in localStorage for /result page
      if (typeof window !== 'undefined') {
        localStorage.setItem('bugbusters_latest_result', JSON.stringify(result));
      }

      // Record result in participant service repository for admin review
      await participantService.recordResult(result);

      // Update participant status in mock DB
      await participantService.updateParticipant(currentSession.participant_id, {
        status: 'completed',
        end_time: submissionTime,
        score: result.score,
        last_activity_description: `Quiz submitted (${result.score}/${result.total_questions})`,
      });

      // Record activity
      await activityService.recordActivity({
        participant_id: currentSession.participant_id,
        participant_name: currentSession.participant_name,
        registration_number: currentSession.phone,
        question_id: null,
        event_type: 'quiz_submitted',
        details: `Final score: ${result.score}/${result.total_questions} (${result.percentage}%)`,
      });

      // Redirect to results
      router.push('/result');
    } catch (err) {
      console.error('Failed to submit quiz:', err);
      setIsSubmitting(false);
    }
  }, [router]);

  // Initialize session
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      setIsLoading(true);
      setError(null);

      try {
        let code = quizCode;
        let participantPhone = phone;

        if (!code || !participantPhone) {
          const storedCode = localStorage.getItem('bugbusters_active_quiz_code');
          const storedPhone =
            localStorage.getItem('bugbusters_active_phone') ||
            localStorage.getItem('bugbusters_active_reg_no');
          if (storedCode && storedPhone) {
            code = storedCode;
            participantPhone = storedPhone;
          }
        }

        if (!code || !participantPhone) {
          setError('No active quiz session found. Please enter through the join page.');
          setIsLoading(false);
          return;
        }

        const quiz = await quizService.getQuizByCode(code);
        if (!quiz) {
          setError(`Quiz code "${code}" not found.`);
          setIsLoading(false);
          return;
        }

        if (quiz.status === 'closed') {
          setError('This quiz is closed and no longer accepting submissions.');
          setIsLoading(false);
          return;
        }

        const participant = await participantService.getParticipantByPhone(participantPhone, quiz.quiz_id);
        if (!participant) {
          setError('Participant record not found. Please join again.');
          setIsLoading(false);
          return;
        }

        if (participant.status === 'completed') {
          router.replace('/result');
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
  const selectOption = useCallback(
    async (optionKey: string) => {
      if (!session || session.isSubmitted) return;

      const currentQ = session.questions[session.currentQuestionIndex];
      if (!currentQ) return;

      const updatedAnswers = {
        ...session.answers,
        [currentQ.question_id]: optionKey.toUpperCase(),
      };

      const updatedSession: QuizSession = {
        ...session,
        answers: updatedAnswers,
      };

      setSession(updatedSession);
      saveQuizSession(updatedSession);

      // Record answer activity asynchronously
      activityService.recordActivity({
        participant_id: session.participant_id,
        participant_name: session.participant_name,
        registration_number: session.phone,
        question_id: currentQ.question_id,
        event_type: 'answer_selected',
        selected_option: optionKey.toUpperCase(),
        details: `Answered Question #${session.currentQuestionIndex + 1} (Option ${optionKey.toUpperCase()})`,
      });

      // Update participant progress in background
      participantService.updateParticipant(session.participant_id, {
        current_question: session.currentQuestionIndex + 1,
        last_activity_description: `Answered Question ${session.currentQuestionIndex + 1}`,
      });
    },
    [session]
  );

  // Navigation
  const goToNext = useCallback(() => {
    if (!session) return;
    if (session.currentQuestionIndex < session.questions.length - 1) {
      const updated: QuizSession = {
        ...session,
        currentQuestionIndex: session.currentQuestionIndex + 1,
      };
      setSession(updated);
      saveQuizSession(updated);
    }
  }, [session]);

  const goToPrevious = useCallback(() => {
    if (!session) return;
    if (session.currentQuestionIndex > 0) {
      const updated: QuizSession = {
        ...session,
        currentQuestionIndex: session.currentQuestionIndex - 1,
      };
      setSession(updated);
      saveQuizSession(updated);
    }
  }, [session]);

  const goToQuestion = useCallback(
    (index: number) => {
      if (!session) return;
      if (index >= 0 && index < session.questions.length) {
        const updated: QuizSession = {
          ...session,
          currentQuestionIndex: index,
        };
        setSession(updated);
        saveQuizSession(updated);
      }
    },
    [session]
  );

  const currentQuestion = session ? session.questions[session.currentQuestionIndex] : null;
  const currentAnswer =
    session && currentQuestion ? session.answers[currentQuestion.question_id] || null : null;
  const totalQuestions = session ? session.questions.length : 0;
  const answeredCount = session ? Object.keys(session.answers).length : 0;
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
    isFirstQuestion,
    isLastQuestion,
    selectOption,
    goToNext,
    goToPrevious,
    goToQuestion,
    submitQuiz,
  };
}
