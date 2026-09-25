import { NextResponse } from 'next/server';
import { Participant } from '@/types/participant';
import { readJsonData, updateJsonData } from '@/lib/server/jsonStorage';
import participantsFallback from '@/data/participants.json';

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const participantId = Number(id);
  const participants = await readJsonData<Participant[]>(
    'participants.json',
    participantsFallback as unknown as Participant[]
  );

  const found = participants.find((p) => p.participant_id === participantId);
  if (!found) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404, headers: corsHeaders() });
  }

  return NextResponse.json(found, { headers: corsHeaders() });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const participantId = Number(id);
  try {
    const data: Partial<Participant> = await request.json();

    let resultParticipant: Participant | null = null;

    await updateJsonData<Participant[]>(
      'participants.json',
      participantsFallback as unknown as Participant[],
      (participants) => {
        const index = participants.findIndex((p) => p.participant_id === participantId);
        let updated: Participant;
        if (index === -1) {
          updated = {
            participant_id: participantId,
            name: data.name || `Participant #${participantId}`,
            phone: data.phone || '',
            quiz_id: data.quiz_id || 1,
            start_time: data.start_time || new Date().toISOString(),
            end_time: data.end_time || null,
            score: data.score ?? null,
            status: data.status || 'active',
            violation_count: data.violation_count || 0,
            current_question: data.current_question || 1,
            total_questions: data.total_questions || 40,
            last_activity_time: new Date().toISOString(),
            last_activity_description: data.last_activity_description || 'Active',
          };
          resultParticipant = updated;
          return [updated, ...participants];
        } else {
          const current = participants[index];
          updated = {
            ...current,
            ...data,
            last_activity_time: new Date().toISOString(),
          };
          if (data.status !== 'active' && data.status !== 'completed' && updated.violation_count >= 3 && updated.status === 'active') {
            updated.status = 'flagged';
          }
          resultParticipant = updated;
          const copy = [...participants];
          copy[index] = updated;
          return copy;
        }
      }
    );

    return NextResponse.json(resultParticipant, { headers: corsHeaders() });
  } catch (error) {
    console.error('Failed to update participant:', error);
    return NextResponse.json({ error: 'Failed to update participant' }, { status: 500, headers: corsHeaders() });
  }
}
