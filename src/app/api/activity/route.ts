import { NextResponse } from 'next/server';
import { ParticipantActivity, RecordActivityInput } from '@/types/activity';
import { readJsonData, updateJsonData, getDataVersion } from '@/lib/server/jsonStorage';
import activityFallback from '@/data/activity.json';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
  const limitParam = searchParams.get('limit');

  const activities = await readJsonData<ParticipantActivity[]>(
    'activity.json',
    activityFallback as unknown as ParticipantActivity[]
  );

  // If specific participant's activities requested
  if (participantIdParam) {
    const pid = Number(participantIdParam);
    const filtered = activities.filter((a) => a.participant_id === pid);
    const limit = limitParam === 'all' ? filtered.length : Number(limitParam) || 100;
    return NextResponse.json(filtered.slice(0, limit), { headers: corsHeaders() });
  }

  // Bounded feed response for live monitor performance (default 50 items)
  const limit = limitParam === 'all' ? activities.length : Number(limitParam) || 50;
  const sliced = activities.slice(0, limit);

  const version = getDataVersion('activity.json');
  const headers = {
    ...corsHeaders(),
    'ETag': `"${version}"`,
    'Cache-Control': 'no-cache',
  };

  return NextResponse.json(sliced, { headers });
}

export async function POST(request: Request) {
  try {
    const input: RecordActivityInput = await request.json();

    // High-concurrency optimization: bypass recording mundane option clicks to prevent disk & tunnel saturation
    if (input.event_type === 'answer_selected') {
      return NextResponse.json(
        { activity_id: 0, skipped: true, event_type: 'answer_selected' },
        { status: 200, headers: corsHeaders() }
      );
    }

    const isViolation = input.event_type === 'tab_switch';
    const isWarning = input.event_type === 'focus_loss';

    let recordedActivity: ParticipantActivity | null = null;

    await updateJsonData<ParticipantActivity[]>(
      'activity.json',
      activityFallback as unknown as ParticipantActivity[],
      (activities) => {
        // Prevent duplicate events for same participant & type within 2.5 seconds
        const isDuplicate = activities.some((a) => {
          if (a.participant_id !== input.participant_id || a.event_type !== input.event_type) {
            return false;
          }
          const diff = Math.abs(Date.now() - new Date(a.event_time).getTime());
          return diff < 2500;
        });

        if (isDuplicate) {
          recordedActivity = activities.find(
            (a) => a.participant_id === input.participant_id && a.event_type === input.event_type
          ) || activities[0];
          return activities;
        }

        const nextId = Date.now() * 1000 + Math.floor(Math.random() * 1000);

        const newActivity: ParticipantActivity = {
          activity_id: nextId,
          participant_id: input.participant_id,
          participant_name: input.participant_name,
          registration_number: input.registration_number,
          question_id: input.question_id || null,
          event_type: input.event_type,
          selected_option: input.selected_option || null,
          event_time: new Date().toISOString(),
          details: input.details || '',
          severity: isViolation ? 'violation' : isWarning ? 'warning' : 'normal',
        };

        recordedActivity = newActivity;
        return [newActivity, ...activities.slice(0, 1499)];
      }
    );

    return NextResponse.json(recordedActivity, { status: 201, headers: corsHeaders() });
  } catch (error) {
    console.error('Failed to record activity:', error);
    return NextResponse.json({ error: 'Failed to record activity' }, { status: 500, headers: corsHeaders() });
  }
}
