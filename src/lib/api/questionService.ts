import questionsData from '@/data/questions.json';
import { Question } from '@/types/quiz';

class QuestionService {
  private questions: Question[] = [];

  constructor() {
    this.questions = (questionsData as unknown as Question[]).map((q) => {
      const hasCode = Boolean(q.code_snippet && q.code_snippet.trim().length > 0);
      const qType = q.question_type || (hasCode ? 'debug' : 'quiz');
      return {
        ...q,
        concept_id: q.concept_id,
        question_type: qType,
        category: qType === 'debug' ? 'debugging' : 'quiz',
        language: q.language || (q.category === 'Cross-Language' ? 'General' : q.category) || 'General',
        correct_option: q.correct_option.toUpperCase(),
      };
    });
  }

  public async getAllQuestions(): Promise<Question[]> {
    return [...this.questions];
  }

  public async getQuestionsByIds(ids: number[]): Promise<Question[]> {
    const idSet = new Set(ids);
    return this.questions.filter((q) => idSet.has(q.question_id));
  }

  public async getDebugQuestionsByLanguage(language: string): Promise<Question[]> {
    const target = language.trim().toLowerCase();
    return this.questions.filter(
      (q) =>
        q.question_type === 'debug' &&
        (q.language || '').trim().toLowerCase() === target
    );
  }

  public async getDebugQuestionByConceptAndLanguage(
    conceptId: string,
    language: string
  ): Promise<Question | null> {
    const target = language.trim().toLowerCase();
    const found = this.questions.find(
      (q) =>
        q.question_type === 'debug' &&
        q.concept_id === conceptId &&
        (q.language || '').trim().toLowerCase() === target
    );
    return found ? { ...found } : null;
  }

  public async getQuestion(id: number): Promise<Question | null> {
    const question = this.questions.find((q) => q.question_id === id);
    return question ? { ...question } : null;
  }
}

export const questionService = new QuestionService();
