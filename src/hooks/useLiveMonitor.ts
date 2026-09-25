import { useState, useEffect, useRef } from 'react';
import { Participant } from '@/types/participant';
import { ParticipantActivity } from '@/types/activity';
import { participantService } from '@/lib/api/participantService';
import { activityService } from '@/lib/api/activityService';

function deduplicateActivities(items: ParticipantActivity[]): ParticipantActivity[] {
  const seenIds = new Set<number>();
  const seenFingerprints = new Set<string>();
  const deduped: ParticipantActivity[] = [];

  for (const item of items) {
    if (!item) continue;
    if (seenIds.has(item.activity_id)) continue;

    const timeBucket = Math.floor(new Date(item.event_time).getTime() / 2000);
    const fingerprint = `${item.participant_id}_${item.event_type}_${timeBucket}`;
    if (seenFingerprints.has(fingerprint)) continue;

    seenIds.add(item.activity_id);
    seenFingerprints.add(fingerprint);
    deduped.push(item);
  }

  return deduped;
}

export function useLiveMonitor() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activities, setActivities] = useState<ParticipantActivity[]>([]);

  // Subscribe to local event bus updates
  useEffect(() => {
    const unsubParticipants = participantService.subscribeToParticipants((updatedList) => {
      setParticipants(updatedList);
    });

    const unsubActivity = activityService.subscribeToActivity((newActivity) => {
      setActivities((prev) => deduplicateActivities([newActivity, ...prev]).slice(0, 50));
    });

    return () => {
      unsubParticipants();
      unsubActivity();
    };
  }, []);

  const pEtagRef = useRef<string | null>(null);
  const aEtagRef = useRef<string | null>(null);

  // Multi-user periodic sync to automatically pull live data across all connected devices
  useEffect(() => {
    let isMounted = true;

    const fetchSync = async () => {
      try {
        const pHeaders: Record<string, string> = {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'bypass-tunnel-reminder': 'true',
        };
        if (pEtagRef.current) pHeaders['If-None-Match'] = pEtagRef.current;

        const aHeaders: Record<string, string> = {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'bypass-tunnel-reminder': 'true',
        };
        if (aEtagRef.current) aHeaders['If-None-Match'] = aEtagRef.current;

        const [pRes, aRes] = await Promise.all([
          fetch('/api/participants?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true', { headers: pHeaders }),
          fetch('/api/activity?limit=50&ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true', { headers: aHeaders }),
        ]);

        if (!isMounted) return;

        if (pRes.status === 200) {
          const etag = pRes.headers.get('etag');
          if (etag) pEtagRef.current = etag;
          const pData = await pRes.json();
          if (Array.isArray(pData)) {
            setParticipants(pData);
          }
        }

        if (aRes.status === 200) {
          const etag = aRes.headers.get('etag');
          if (etag) aEtagRef.current = etag;
          const aData = await aRes.json();
          if (Array.isArray(aData)) {
            setActivities(deduplicateActivities(aData).slice(0, 50));
          }
        }
      } catch {
        // silent on network disconnect
      }
    };

    fetchSync();
    const interval = setInterval(fetchSync, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Aggregate stats
  const total = participants.length;
  const active = participants.filter((p) => p.status === 'active').length;
  const completed = participants.filter((p) => p.status === 'completed').length;
  const flagged = participants.filter((p) => p.status === 'flagged').length;
  const totalViolations = participants.reduce((acc, p) => acc + (p.violation_count || 0), 0);

  return {
    participants,
    activities,
    stats: {
      total,
      active,
      completed,
      flagged,
      totalViolations,
    },
  };
}
