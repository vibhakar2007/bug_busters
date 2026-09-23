import { ParticipantActivity, RecordActivityInput } from '@/types/activity';
import { MOCK_ACTIVITIES } from '@/lib/mock/activity';
import { realtimeBus } from './eventBus';

const STORAGE_KEY_ACTIVITIES = 'bugbusters_activities';

class ActivityService {
  private activities: ParticipantActivity[] = [];

  constructor() {
    this.loadActivities();
    if (typeof window !== 'undefined') {
      this.syncFromServer();
    }
  }

  private async syncFromServer() {
    try {
      const res = await fetch('/api/activity');
      if (res.ok) {
        const data: ParticipantActivity[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.activities = data;
          this.saveActivitiesToLocal();
        }
      }
    } catch {
      // Offline / SSR
    }
  }

  private loadActivities() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_ACTIVITIES);
        if (stored) {
          this.activities = JSON.parse(stored);
          return;
        }
      } catch (e) {
        console.warn('Failed to read activities from storage:', e);
      }
    }
    this.activities = [...MOCK_ACTIVITIES];
  }

  private saveActivitiesToLocal() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(this.activities.slice(0, 200)));
      } catch (e) {
        console.warn('Failed to save activities to storage:', e);
      }
    }
  }

  private saveActivities() {
    this.saveActivitiesToLocal();
  }

  public async getRecentActivities(limit: number = 30): Promise<ParticipantActivity[]> {
    this.loadActivities();
    return this.activities.slice(0, limit);
  }

  public async getParticipantActivity(participantId: number): Promise<ParticipantActivity[]> {
    this.loadActivities();
    return this.activities.filter((act) => act.participant_id === participantId);
  }

  public async recordActivity(input: RecordActivityInput): Promise<ParticipantActivity> {
    this.loadActivities();
    const nextId =
      this.activities.length > 0
        ? Math.max(...this.activities.map((a) => a.activity_id)) + 1
        : 1;

    let severity: 'normal' | 'warning' | 'violation' = 'normal';
    if (['tab_switch', 'copy_attempt', 'paste_attempt', 'dev_tools'].includes(input.event_type)) {
      severity = 'violation';
    } else if (['focus_loss', 'fullscreen_exit', 'context_menu'].includes(input.event_type)) {
      severity = 'warning';
    }

    const newActivity: ParticipantActivity = {
      activity_id: nextId,
      participant_id: input.participant_id,
      participant_name: input.participant_name || `Participant #${input.participant_id}`,
      registration_number: input.registration_number,
      question_id: input.question_id || null,
      event_type: input.event_type,
      selected_option: input.selected_option || null,
      event_time: new Date().toISOString(),
      details: input.details,
      severity,
    };

    // Prepend to maintain newest first
    this.activities.unshift(newActivity);
    this.saveActivities();

    // Broadcast in real-time
    realtimeBus.emit('activity_recorded', newActivity);

    // Persist to server /data/activity.json
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
      } catch (err) {
        console.warn('Failed to sync activity to server API:', err);
      }
    }

    return newActivity;
  }

  public subscribeToActivity(callback: (activity: ParticipantActivity) => void): () => void {
    return realtimeBus.on<ParticipantActivity>('activity_recorded', (act) => {
      callback(act);
    });
  }
}

export const activityService = new ActivityService();
