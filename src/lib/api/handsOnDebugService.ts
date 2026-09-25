import { HandsOnDebugQuestion, HandsOnSessionState, HandsOnSubmission } from '@/types/handsOnDebug';
import handsOnQuestionsData from '../../../data/hands_on_debug.json';

const STORAGE_KEY_PREFIX = 'bugbusters_hands_on_session_';

export const handsOnDebugService = {
  /**
   * Retrieves all 10 hands-on debugging challenges
   */
  async getAllQuestions(): Promise<HandsOnDebugQuestion[]> {
    return handsOnQuestionsData as HandsOnDebugQuestion[];
  },

  /**
   * Retrieves a single challenge by ID
   */
  async getQuestionById(id: number): Promise<HandsOnDebugQuestion | null> {
    const list = await this.getAllQuestions();
    return list.find((q) => q.id === id) || null;
  },

  /**
   * Retrieves or initializes the local session state for hands-on debugging
   */
  getSession(participantId: number): HandsOnSessionState {
    if (typeof window === 'undefined') {
      return {
        currentQuestionIndex: 0,
        codes: {},
        selectedLanguages: {},
        submissions: {},
        isCompleted: false,
      };
    }

    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${participantId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.warn('Failed loading hands-on debug session from storage:', err);
    }

    const defaultState: HandsOnSessionState = {
      currentQuestionIndex: 0,
      codes: {},
      selectedLanguages: {},
      submissions: {},
      isCompleted: false,
    };

    this.saveSession(participantId, defaultState);
    return defaultState;
  },

  /**
   * Persists the session state locally
   */
  saveSession(participantId: number, state: HandsOnSessionState): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${participantId}`, JSON.stringify(state));
      sessionStorage.setItem(`${STORAGE_KEY_PREFIX}${participantId}`, JSON.stringify(state));
    } catch (err) {
      console.warn('Failed saving hands-on debug session:', err);
    }
  },

  /**
   * Records a problem submission
   */
  recordSubmission(participantId: number, submission: HandsOnSubmission): HandsOnSessionState {
    const session = this.getSession(participantId);
    session.submissions[submission.question_id] = submission;
    session.codes[submission.question_id] = submission.code;
    session.selectedLanguages[submission.question_id] = submission.language;
    this.saveSession(participantId, session);
    return session;
  },

  /**
   * Clears the session for testing or resets
   */
  clearSession(participantId: number): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${participantId}`);
    sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}${participantId}`);
  },
};
