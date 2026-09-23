import { Participant, CreateParticipantInput, ParticipantResult } from '@/types/participant';
import { MOCK_PARTICIPANTS } from '@/lib/mock/participants';
import { MOCK_RESULTS } from '@/lib/mock/results';
import { realtimeBus } from './eventBus';

const STORAGE_KEY_PARTICIPANTS = 'bugbusters_participants';
const STORAGE_KEY_RESULTS = 'bugbusters_results';

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, '').trim();
}

class ParticipantService {
  private participants: Participant[] = [];
  private results: ParticipantResult[] = [];

  constructor() {
    this.loadParticipants();
    this.loadResults();
    if (typeof window !== 'undefined') {
      realtimeBus.on<Participant[]>('participants_updated', (updated) => {
        this.participants = [...updated];
      });
      this.syncFromServer();
    }
  }

  public async syncFromServer(): Promise<void> {
    try {
      const [pRes, rRes] = await Promise.all([
        fetch('/api/participants'),
        fetch('/api/results'),
      ]);

      if (pRes.ok) {
        const pData: Participant[] = await pRes.json();
        if (Array.isArray(pData)) {
          this.participants = pData;
          this.saveParticipantsToLocal();
          realtimeBus.emit('participants_updated', this.participants);
        }
      }

      if (rRes.ok) {
        const rData: ParticipantResult[] = await rRes.json();
        if (Array.isArray(rData)) {
          this.results = rData;
          this.saveResultsToLocal();
        }
      }
    } catch {
      // Offline / SSR - silently retain local cache
    }
  }

  private loadParticipants() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_PARTICIPANTS);
        if (stored) {
          this.participants = JSON.parse(stored);
          return;
        }
      } catch (e) {
        console.warn('Failed to read participants from storage:', e);
      }
    }
    this.participants = [];
  }

  private saveParticipantsToLocal() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_PARTICIPANTS, JSON.stringify(this.participants));
      } catch (e) {
        console.warn('Failed to save participants to storage:', e);
      }
    }
  }

  private saveParticipants() {
    this.saveParticipantsToLocal();
    realtimeBus.emit('participants_updated', this.participants);
  }

  private loadResults() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_RESULTS);
        if (stored) {
          this.results = JSON.parse(stored);
          return;
        }
      } catch (e) {
        console.warn('Failed to read results from storage:', e);
      }
    }
    this.results = [];
  }

  private saveResultsToLocal() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_RESULTS, JSON.stringify(this.results));
      } catch (e) {
        console.warn('Failed to save results to storage:', e);
      }
    }
  }

  private saveResults() {
    this.saveResultsToLocal();
  }

  public async getAllParticipants(): Promise<Participant[]> {
    if (typeof window !== 'undefined') {
      await this.syncFromServer();
    } else {
      this.loadParticipants();
    }
    return [...this.participants];
  }

  public async getParticipant(id: number): Promise<Participant | null> {
    this.loadParticipants();
    const p = this.participants.find((item) => item.participant_id === id);
    return p ? { ...p } : null;
  }

  public async getParticipantByPhone(phone: string, quizId: number): Promise<Participant | null> {
    this.loadParticipants();
    const norm = normalizePhone(phone);
    const p = this.participants.find(
      (item) => normalizePhone(item.phone) === norm && item.quiz_id === quizId
    );
    return p ? { ...p } : null;
  }

  public async getParticipantByRegistration(phone: string, quizId: number): Promise<Participant | null> {
    return this.getParticipantByPhone(phone, quizId);
  }

  public async createParticipant(input: CreateParticipantInput): Promise<Participant> {
    this.loadParticipants();
    const existing = await this.getParticipantByPhone(input.phone, input.quiz_id);

    if (existing) {
      if (existing.status === 'completed') {
        throw new Error('You have already completed this quiz with this phone number. Re-attempts are not permitted.');
      }
      if (input.name && input.name.trim() && existing.name !== input.name.trim()) {
        existing.name = input.name.trim();
        this.saveParticipants();
      }
      return existing;
    }

    const nextId =
      this.participants.length > 0
        ? Math.max(...this.participants.map((p) => p.participant_id)) + 1
        : 1;

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
      total_questions: input.total_questions || 5,
      last_activity_time: new Date().toISOString(),
      last_activity_description: 'Started the quiz',
    };

    this.participants.unshift(newParticipant);
    this.saveParticipants();

    // Persist to server /data/participants.json
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/participants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
      } catch (err) {
        console.warn('Failed to sync participant to server API:', err);
      }
    }

    return newParticipant;
  }

  public async updateParticipant(
    id: number,
    data: Partial<Participant>
  ): Promise<Participant> {
    this.loadParticipants();
    const index = this.participants.findIndex((p) => p.participant_id === id);
    if (index === -1) {
      throw new Error(`Participant ${id} not found`);
    }

    const current = this.participants[index];
    const updated: Participant = {
      ...current,
      ...data,
      last_activity_time: new Date().toISOString(),
    };

    if (updated.violation_count >= 3 && updated.status === 'active') {
      updated.status = 'flagged';
    }

    this.participants[index] = updated;
    this.saveParticipants();

    // Persist to server /data/participants.json
    if (typeof window !== 'undefined') {
      try {
        await fetch(`/api/participants/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.warn('Failed to sync participant update to server API:', err);
      }
    }

    return updated;
  }

  public async incrementViolation(id: number, description?: string): Promise<Participant> {
    this.loadParticipants();
    const index = this.participants.findIndex((p) => p.participant_id === id);
    if (index === -1) {
      throw new Error(`Participant ${id} not found`);
    }

    const current = this.participants[index];
    const newViolationCount = (current.violation_count || 0) + 1;
    const isFlagged = newViolationCount >= 3;

    const updated: Participant = {
      ...current,
      violation_count: newViolationCount,
      status: isFlagged ? 'flagged' : current.status,
      last_activity_time: new Date().toISOString(),
      last_activity_description: description || 'Violation detected',
    };

    this.participants[index] = updated;
    this.saveParticipants();

    if (typeof window !== 'undefined') {
      try {
        await fetch(`/api/participants/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            violation_count: newViolationCount,
            status: isFlagged ? 'flagged' : current.status,
            last_activity_description: description || 'Violation detected',
          }),
        });
      } catch (err) {
        console.warn('Failed to sync violation to server API:', err);
      }
    }

    return updated;
  }

  public async recordResult(result: ParticipantResult): Promise<void> {
    this.loadResults();
    const existingIdx = this.results.findIndex(
      (r) => r.participant_id === result.participant_id && r.quiz_id === result.quiz_id
    );
    if (existingIdx !== -1) {
      this.results[existingIdx] = result;
    } else {
      this.results.unshift(result);
    }
    this.saveResults();

    // Persist to server /data/results.json
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result),
        });
      } catch (err) {
        console.warn('Failed to sync result to server API:', err);
      }
    }
  }

  public async getResults(quizId?: number): Promise<ParticipantResult[]> {
    if (typeof window !== 'undefined') {
      await this.syncFromServer();
    } else {
      this.loadResults();
    }
    if (quizId) {
      return this.results.filter((r) => r.quiz_id === quizId);
    }
    return [...this.results];
  }

  public async getParticipantResult(participantId: number): Promise<ParticipantResult | null> {
    this.loadResults();
    const res = this.results.find((r) => r.participant_id === participantId);
    return res ? { ...res } : null;
  }

  public subscribeToParticipants(callback: (participants: Participant[]) => void): () => void {
    callback([...this.participants]);
    return realtimeBus.on<Participant[]>('participants_updated', (updated) => {
      callback([...updated]);
    });
  }
}

export const participantService = new ParticipantService();
