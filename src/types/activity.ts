export type ActivityEventType =
  | 'tab_switch'
  | 'focus_loss'
  | 'fullscreen_exit'
  | 'copy_attempt'
  | 'paste_attempt'
  | 'context_menu'
  | 'dev_tools'
  | 'answer_selected'
  | 'quiz_started'
  | 'quiz_submitted'
  | 'flag_cleared'
  | 'flag_added';

/**
 * Maps directly to Supabase TABLE: participant_activity
 */
export interface ParticipantActivity {
  activity_id: number;
  participant_id: number;
  participant_name?: string;
  registration_number?: string;
  question_id: number | null;
  event_type: ActivityEventType;
  selected_option: string | null;
  event_time: string;
  details?: string;
  severity?: 'normal' | 'warning' | 'violation';
}

export interface RecordActivityInput {
  participant_id: number;
  participant_name?: string;
  registration_number?: string;
  question_id?: number | null;
  event_type: ActivityEventType;
  selected_option?: string | null;
  details?: string;
}
