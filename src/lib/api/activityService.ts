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
      const res = await fetch('/api/activity?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true', {
        headers: {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'bypass-tunnel-reminder': 'true',
        },
      });
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
    this.activities = [];
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

    // Prevent duplicate event insertion in client memory within 2 seconds
    const isDuplicate = this.activities.some((a) => {
      if (a.participant_id !== input.participant_id || a.event_type !== input.event_type) return false;
      const diff = Math.abs(Date.now() - new Date(a.event_time).getTime());
      return diff < 2000;
    });

    if (isDuplicate && this.activities.length > 0) {
      return this.activities[0];
    }

    const nextId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const severity: 'normal' | 'warning' | 'violation' =
      input.event_type === 'tab_switch'
        ? 'violation'
        : input.event_type === 'focus_loss'
        ? 'warning'
        : 'normal';

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
        const res = await fetch('/api/activity?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'bypass-tunnel-reminder': 'true',
          },
          body: JSON.stringify(input),
        });
        if (res.ok) {
          const serverCreated = await res.json();
          if (serverCreated && serverCreated.activity_id && !serverCreated.skipped) {
            newActivity.activity_id = serverCreated.activity_id;
            this.saveActivities();
          }
        }
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

  public clearAll(): void {
    this.activities = [];
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY_ACTIVITIES);
      } catch {
        // Ignore
      }
    }
  }
}

export const activityService = new ActivityService();
