import { NextResponse } from 'next/server';
import { Participant } from '@/types/participant';
import { Quiz } from '@/types/quiz';
import { ParticipantActivity } from '@/types/activity';
import { readJsonData, updateJsonData } from '@/lib/server/jsonStorage';
import quizzesFallback from '@/data/quizzes.json';
import participantsFallback from '@/data/participants.json';
import activityFallback from '@/data/activity.json';

function normalizePhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '').trim();
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
  return NextResponse.json(
    { status: 'ready', message: 'Bug Busters Join API is active.' },
    { status: 200, headers: corsHeaders() }
  );
}

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown> = {};
    const contentType = request.headers.get('content-type') || '';

    try {
      if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const obj: Record<string, unknown> = {};
        formData.forEach((val, key) => {
          obj[key] = val;
        });
        body = obj;
      } else {
        const text = await request.text();
        if (text && text.trim().length > 0) {
          body = JSON.parse(text);
        }
      }
    } catch (parseErr) {
      console.warn('Failed to parse request body in /api/quiz/join:', parseErr);
      body = {};
    }

    const name = String(body.name || '').trim();
    const rawPhone = String(body.phone || '').trim();
    const rawCode = String(body.quiz_code || body.code || '').trim().toUpperCase();

    // 1. Validation
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Full name is required.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const normPhone = normalizePhone(rawPhone);
    if (!normPhone || normPhone.length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please enter a valid phone number (at least 10 digits).',
        },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (!rawCode) {
      return NextResponse.json(
        { success: false, error: 'Quiz Code is required.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // 2. Quiz validation from host storage
    const quizzes = await readJsonData<Quiz[]>(
      'quizzes.json',
      quizzesFallback as unknown as Quiz[]
    );

    const quiz = quizzes.find((q) => q.code.toUpperCase() === rawCode);
    if (!quiz) {
      return NextResponse.json(
        {
          success: false,
          error: `Quiz code "${rawCode}" was not found. Please verify with the event coordinator.`,
        },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (quiz.status === 'closed') {
      return NextResponse.json(
        {
          success: false,
          error: 'This quiz is closed and is no longer accepting participants.',
        },
        { status: 400, headers: corsHeaders() }
      );
    }

    // 3. Atomically check phone uniqueness and create/resume participant
    let responsePayload: {
      success: boolean;
      isUnique: boolean;
      isResumed: boolean;
      participant: Participant;
      quiz: Quiz;
    } | null = null;
    let completedError: string | null = null;

    await updateJsonData<Participant[]>(
      'participants.json',
      participantsFallback as unknown as Participant[],
      (participants) => {
        const existingIndex = participants.findIndex(
          (p) =>
            normalizePhone(p.phone) === normPhone && p.quiz_id === quiz.quiz_id
        );

        if (existingIndex !== -1) {
          const existing = participants[existingIndex];
          if (existing.status === 'completed') {
            completedError =
              'You have already completed this quiz with this phone number. Each participant may only attempt the quiz once.';
            return participants;
          }

          // Resume existing active attempt
          const updated: Participant = {
            ...existing,
            name: name,
            last_activity_time: new Date().toISOString(),
            last_activity_description: 'Resumed quiz session from device',
          };

          const copy = [...participants];
          copy[existingIndex] = updated;

          responsePayload = {
            success: true,
            isUnique: false,
            isResumed: true,
            participant: updated,
            quiz,
          };
          return copy;
        }

        // Unique phone number -> create new participant
        const nextId =
          participants.length > 0
            ? Math.max(...participants.map((p) => p.participant_id)) + 1
            : 1;

        const newParticipant: Participant = {
          participant_id: nextId,
          name: name,
          phone: rawPhone,
          quiz_id: quiz.quiz_id,
          start_time: new Date().toISOString(),
          end_time: null,
          score: null,
          status: 'active',
          violation_count: 0,
          current_question: 1,
          total_questions: quiz.question_count || 40,
          last_activity_time: new Date().toISOString(),
          last_activity_description: 'Joined quiz from device',
        };

        responsePayload = {
          success: true,
          isUnique: true,
          isResumed: false,
          participant: newParticipant,
          quiz,
        };

        return [newParticipant, ...participants];
      }
    );

    if (completedError) {
      return NextResponse.json(
        { success: false, error: completedError },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (!responsePayload) {
      return NextResponse.json(
        { success: false, error: 'Failed to authenticate with host machine.' },
        { status: 500, headers: corsHeaders() }
      );
    }

    // 4. Log telemetry activity on host machine
    const payload = responsePayload as {
      success: boolean;
      isUnique: boolean;
      isResumed: boolean;
      participant: Participant;
      quiz: Quiz;
    };

    updateJsonData<ParticipantActivity[]>(
      'activity.json',
      activityFallback as unknown as ParticipantActivity[],
      (activities) => {
        const nextActId =
          activities.length > 0
            ? Math.max(...activities.map((a) => a.activity_id)) + 1
            : 1;

        const newAct: ParticipantActivity = {
          activity_id: nextActId,
          participant_id: payload.participant.participant_id,
          participant_name: payload.participant.name,
          registration_number: payload.participant.phone,
          question_id: null,
          event_type: 'answer_selected',
          selected_option: null,
          event_time: new Date().toISOString(),
          details: payload.isResumed
            ? `Resumed session for quiz ${quiz.code}`
            : `Authenticated and joined quiz ${quiz.code}`,
          severity: 'normal',
        };
        return [newAct, ...activities.slice(0, 99)];
      }
    ).catch((e) => console.warn('Activity logging error:', e));

    return NextResponse.json(payload, {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error('Quiz join error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error on host machine.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
