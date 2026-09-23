export type CorrectOption = 'A' | 'B' | 'C' | 'D' | 'a' | 'b' | 'c' | 'd';

export type QuizStatus = 'draft' | 'live' | 'closed';

export type QuestionType = 'quiz' | 'debug';

/**
 * Maps directly to Supabase TABLE: questions & /data/questions.json
 */
export interface Question {
  question_id: number;
  question: string;
  code_snippet?: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string; // 'A' | 'B' | 'C' | 'D'
  explanation: string;
  category?: string; // 'quiz' | 'debugging'
  language?: string; // 'Python' | 'Java' | 'C' | 'General'
  question_type?: QuestionType; // 'quiz' | 'debug'
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Maps directly to Supabase TABLE: quizzes
 */
export interface Quiz {
  quiz_id: number;
  title: string;
  code: string;
  question_ids: number[];
  question_count: number;
  duration_minutes: number;
  status: QuizStatus;
  created_at: string;
  description?: string;
}

export interface CreateQuizInput {
  title: string;
  code: string;
  question_ids: number[];
  question_count: number;
  duration_minutes: number;
  status: QuizStatus;
  description?: string;
}

export interface UpdateQuizInput {
  title?: string;
  code?: string;
  question_ids?: number[];
  question_count?: number;
  duration_minutes?: number;
  status?: QuizStatus;
  description?: string;
}

/**
 * Shuffled option format presented to participants
 */
export interface RandomizedOption {
  key: string; // the original option letter ('A', 'B', 'C', or 'D')
  text: string;
  displayIndex: number; // 0=A, 1=B, 2=C, 3=D in UI
  displayLabel: string; // 'A' | 'B' | 'C' | 'D' in UI
}

/**
 * Deterministically randomized question for the participant session
 */
export interface SessionQuestion {
  question_id: number;
  question: string;
  code_snippet?: string;
  category?: string;
  language?: string;
  question_type: QuestionType; // 'quiz' | 'debug'
  options: RandomizedOption[];
  correct_option: string; // 'A' | 'B' | 'C' | 'D'
  explanation: string;
}

/**
 * Client quiz attempt session state
 */
export interface QuizSession {
  sessionId: string;
  quiz_id: number;
  quiz_title: string;
  quiz_code: string;
  participant_id: number;
  participant_name: string;
  phone: string;
  questions: SessionQuestion[];
  answers: Record<number, string>; // question_id -> chosen original option key ('A' | 'B' | 'C' | 'D')
  currentQuestionIndex: number;
  startTime: string;
  durationMinutes: number;
  endTimeExpected: string; // ISO string when timer expires
  submittedAt?: string;
  isSubmitted: boolean;
  violationCount: number;
}
