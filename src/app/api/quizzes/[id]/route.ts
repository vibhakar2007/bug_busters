import { NextResponse } from 'next/server';
import { Quiz } from '@/types/quiz';
import { Participant } from '@/types/participant';
import { readJsonData, writeJsonData, updateJsonData } from '@/lib/server/jsonStorage';
import quizzesFallback from '@/data/quizzes.json';
import participantsFallback from '@/data/participants.json';
import { formatDurationSeconds } from '@/lib/utils/time';

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

    if (data.status === 'closed') {
      const now = new Date().toISOString();
      await updateJsonData<Participant[]>(
        'participants.json',
        participantsFallback as unknown as Participant[],
        (participants) => {
          return participants.map((p) => {
            if (p.quiz_id === quizId && p.status !== 'completed') {
              const startMs = p.start_time ? new Date(p.start_time).getTime() : new Date(now).getTime();
              const endMs = new Date(now).getTime();
              const durationSec = Math.max(1, Math.round((endMs - startMs) / 1000));
              return {
                ...p,
                status: 'completed',
                end_time: p.end_time || now,
                time_taken_seconds: p.time_taken_seconds || durationSec,
                time_taken_formatted: p.time_taken_formatted || formatDurationSeconds(durationSec),
                last_activity_description: 'Event concluded by administrator',
              };
            }
            return p;
          });
        }
      );
    }

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
