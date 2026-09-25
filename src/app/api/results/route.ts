import { NextResponse } from 'next/server';
import { ParticipantResult } from '@/types/participant';
import { readJsonData, updateJsonData, getDataVersion } from '@/lib/server/jsonStorage';
import resultsFallback from '@/data/results.json';

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
  const participantIdParam = searchParams.get('participant_id');
  const isFull = searchParams.get('full') === 'true';

  const results = await readJsonData<ParticipantResult[]>(
    'results.json',
    resultsFallback as unknown as ParticipantResult[]
  );

  // 1. Single participant result lookup
  if (participantIdParam) {
    const pid = Number(participantIdParam);
    const found = results.find((r) => r.participant_id === pid);
    if (!found) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404, headers: corsHeaders() });
    }
    return NextResponse.json(found, { headers: corsHeaders() });
  }

  // 2. High-performance summary mode for leaderboard (omit heavy 40-question review_items array)
  if (!isFull) {
    const summaries = results.map((r) => {
      // Return lightweight summary object without review_items
      const { review_items: _unused, ...summary } = r;
      return summary;
    });

    const version = getDataVersion('results.json');
    const headers = {
      ...corsHeaders(),
      'ETag': `"${version}"`,
      'Cache-Control': 'no-cache',
    };

    return NextResponse.json(summaries, { headers });
  }

  // 3. Full data mode (when specifically requested)
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
