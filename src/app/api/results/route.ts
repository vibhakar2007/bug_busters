import { NextResponse } from 'next/server';
import { ParticipantResult } from '@/types/participant';
import { readJsonData, updateJsonData } from '@/lib/server/jsonStorage';
import resultsFallback from '@/data/results.json';

export async function GET() {
  const results = await readJsonData<ParticipantResult[]>(
    'results.json',
    resultsFallback as unknown as ParticipantResult[]
  );
  return NextResponse.json(results);
}

export async function POST(request: Request) {
  try {
    const result: ParticipantResult = await request.json();

    await updateJsonData<ParticipantResult[]>(
      'results.json',
      resultsFallback as unknown as ParticipantResult[],
      (results) => {
        const existingIdx = results.findIndex(
          (r) => r.participant_id === result.participant_id && r.quiz_id === result.quiz_id
        );

        if (existingIdx !== -1) {
          const copy = [...results];
          copy[existingIdx] = result;
          return copy;
        } else {
          return [result, ...results];
        }
      }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Failed to save result:', error);
    return NextResponse.json({ error: 'Failed to save result' }, { status: 500 });
  }
}
