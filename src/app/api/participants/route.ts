import { NextResponse } from 'next/server';
import { Participant, CreateParticipantInput } from '@/types/participant';
import { readJsonData, writeJsonData } from '@/lib/server/jsonStorage';
import participantsFallback from '@/data/participants.json';

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, '').trim();
}

export async function GET() {
  const participants = await readJsonData<Participant[]>(
    'participants.json',
    participantsFallback as unknown as Participant[]
  );
  return NextResponse.json(participants);
}

export async function POST(request: Request) {
  try {
    const input: CreateParticipantInput = await request.json();
    const participants = await readJsonData<Participant[]>(
      'participants.json',
      participantsFallback as unknown as Participant[]
    );

    const norm = normalizePhone(input.phone);
    const existing = participants.find(
      (p) => normalizePhone(p.phone) === norm && p.quiz_id === input.quiz_id
    );

    if (existing) {
      if (existing.status === 'completed') {
        return NextResponse.json(
          { error: 'You have already completed this quiz with this phone number.' },
          { status: 400 }
        );
      }
      return NextResponse.json(existing);
    }

    const nextId =
      participants.length > 0 ? Math.max(...participants.map((p) => p.participant_id)) + 1 : 1;

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
      total_questions: 10,
      last_activity_time: new Date().toISOString(),
      last_activity_description: 'Started the quiz',
    };

    const updated = [newParticipant, ...participants];
    await writeJsonData('participants.json', updated);

    return NextResponse.json(newParticipant, { status: 201 });
  } catch (error) {
    console.error('Failed to create participant:', error);
    return NextResponse.json({ error: 'Failed to create participant' }, { status: 500 });
  }
}
