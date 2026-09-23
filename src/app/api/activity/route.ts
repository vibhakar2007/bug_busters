import { NextResponse } from 'next/server';
import { ParticipantActivity, RecordActivityInput } from '@/types/activity';
import { readJsonData, updateJsonData } from '@/lib/server/jsonStorage';
import activityFallback from '@/data/activity.json';

export async function GET() {
  const activities = await readJsonData<ParticipantActivity[]>(
    'activity.json',
    activityFallback as unknown as ParticipantActivity[]
  );
  return NextResponse.json(activities);
}

export async function POST(request: Request) {
  try {
    const input: RecordActivityInput = await request.json();

    const isViolation =
      input.event_type === 'tab_switch' ||
      input.event_type === 'copy_attempt' ||
      input.event_type === 'paste_attempt';
    const isWarning =
      input.event_type === 'focus_loss' || input.event_type === 'fullscreen_exit';

    let recordedActivity: ParticipantActivity | null = null;

    await updateJsonData<ParticipantActivity[]>(
      'activity.json',
      activityFallback as unknown as ParticipantActivity[],
      (activities) => {
        const nextId =
          activities.length > 0
            ? Math.max(...activities.map((a) => a.activity_id)) + 1
            : 1;

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
        return [newActivity, ...activities.slice(0, 99)];
      }
    );

    return NextResponse.json(recordedActivity, { status: 201 });
  } catch (error) {
    console.error('Failed to record activity:', error);
    return NextResponse.json({ error: 'Failed to record activity' }, { status: 500 });
  }
}
