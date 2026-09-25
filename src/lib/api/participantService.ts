import { Participant, CreateParticipantInput, ParticipantResult } from '@/types/participant';
import { realtimeBus } from './eventBus';

const STORAGE_KEY_PARTICIPANTS = 'bugbusters_participants';
const STORAGE_KEY_RESULTS = 'bugbusters_results';

function normalizePhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '').trim();
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

class ParticipantService {
  private participants: Participant[] = [];
  private results: ParticipantResult[] = [];
  private activeSyncPromise: Promise<void> | null = null;

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
    if (this.activeSyncPromise) {
      return this.activeSyncPromise;
    }

    this.activeSyncPromise = (async () => {
      try {
        const tunnelHeaders = {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'bypass-tunnel-reminder': 'true',
        };
        const [pRes, rRes] = await Promise.all([
          fetch('/api/participants?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true', { headers: tunnelHeaders }),
          fetch('/api/results?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true', { headers: tunnelHeaders }),
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
      } finally {
        this.activeSyncPromise = null;
      }
    })();

    return this.activeSyncPromise;
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
    let p = this.participants.find((item) => item.participant_id === id);

    // If not in local cache, fetch directly from host machine API
    if (!p && typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/participants/${id}?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true`, {
          headers: {
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'bypass-tunnel-reminder': 'true',
          },
        });
        if (res.ok) {
          const serverP: Participant = await res.json();
          if (serverP && serverP.participant_id) {
            p = serverP;
            const existingIdx = this.participants.findIndex((item) => item.participant_id === id);
            if (existingIdx >= 0) {
              this.participants[existingIdx] = serverP;
            } else {
              this.participants.push(serverP);
            }
            this.saveParticipants();
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch participant ${id} from server:`, err);
      }
    }

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

    // Attempt authoritative creation on server first
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/participants?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'bypass-tunnel-reminder': 'true',
          },
          body: JSON.stringify(input),
        });

        if (res.ok) {
          const serverCreated: Participant = await res.json();
          if (serverCreated && serverCreated.participant_id) {
            const exIdx = this.participants.findIndex(
              (p) => p.participant_id === serverCreated.participant_id
            );
            if (exIdx >= 0) {
              this.participants[exIdx] = serverCreated;
            } else {
              this.participants.unshift(serverCreated);
            }
            this.saveParticipants();
            return serverCreated;
          }
        }
      } catch (err) {
        console.warn('Failed to register participant on server API:', err);
      }
    }

    // Fallback ID generation if offline
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
      total_questions: input.total_questions || 40,
      last_activity_time: new Date().toISOString(),
      last_activity_description: 'Started the quiz',
    };

    this.participants.unshift(newParticipant);
    this.saveParticipants();
    return newParticipant;
  }

  public async updateParticipant(
    id: number,
    data: Partial<Participant>
  ): Promise<Participant> {
    this.loadParticipants();
    let index = this.participants.findIndex((p) => p.participant_id === id);

    // If not found in memory/storage, attempt to recover participant
    if (index === -1 && typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/participants/${id}?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true`);
        if (res.ok) {
          const serverP: Participant = await res.json();
          if (serverP && serverP.participant_id) {
            this.participants.unshift(serverP);
            index = 0;
          }
        }
      } catch {
        // Continue to fallback
      }
    }

    let updated: Participant;

    if (index === -1) {
      // Resilient fallback - NEVER throw 'Participant not found'
      updated = {
        participant_id: id,
        name: data.name || `Participant #${id}`,
        phone: data.phone || '',
        quiz_id: data.quiz_id || 1,
        start_time: data.start_time || new Date().toISOString(),
        end_time: data.end_time || null,
        score: data.score ?? null,
        status: data.status || 'active',
        violation_count: data.violation_count || 0,
        current_question: data.current_question || 1,
        total_questions: data.total_questions || 40,
        last_activity_time: new Date().toISOString(),
        last_activity_description: data.last_activity_description || 'Active',
        ...data,
      };
      this.participants.unshift(updated);
    } else {
      const current = this.participants[index];
      updated = {
        ...current,
        ...data,
        last_activity_time: new Date().toISOString(),
      };

      if (
        data.status !== 'active' &&
        data.status !== 'completed' &&
        updated.violation_count >= 2 &&
        updated.status === 'active'
      ) {
        updated.status = 'flagged';
      }

      this.participants[index] = updated;
    }

    this.saveParticipants();

    // Persist to server /api/participants/${id}
    if (typeof window !== 'undefined') {
      try {
        await fetch(`/api/participants/${id}?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'bypass-tunnel-reminder': 'true',
          },
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
    let index = this.participants.findIndex((p) => p.participant_id === id);

    if (index === -1 && typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/participants/${id}?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true`);
        if (res.ok) {
          const serverP: Participant = await res.json();
          if (serverP && serverP.participant_id) {
            this.participants.unshift(serverP);
            index = 0;
          }
        }
      } catch {
        // Fallback below
      }
    }

    let updated: Participant;

    if (index === -1) {
      updated = {
        participant_id: id,
        name: `Participant #${id}`,
        phone: '',
        quiz_id: 1,
        start_time: new Date().toISOString(),
        end_time: null,
        score: null,
        status: 'active',
        violation_count: 1,
        current_question: 1,
        total_questions: 40,
        last_activity_time: new Date().toISOString(),
        last_activity_description: description || 'Violation detected',
      };
      this.participants.unshift(updated);
    } else {
      const current = this.participants[index];
      const newViolationCount = (current.violation_count || 0) + 1;
      const isFlagged = newViolationCount >= 3;

      updated = {
        ...current,
        violation_count: newViolationCount,
        status: isFlagged ? 'flagged' : current.status,
        last_activity_time: new Date().toISOString(),
        last_activity_description: description || 'Violation detected',
      };

      this.participants[index] = updated;
    }

    this.saveParticipants();

    if (typeof window !== 'undefined') {
      try {
        await fetch(`/api/participants/${id}?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'bypass-tunnel-reminder': 'true',
          },
          body: JSON.stringify({
            violation_count: updated.violation_count,
            status: updated.status,
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

    // Persist to server /api/results
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/results?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'bypass-tunnel-reminder': 'true',
          },
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
    let res = this.results.find((r) => r.participant_id === participantId);
    if ((!res || !res.review_items || res.review_items.length === 0) && typeof window !== 'undefined') {
      try {
        const rRes = await fetch(
          `/api/results?participant_id=${participantId}&full=true&ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true`,
          {
            headers: {
              'Accept': 'application/json',
              'ngrok-skip-browser-warning': 'true',
              'bypass-tunnel-reminder': 'true',
            },
          }
        );
        if (rRes.ok) {
          const singleResult: ParticipantResult = await rRes.json();
          if (singleResult && singleResult.participant_id === participantId) {
            const exIdx = this.results.findIndex((r) => r.participant_id === participantId);
            if (exIdx >= 0) {
              this.results[exIdx] = singleResult;
            } else {
              this.results.unshift(singleResult);
            }
            this.saveResultsToLocal();
            return singleResult;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch single participant result:', err);
      }
    }
    return res ? { ...res } : null;
  }

  public subscribeToParticipants(callback: (participants: Participant[]) => void): () => void {
    callback([...this.participants]);
    return realtimeBus.on<Participant[]>('participants_updated', (updated) => {
      callback([...updated]);
    });
  }

  public clearAll(): void {
    this.participants = [];
    this.results = [];
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY_PARTICIPANTS);
        localStorage.removeItem(STORAGE_KEY_RESULTS);
      } catch {
        // Ignore
      }
    }
    realtimeBus.emit('participants_updated', []);
  }
}

export const participantService = new ParticipantService();
