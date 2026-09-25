import { Question, Quiz, SessionQuestion, QuizSession, RandomizedOption } from '@/types/quiz';
import { Participant } from '@/types/participant';
import { quizService } from '@/lib/api/quizService';

const SESSION_STORAGE_PREFIX = 'bugbusters_session_';

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const DISPLAY_LETTERS = ['A', 'B', 'C', 'D'];

export function randomizeQuestionOptions(q: Question): SessionQuestion {
  const originalOptions: { key: string; text: string }[] = [
    { key: 'A', text: q.option_a },
    { key: 'B', text: q.option_b },
    { key: 'C', text: q.option_c },
    { key: 'D', text: q.option_d },
  ];

  // Shuffle the options order
  const shuffled = shuffleArray(originalOptions);

  const options: RandomizedOption[] = shuffled.map((item, index) => ({
    key: item.key,
    text: item.text,
    displayIndex: index,
    displayLabel: DISPLAY_LETTERS[index] || 'A',
  }));

  const hasCode = Boolean(q.code_snippet && q.code_snippet.trim().length > 0);
  const qType = q.question_type || (hasCode ? 'debug' : 'quiz');

  return {
    question_id: q.question_id,
    concept_id: q.concept_id,
    question: q.question,
    code_snippet: q.code_snippet,
    category: q.category || (qType === 'debug' ? 'debugging' : 'quiz'),
    language: q.language || 'General',
    question_type: qType,
    options,
    correct_option: q.correct_option.toUpperCase(),
    explanation: q.explanation || 'No explanation provided.',
  };
}

export function getQuestionAnswer(
  q: SessionQuestion,
  answers: Record<string | number, string> | undefined | null
): string | null {
  if (!answers) return null;
  const direct = answers[q.question_id];
  if (direct && typeof direct === 'string' && direct.trim().length > 0) {
    return direct.trim().toUpperCase();
  }
  if (q.concept_id) {
    const concept = (answers as Record<string, string>)[q.concept_id];
    if (concept && typeof concept === 'string' && concept.trim().length > 0) {
      return concept.trim().toUpperCase();
    }
  }
  return null;
}

export function isQuestionAnswered(
  q: SessionQuestion,
  answers: Record<string | number, string> | undefined | null
): boolean {
  return getQuestionAnswer(q, answers) !== null;
}

export async function createOrRestoreQuizSession(
  quiz: Quiz,
  participant: Participant
): Promise<QuizSession> {
  const storageKey = `${SESSION_STORAGE_PREFIX}${quiz.quiz_id}_${participant.participant_id}`;

  if (typeof window !== 'undefined') {
    try {
      let existing = localStorage.getItem(storageKey);
      if (!existing) {
        existing = sessionStorage.getItem(storageKey);
      }
      if (existing) {
        const session: QuizSession = JSON.parse(existing);
        // Validate if it's the exact same quiz and participant
        if (session.quiz_id === quiz.quiz_id && session.participant_id === participant.participant_id) {
          const now = Date.now();
          const endMs = new Date(session.endTimeExpected).getTime();

          // Restore any unsubmitted active session
          if (!session.isSubmitted) {
            return session;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to restore session:', e);
    }
  }

  // Generate new stable session
  // 1. Fetch available questions for this quiz from the shared question bank
  const allAvailable = await quizService.getQuestions(quiz.question_ids);

  // 2. Select exactly the configured question_count from the pool using an independent shuffle
  const selectedCount = Math.min(quiz.question_count, allAvailable.length);
  const shuffledQuestions = shuffleArray(allAvailable).slice(0, selectedCount);

  // 3. Randomize answer option order for each question individually
  const sessionQuestions: SessionQuestion[] = shuffledQuestions.map(randomizeQuestionOptions);

  const startTime = new Date().toISOString();
  const endTimeExpected = new Date(Date.now() + quiz.duration_minutes * 60 * 1000).toISOString();

  const newSession: QuizSession = {
    sessionId: `sess_${quiz.quiz_id}_${participant.participant_id}_${Date.now()}`,
    quiz_id: quiz.quiz_id,
    quiz_title: quiz.title,
    quiz_code: quiz.code,
    participant_id: participant.participant_id,
    participant_name: participant.name,
    phone: participant.phone,
    questions: sessionQuestions,
    answers: {},
    currentQuestionIndex: 0,
    startTime,
    durationMinutes: quiz.duration_minutes,
    endTimeExpected,
    isSubmitted: false,
    violationCount: participant.violation_count || 0,
  };

  saveQuizSession(newSession);
  return newSession;
}

export function updateSessionDuration(
  session: QuizSession,
  newDurationMinutes: number
): { updatedSession: QuizSession; hasExpired: boolean } {
  const startMs = new Date(session.startTime).getTime();
  const newEndMs = startMs + newDurationMinutes * 60 * 1000;
  const now = Date.now();
  const hasExpired = now >= newEndMs;

  const updatedSession: QuizSession = {
    ...session,
    durationMinutes: newDurationMinutes,
    endTimeExpected: new Date(newEndMs).toISOString(),
  };

  saveQuizSession(updatedSession);
  return { updatedSession, hasExpired };
}

export function saveQuizSession(session: QuizSession): void {
  if (typeof window !== 'undefined') {
    try {
      const storageKey = `${SESSION_STORAGE_PREFIX}${session.quiz_id}_${session.participant_id}`;
      const json = JSON.stringify(session);
      localStorage.setItem(storageKey, json);
      sessionStorage.setItem(storageKey, json);
    } catch (e) {
      console.warn('Failed to persist session:', e);
    }
  }
}

export function clearQuizSession(quizId: number, participantId: number): void {
  if (typeof window !== 'undefined') {
    try {
      const storageKey = `${SESSION_STORAGE_PREFIX}${quizId}_${participantId}`;
      localStorage.removeItem(storageKey);
      sessionStorage.removeItem(storageKey);
    } catch (e) {
      console.warn('Failed to clear session:', e);
    }
  }
}
