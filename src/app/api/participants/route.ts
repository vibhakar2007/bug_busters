import { NextResponse } from 'next/server';
import { Participant, CreateParticipantInput } from '@/types/participant';
import { Quiz } from '@/types/quiz';
import { readJsonData, updateJsonData, getDataVersion } from '@/lib/server/jsonStorage';
import participantsFallback from '@/data/participants.json';
import quizzesFallback from '@/data/quizzes.json';

function normalizePhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '').trim();
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning, bypass-tunnel-reminder, if-none-match',
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phoneParam = searchParams.get('phone');
  const quizIdParam = searchParams.get('quiz_id');

  const participants = await readJsonData<Participant[]>(
    'participants.json',
    participantsFallback as unknown as Participant[]
  );

  if (phoneParam) {
    const norm = normalizePhone(phoneParam);
    const quizId = quizIdParam ? Number(quizIdParam) : null;
    const found = participants.find((p) => {
      const matchPhone = normalizePhone(p.phone) === norm;
      return quizId ? matchPhone && p.quiz_id === quizId : matchPhone;
    });

    if (!found) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404, headers: corsHeaders() });
    }
    return NextResponse.json(found, { headers: corsHeaders() });
  }

  // ETag support for polling
  const version = getDataVersion('participants.json');
  const etag = `"${version}"`;
  const ifNoneMatch = request.headers.get('if-none-match');

  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304, headers: corsHeaders() });
  }

  const headers = {
    ...corsHeaders(),
    'ETag': etag,
    'Cache-Control': 'no-cache',
  };

  return NextResponse.json(participants, { headers });
}

export async function POST(request: Request) {
  try {
    const input: CreateParticipantInput = await request.json();
    const norm = normalizePhone(input.phone);

    const quizzes = await readJsonData<Quiz[]>(
      'quizzes.json',
      quizzesFallback as unknown as Quiz[]
    );
    const quiz = quizzes.find((q) => q.quiz_id === input.quiz_id);
    if (quiz && quiz.status === 'closed') {
      return NextResponse.json(
        { error: 'Event Closed. This quiz is closed and no longer accepting participants.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    let createdOrExisting: Participant | null = null;
    let isAlreadyCompleted = false;

    await updateJsonData<Participant[]>(
      'participants.json',
      participantsFallback as unknown as Participant[],
      (participants) => {
        const existing = participants.find(
          (p) => normalizePhone(p.phone) === norm && p.quiz_id === input.quiz_id
        );

        if (existing) {
          if (existing.status === 'completed') {
            isAlreadyCompleted = true;
            createdOrExisting = existing;
            return participants;
          }
          if (input.name && input.name.trim() && existing.name !== input.name.trim()) {
            existing.name = input.name.trim();
          }
          createdOrExisting = existing;
          return [...participants];
        }

        const nextId =
          participants.length > 0
            ? Math.max(...participants.map((p) => p.participant_id)) + 1
            : 1;

        const newParticipant: Participant = {
          participant_id: nextId,
          name: input.name.trim(),
          phone: input.phone.trim(),
          quiz_id: input.quiz_id,
          start_time: new Date().toISOString(),
          end_time: null,
          score: null,
          status: 'active',
          violation_count: 0,
          current_question: 1,
          total_questions: input.total_questions || 40,
          last_activity_time: new Date().toISOString(),
          last_activity_description: 'Started the quiz',
        };

        createdOrExisting = newParticipant;
        return [newParticipant, ...participants];
      }
    );

    if (isAlreadyCompleted) {
      return NextResponse.json(
        { error: 'You have already completed this quiz with this phone number.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    return NextResponse.json(createdOrExisting, { status: 201, headers: corsHeaders() });
  } catch (error) {
    console.error('Failed to create participant:', error);
    return NextResponse.json({ error: 'Failed to create participant' }, { status: 500, headers: corsHeaders() });
  }
}
