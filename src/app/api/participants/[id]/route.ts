import { NextResponse } from 'next/server';
import { Participant } from '@/types/participant';
import { readJsonData, writeJsonData } from '@/lib/server/jsonStorage';
import participantsFallback from '@/data/participants.json';

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
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }

  return NextResponse.json(found);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const participantId = Number(id);
  try {
    const data: Partial<Participant> = await request.json();
    const participants = await readJsonData<Participant[]>(
      'participants.json',
      participantsFallback as unknown as Participant[]
    );

    const index = participants.findIndex((p) => p.participant_id === participantId);
    if (index === -1) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    const current = participants[index];
    const updated: Participant = {
      ...current,
      ...data,
      last_activity_time: new Date().toISOString(),
    };

    if (updated.violation_count >= 3 && updated.status === 'active') {
      updated.status = 'flagged';
    }

    participants[index] = updated;
    await writeJsonData('participants.json', participants);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update participant:', error);
    return NextResponse.json({ error: 'Failed to update participant' }, { status: 500 });
  }
}
