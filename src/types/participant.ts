export type ParticipantStatus = 'active' | 'completed' | 'flagged';

/**
 * Maps directly to Supabase TABLE: participants
 */
export interface Participant {
  participant_id: number;
  name: string;
  phone: string; // e.g. +91 98765 43210
  quiz_id: number;
  start_time: string | null;
  end_time: string | null;
  score: number | null;
  status: ParticipantStatus;
  violation_count: number;
  current_question?: number;
  total_questions?: number;
  last_activity_time?: string;
  last_activity_description?: string;
}

export interface CreateParticipantInput {
  name: string;
  phone: string;
  quiz_id: number;
}

export interface QuestionReviewItem {
  question_id: number;
  question_index: number;
  question: string;
  user_selected_key: string | null; // 'A' | 'B' | 'C' | 'D' or null
  user_selected_text: string | null; // e.g. "Queue" or null
  correct_option_key: string; // 'B'
  correct_option_text: string; // e.g. "Stack"
  is_correct: boolean;
  is_unanswered: boolean;
  explanation: string;
}

export interface ParticipantResult {
  participant_id: number;
  name: string;
  phone: string;
  quiz_id: number;
  quiz_title: string;
  score: number;
  total_questions: number;
  percentage: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  violation_count: number;
  time_taken_seconds: number;
  time_taken_formatted: string;
  submitted_at: string;
  review_items: QuestionReviewItem[];
}
