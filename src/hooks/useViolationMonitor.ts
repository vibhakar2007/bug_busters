import { useEffect, useRef, useState, useCallback } from 'react';
import { ActivityEventType } from '@/types/activity';
import { activityService } from '@/lib/api/activityService';
import { participantService } from '@/lib/api/participantService';

interface UseViolationMonitorProps {
  participantId: number;
  participantName: string;
  registrationNumber: string;
  currentQuestionId?: number | null;
  enabled?: boolean;
  onViolation?: (eventType: ActivityEventType, message: string, newCount: number) => void;
}

export interface ViolationToastState {
  id: string;
  type: ActivityEventType;
  message: string;
  timestamp: string;
  isFlagged: boolean;
}

export function useViolationMonitor({
  participantId,
  participantName,
  registrationNumber,
  currentQuestionId,
  enabled = true,
  onViolation,
}: UseViolationMonitorProps) {
  const [violationCount, setViolationCount] = useState<number>(0);
  const [activeWarning, setActiveWarning] = useState<ViolationToastState | null>(null);

  // Keep references to latest prop values
  const propsRef = useRef({
    participantId,
    participantName,
    registrationNumber,
    currentQuestionId,
    enabled,
    onViolation,
  });

  useEffect(() => {
    propsRef.current = {
      participantId,
      participantName,
      registrationNumber,
      currentQuestionId,
      enabled,
      onViolation,
    };
  }, [participantId, participantName, registrationNumber, currentQuestionId, enabled, onViolation]);

  // Grace period: ignore events during the first 5 seconds of mount
  const mountTimeRef = useRef<number>(Date.now());
  // Cooldown: enforce at least 5 seconds between recorded violations
  const lastViolationTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hiddenTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isNavigatingRef = useRef<boolean>(false);

  // Sync initial violation count from participant record
  useEffect(() => {
    let isMounted = true;
    if (participantId && participantId > 0) {
      participantService.getParticipant(participantId).then((p) => {
        if (isMounted && p) {
          setViolationCount(p.violation_count || 0);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [participantId]);

  const handleConfirmedViolation = useCallback(
    async (eventType: 'tab_switch', customMessage: string) => {
      const {
        participantId: pId,
        participantName: pName,
        registrationNumber: regNo,
        currentQuestionId: qId,
        enabled: isEnabled,
        onViolation: callback,
      } = propsRef.current;

      if (!isEnabled || !pId || pId <= 0 || isNavigatingRef.current) return;

      const now = Date.now();
      // Ignore if within 5 seconds of mount
      if (now - mountTimeRef.current < 5000) {
        return;
      }

      // Enforce 5s cooldown
      if (now - lastViolationTimeRef.current < 5000 || isProcessingRef.current) {
        return;
      }

      lastViolationTimeRef.current = now;
      isProcessingRef.current = true;

      try {
        const updated = await participantService.incrementViolation(pId, customMessage);
        const newCount = updated.violation_count;
        // 3-strike threshold: Strike 1 (Warning), Strike 2 (Final Warning), Strike 3 (Flagged)
        const isFlagged = newCount >= 3;

        setViolationCount(newCount);

        // Record activity in service layer
        await activityService.recordActivity({
          participant_id: pId,
          participant_name: pName,
          registration_number: regNo,
          question_id: qId || null,
          event_type: eventType,
          details: customMessage,
        });

        let warningMessage = '';
        if (newCount === 1) {
          warningMessage = 'Warning (1/3) • Tab switch detected. Please stay on this tab to complete the test.';
        } else if (newCount === 2) {
          warningMessage = 'Final Warning (2/3) • Tab switch detected. One more tab switch will flag your submission for audit.';
        } else {
          warningMessage = 'Audit Flagged (3/3) • Multiple tab switches detected. Your attempt has been flagged.';
        }

        const toastData: ViolationToastState = {
          id: `v_${now}_${Math.random().toString(36).slice(2, 6)}`,
          type: eventType,
          message: warningMessage,
          timestamp: new Date().toLocaleTimeString(),
          isFlagged,
        };

        setActiveWarning(toastData);

        if (callback) {
          callback(eventType, customMessage, newCount);
        }

        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }
        if (!isFlagged) {
          toastTimeoutRef.current = setTimeout(() => {
            setActiveWarning(null);
          }, 6000);
        }
      } catch (err) {
        console.error('Error recording anti-cheating violation:', err);
      } finally {
        isProcessingRef.current = false;
      }
    },
    []
  );

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    mountTimeRef.current = Date.now();
    isNavigatingRef.current = false;

    // Detect intentional tab switch:
    // Requires the document to remain hidden for at least 2.5 seconds (2500ms).
    // Momentary blur, input taps, keyboard popup, or brief gestures will cancel the timer and NOT record a violation.
    const onVisibilityChange = () => {
      if (isNavigatingRef.current) return;

      if (document.hidden) {
        // Clear any existing timer
        if (hiddenTimerRef.current) {
          clearTimeout(hiddenTimerRef.current);
        }

        // Start 2.5-second confirmation timer for sustained tab abandonment
        hiddenTimerRef.current = setTimeout(() => {
          if (document.hidden && !isNavigatingRef.current) {
            handleConfirmedViolation(
              'tab_switch',
              'Tab switch or window minimized detected'
            );
          }
        }, 2500);
      } else {
        // Tab became visible again before 2.5s -> momentary touch/gesture, cancel timer!
        if (hiddenTimerRef.current) {
          clearTimeout(hiddenTimerRef.current);
          hiddenTimerRef.current = null;
        }
      }
    };

    // Ignore visibility changes during page navigation or unload
    const onBeforeUnload = () => {
      isNavigatingRef.current = true;
      if (hiddenTimerRef.current) {
        clearTimeout(hiddenTimerRef.current);
        hiddenTimerRef.current = null;
      }
    };

    const onPageHide = () => {
      isNavigatingRef.current = true;
      if (hiddenTimerRef.current) {
        clearTimeout(hiddenTimerRef.current);
        hiddenTimerRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onPageHide);
      if (hiddenTimerRef.current) {
        clearTimeout(hiddenTimerRef.current);
      }
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [enabled, handleConfirmedViolation]);

  const dismissWarning = useCallback(() => {
    setActiveWarning(null);
  }, []);

  return {
    violationCount,
    activeWarning,
    dismissWarning,
  };
}
