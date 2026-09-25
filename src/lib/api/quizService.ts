import { Question, Quiz, CreateQuizInput, QuizStatus } from '@/types/quiz';
import { MOCK_QUIZZES } from '@/lib/mock/quizzes';
import { questionService } from './questionService';
import { realtimeBus } from './eventBus';

const STORAGE_KEY_QUIZZES = 'bugbusters_quizzes';

class QuizService {
  private quizzes: Quiz[] = [];

  constructor() {
    this.loadQuizzes();
    if (typeof window !== 'undefined') {
      realtimeBus.on<Quiz[]>('quizzes_updated', (updated) => {
        this.quizzes = [...updated];
      });
      // Synchronize with server API on startup
      this.syncFromServer();
    }
  }

  private async syncFromServer() {
    try {
      const res = await fetch('/api/quizzes?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true', {
        headers: {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'bypass-tunnel-reminder': 'true',
        },
      });
      if (res.ok) {
        const data: Quiz[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.quizzes = data;
          this.saveToLocalStorageOnly();
          realtimeBus.emit('quizzes_updated', this.quizzes);
        }
      }
    } catch {
      // Offline or SSR - ignore and retain cache
    }
  }

  private loadQuizzes() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_QUIZZES);
        if (stored) {
          this.quizzes = JSON.parse(stored);
          return;
        }
      } catch (e) {
        console.warn('Failed to read quizzes from storage:', e);
      }
    }
    this.quizzes = [...MOCK_QUIZZES];
  }

  private saveToLocalStorageOnly() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_QUIZZES, JSON.stringify(this.quizzes));
      } catch (e) {
        console.warn('Failed to save quizzes to storage:', e);
      }
    }
  }

  private saveQuizzes() {
    this.saveToLocalStorageOnly();
    realtimeBus.emit('quizzes_updated', this.quizzes);
  }

  public async getAllQuizzes(): Promise<Quiz[]> {
    this.loadQuizzes();
    return [...this.quizzes];
  }

  public async getQuiz(id: number): Promise<Quiz | null> {
    this.loadQuizzes();
    const quiz = this.quizzes.find((q) => q.quiz_id === id);
    return quiz ? { ...quiz } : null;
  }

  public async getQuizByCode(code: string): Promise<Quiz | null> {
    this.loadQuizzes();
    const normalized = code.trim().toUpperCase();
    const quiz = this.quizzes.find((q) => q.code.toUpperCase() === normalized);
    return quiz ? { ...quiz } : null;
  }

  public async getAllQuestions(): Promise<Question[]> {
    return questionService.getAllQuestions();
  }

  public async getQuestions(ids: number[]): Promise<Question[]> {
    return questionService.getQuestionsByIds(ids);
  }

  public async createQuiz(input: CreateQuizInput): Promise<Quiz> {
    this.loadQuizzes();
    const nextId = this.quizzes.length > 0 ? Math.max(...this.quizzes.map((q) => q.quiz_id)) + 1 : 1;
    const newQuiz: Quiz = {
      quiz_id: nextId,
      title: input.title.trim(),
      code: input.code.trim().toUpperCase(),
      question_ids: input.question_ids,
      question_count: input.question_count || input.question_ids.length,
      duration_minutes: input.duration_minutes,
      status: input.status || 'live',
      created_at: new Date().toISOString(),
      description: input.description,
    };

    this.quizzes.unshift(newQuiz);
    this.saveQuizzes();

    // Persist to server /data/quizzes.json
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/quizzes?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'bypass-tunnel-reminder': 'true',
          },
          body: JSON.stringify(newQuiz),
        });
      } catch (err) {
        console.warn('Failed to persist quiz to server API:', err);
      }
    }

    return newQuiz;
  }

  public async updateQuiz(id: number, data: Partial<Quiz>): Promise<Quiz> {
    this.loadQuizzes();
    const index = this.quizzes.findIndex((q) => q.quiz_id === id);
    if (index === -1) {
      throw new Error(`Quiz with id ${id} not found`);
    }

    this.quizzes[index] = {
      ...this.quizzes[index],
      ...data,
    };

    this.saveQuizzes();

    if (data.status) {
      realtimeBus.emit('quiz_status_changed', { quiz_id: id, status: data.status });
    }

    // Persist to server /data/quizzes.json
    if (typeof window !== 'undefined') {
      try {
        await fetch(`/api/quizzes/${id}?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'bypass-tunnel-reminder': 'true',
          },
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.warn('Failed to persist quiz update to server API:', err);
      }
    }

    return this.quizzes[index];
  }

  public async deleteQuiz(id: number): Promise<boolean> {
    this.loadQuizzes();
    const beforeCount = this.quizzes.length;
    this.quizzes = this.quizzes.filter((q) => q.quiz_id !== id);

    if (this.quizzes.length === beforeCount) {
      return false;
    }

    this.saveQuizzes();

    // Persist deletion to server /data/quizzes.json
    if (typeof window !== 'undefined') {
      try {
        await fetch(`/api/quizzes/${id}?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true`, {
          method: 'DELETE',
          headers: {
            'ngrok-skip-browser-warning': 'true',
            'bypass-tunnel-reminder': 'true',
          },
        });
      } catch (err) {
        console.warn('Failed to persist quiz deletion to server API:', err);
      }
    }

    return true;
  }

  public async updateQuizStatus(id: number, status: QuizStatus): Promise<Quiz> {
    return this.updateQuiz(id, { status });
  }

  public async updateQuizDuration(id: number, durationMinutes: number): Promise<Quiz> {
    this.loadQuizzes();
    const index = this.quizzes.findIndex((q) => q.quiz_id === id);
    if (index === -1) {
      throw new Error(`Quiz with id ${id} not found`);
    }

    this.quizzes[index] = {
      ...this.quizzes[index],
      duration_minutes: durationMinutes,
    };

    this.saveQuizzes();

    // Broadcast duration change across tabs and components
    realtimeBus.emit('quiz_duration_changed', {
      quiz_id: id,
      duration_minutes: durationMinutes,
    });

    // Persist to server /data/quizzes.json
    if (typeof window !== 'undefined') {
      try {
        await fetch(`/api/quizzes/${id}?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'bypass-tunnel-reminder': 'true',
          },
          body: JSON.stringify({ duration_minutes: durationMinutes }),
        });
      } catch (err) {
        console.warn('Failed to persist duration change to server API:', err);
      }
    }

    return this.quizzes[index];
  }

  public subscribeToQuizzes(callback: (quizzes: Quiz[]) => void): () => void {
    callback([...this.quizzes]);
    return realtimeBus.on<Quiz[]>('quizzes_updated', (updated) => {
      callback([...updated]);
    });
  }
}

export const quizService = new QuizService();
