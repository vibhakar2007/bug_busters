import { QuizSession } from '@/types/quiz';
import { ParticipantResult, QuestionReviewItem } from '@/types/participant';
import { formatTime } from '@/lib/utils/cn';
import { getQuestionAnswer } from '@/lib/quiz/sessionEngine';

export function calculateQuizResult(session: QuizSession): ParticipantResult {
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  const reviewItems: QuestionReviewItem[] = [];

  session.questions.forEach((q, index) => {
    const selectedKey = getQuestionAnswer(q, session.answers);
    const isUnanswered = !selectedKey;
    const isCorrect = !isUnanswered && selectedKey.toUpperCase() === q.correct_option.toUpperCase();

    if (isUnanswered) {
      unansweredCount++;
    } else if (isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }

    // Find the text of selected option and correct option
    const selectedOptionObj = q.options.find((opt) => opt.key.toUpperCase() === (selectedKey || '').toUpperCase());
    const correctOptionObj = q.options.find((opt) => opt.key.toUpperCase() === q.correct_option.toUpperCase());

    reviewItems.push({
      question_id: q.question_id,
      question_index: index + 1,
      question: q.question,
      user_selected_key: selectedKey ? selectedKey.toUpperCase() : null,
      user_selected_text: selectedOptionObj ? selectedOptionObj.text : null,
      correct_option_key: q.correct_option.toUpperCase(),
      correct_option_text: correctOptionObj ? correctOptionObj.text : 'Unknown',
      is_correct: isCorrect,
      is_unanswered: isUnanswered,
      explanation: q.explanation || 'No explanation provided.',
    });
  });

  const totalQuestions = session.questions.length;
  // Strictly no negative marking: correct * 1
  const score = correctCount;
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  const startMs = new Date(session.startTime).getTime();
  const endMs = session.submittedAt ? new Date(session.submittedAt).getTime() : Date.now();
  const timeTakenSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));

  return {
    participant_id: session.participant_id,
    name: session.participant_name,
    phone: session.phone,
    quiz_id: session.quiz_id,
    quiz_title: session.quiz_title,
    score,
    total_questions: totalQuestions,
    percentage,
    correct_count: correctCount,
    incorrect_count: incorrectCount,
    unanswered_count: unansweredCount,
    violation_count: session.violationCount || 0,
    time_taken_seconds: timeTakenSeconds,
    time_taken_formatted: formatTime(timeTakenSeconds),
    submitted_at: session.submittedAt || new Date().toISOString(),
    review_items: reviewItems,
  };
}
