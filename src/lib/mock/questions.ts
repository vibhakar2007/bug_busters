import { Question } from '@/types/quiz';
import questionsData from '@/data/questions.json';

export const MOCK_QUESTIONS: Question[] = (questionsData as unknown as Question[]).map((q) => ({
  ...q,
  correct_option: q.correct_option.toUpperCase(),
}));
