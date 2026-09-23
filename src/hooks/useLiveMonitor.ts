import { useState, useEffect, useRef, useCallback } from 'react';
import { Participant } from '@/types/participant';
import { ParticipantActivity, ActivityEventType } from '@/types/activity';
import { participantService } from '@/lib/api/participantService';
import { activityService } from '@/lib/api/activityService';

export function useLiveMonitor() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activities, setActivities] = useState<ParticipantActivity[]>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to participants
  useEffect(() => {
    const unsubscribe = participantService.subscribeToParticipants((updatedList) => {
      setParticipants(updatedList);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Fetch initial activities and subscribe to incoming real-time activity events
  useEffect(() => {
    activityService.getRecentActivities(25).then((list) => {
      setActivities(list);
    });

    const unsubscribe = activityService.subscribeToActivity((newActivity) => {
      setActivities((prev) => [newActivity, ...prev.slice(0, 49)]);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Simulation engine
  const startSimulation = useCallback(() => {
    setIsSimulating(true);
  }, []);

  const stopSimulation = useCallback(() => {
    setIsSimulating(false);
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isSimulating) {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
      return;
    }

    const runSimTick = async () => {
      const currentParticipants = await participantService.getAllParticipants();
      const activeOnly = currentParticipants.filter((p) => p.status === 'active');
      if (activeOnly.length === 0) return;

      const randomParticipant = activeOnly[Math.floor(Math.random() * activeOnly.length)];
      const eventRoll = Math.random();

      if (eventRoll < 0.7) {
        // Normal answer progress
        const currentQ = (randomParticipant.current_question || 1) + 1;
        const isFinished = currentQ >= (randomParticipant.total_questions || 20);

        if (isFinished) {
          const finalScore = Math.floor(14 + Math.random() * 6);
          await participantService.updateParticipant(randomParticipant.participant_id, {
            status: 'completed',
            score: finalScore,
            current_question: 20,
            last_activity_description: `Quiz submitted (${finalScore}/20)`,
          });
          await activityService.recordActivity({
            participant_id: randomParticipant.participant_id,
            participant_name: randomParticipant.name,
            registration_number: randomParticipant.phone,
            event_type: 'quiz_submitted',
            details: `Completed quiz with score ${finalScore}/20`,
          });
        } else {
          await participantService.updateParticipant(randomParticipant.participant_id, {
            current_question: currentQ,
            last_activity_description: `Answered Question ${currentQ}`,
          });
          const options = ['a', 'b', 'c', 'd'];
          const chosen = options[Math.floor(Math.random() * 4)];
          await activityService.recordActivity({
            participant_id: randomParticipant.participant_id,
            participant_name: randomParticipant.name,
            registration_number: randomParticipant.phone,
            question_id: currentQ,
            event_type: 'answer_selected',
            selected_option: chosen,
            details: `Answered Question ${currentQ} (${chosen.toUpperCase()})`,
          });
        }
      } else if (eventRoll < 0.9) {
        // Warning: focus loss or context menu
        const warningTypes: ActivityEventType[] = ['focus_loss', 'context_menu', 'fullscreen_exit'];
        const chosen = warningTypes[Math.floor(Math.random() * warningTypes.length)];
        const msg =
          chosen === 'focus_loss'
            ? 'Browser focus lost'
            : chosen === 'context_menu'
            ? 'Context menu right-click attempt'
            : 'Fullscreen mode exited';

        await participantService.incrementViolation(randomParticipant.participant_id, msg);
        await activityService.recordActivity({
          participant_id: randomParticipant.participant_id,
          participant_name: randomParticipant.name,
          registration_number: randomParticipant.phone,
          event_type: chosen,
          details: msg,
        });
      } else {
        // Violation: tab switch or copy
        const violationTypes: ActivityEventType[] = ['tab_switch', 'copy_attempt'];
        const chosen = violationTypes[Math.floor(Math.random() * violationTypes.length)];
        const msg =
          chosen === 'tab_switch' ? 'Tab switch detected' : 'Content copy attempt prevented';

        await participantService.incrementViolation(randomParticipant.participant_id, msg);
        await activityService.recordActivity({
          participant_id: randomParticipant.participant_id,
          participant_name: randomParticipant.name,
          registration_number: randomParticipant.phone,
          event_type: chosen,
          details: msg,
        });
      }
    };

    simulationTimerRef.current = setInterval(runSimTick, 4500);

    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
    };
  }, [isSimulating]);

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
    isSimulating,
    startSimulation,
    stopSimulation,
  };
}
