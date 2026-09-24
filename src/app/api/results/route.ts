import { NextResponse } from 'next/server';
import { ParticipantResult } from '@/types/participant';
import { readJsonData, updateJsonData } from '@/lib/server/jsonStorage';
import resultsFallback from '@/data/results.json';

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
  const results = await readJsonData<ParticipantResult[]>(
    'results.json',
    resultsFallback as unknown as ParticipantResult[]
  );
  return NextResponse.json(results, { headers: corsHeaders() });
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

    return NextResponse.json(result, { status: 201, headers: corsHeaders() });
  } catch (error) {
    console.error('Failed to save result:', error);
    return NextResponse.json({ error: 'Failed to save result' }, { status: 500, headers: corsHeaders() });
  }
}
