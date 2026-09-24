import { NextResponse } from 'next/server';
import { Quiz, CreateQuizInput } from '@/types/quiz';
import { readJsonData, writeJsonData } from '@/lib/server/jsonStorage';
import quizzesFallback from '@/data/quizzes.json';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning, bypass-tunnel-reminder',
    'ngrok-skip-browser-warning': 'true',
    'bypass-tunnel-reminder': 'true',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function GET() {
  const quizzes = await readJsonData<Quiz[]>('quizzes.json', quizzesFallback as unknown as Quiz[]);
  return NextResponse.json(quizzes, { headers: corsHeaders() });
}

export async function POST(request: Request) {
  try {
    const body: CreateQuizInput = await request.json();
    const quizzes = await readJsonData<Quiz[]>('quizzes.json', quizzesFallback as unknown as Quiz[]);

    const nextId = quizzes.length > 0 ? Math.max(...quizzes.map((q) => q.quiz_id)) + 1 : 1;
    const newQuiz: Quiz = {
      quiz_id: nextId,
      title: body.title.trim(),
      code: body.code.trim().toUpperCase(),
      question_ids: body.question_ids || [],
      question_count: body.question_count || (body.question_ids?.length || 10),
      duration_minutes: body.duration_minutes || 15,
      status: body.status || 'live',
      created_at: new Date().toISOString(),
      description: body.description?.trim() || '',
    };

    const updated = [newQuiz, ...quizzes];
    await writeJsonData('quizzes.json', updated);

    return NextResponse.json(newQuiz, { status: 201, headers: corsHeaders() });
  } catch (error) {
    console.error('Failed to create quiz:', error);
    return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500, headers: corsHeaders() });
  }
}
