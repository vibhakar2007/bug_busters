import questionsData from '@/data/questions.json';
import { Question } from '@/types/quiz';

class QuestionService {
  private questions: Question[] = [];

  constructor() {
    this.questions = (questionsData as unknown as Question[]).map((q) => ({
      ...q,
      correct_option: q.correct_option.toUpperCase(),
    }));
  }

  public async getAllQuestions(): Promise<Question[]> {
    return [...this.questions];
  }

  public async getQuestionsByIds(ids: number[]): Promise<Question[]> {
    const idSet = new Set(ids);
    return this.questions.filter((q) => idSet.has(q.question_id));
  }

  public async getQuestion(id: number): Promise<Question | null> {
    const question = this.questions.find((q) => q.question_id === id);
    return question ? { ...question } : null;
  }
}

export const questionService = new QuestionService();
