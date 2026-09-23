import { useState, useEffect } from 'react';
import { Participant } from '@/types/participant';
import { ParticipantActivity } from '@/types/activity';
import { participantService } from '@/lib/api/participantService';
import { activityService } from '@/lib/api/activityService';

export function useLiveMonitor() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activities, setActivities] = useState<ParticipantActivity[]>([]);

  // Subscribe to local event bus updates
  useEffect(() => {
    const unsubParticipants = participantService.subscribeToParticipants((updatedList) => {
      setParticipants(updatedList);
    });

    const unsubActivity = activityService.subscribeToActivity((newActivity) => {
      setActivities((prev) => [newActivity, ...prev.slice(0, 49)]);
    });

    return () => {
      unsubParticipants();
      unsubActivity();
    };
  }, []);

  // Multi-user periodic sync to automatically pull live data across all connected devices
  useEffect(() => {
    let isMounted = true;

    const fetchSync = async () => {
      try {
        const [pRes, aRes] = await Promise.all([
          fetch('/api/participants'),
          fetch('/api/activity'),
        ]);

        if (!isMounted) return;

        if (pRes.ok) {
          const pData = await pRes.json();
          if (Array.isArray(pData)) {
            setParticipants(pData);
          }
        }

        if (aRes.ok) {
          const aData = await aRes.json();
          if (Array.isArray(aData)) {
            setActivities(aData.slice(0, 50));
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
