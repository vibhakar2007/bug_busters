import { NextResponse } from 'next/server';
import { Quiz } from '@/types/quiz';
import { readJsonData, writeJsonData } from '@/lib/server/jsonStorage';
import quizzesFallback from '@/data/quizzes.json';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const quizId = Number(id);
  const quizzes = await readJsonData<Quiz[]>('quizzes.json', quizzesFallback as unknown as Quiz[]);
  const found = quizzes.find((q) => q.quiz_id === quizId);

  if (!found) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  return NextResponse.json(found);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const quizId = Number(id);
  try {
    const data: Partial<Quiz> = await request.json();
    const quizzes = await readJsonData<Quiz[]>('quizzes.json', quizzesFallback as unknown as Quiz[]);
    const index = quizzes.findIndex((q) => q.quiz_id === quizId);

    if (index === -1) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const updatedQuiz: Quiz = {
      ...quizzes[index],
      ...data,
    };

    quizzes[index] = updatedQuiz;
    await writeJsonData('quizzes.json', quizzes);

    return NextResponse.json(updatedQuiz);
  } catch (error) {
    console.error('Failed to update quiz:', error);
    return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const quizId = Number(id);
  try {
    const quizzes = await readJsonData<Quiz[]>('quizzes.json', quizzesFallback as unknown as Quiz[]);
    const filtered = quizzes.filter((q) => q.quiz_id !== quizId);

    if (filtered.length === quizzes.length) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    await writeJsonData('quizzes.json', filtered);
    return NextResponse.json({ success: true, deleted_id: quizId });
  } catch (error) {
    console.error('Failed to delete quiz:', error);
    return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
  }
}
