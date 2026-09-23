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
  onViolation?: (eventType: ActivityEventType, message: string) => void;
}

export interface ViolationToastState {
  id: string;
  type: ActivityEventType;
  message: string;
  timestamp: string;
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
  const lastRecordedTimeRef = useRef<{ [key: string]: number }>({});
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // Sync initial violation count from participant service
  useEffect(() => {
    let isMounted = true;
    participantService.getParticipant(participantId).then((p) => {
      if (isMounted && p) {
        setViolationCount(p.violation_count || 0);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [participantId]);

  const recordViolation = useCallback(
    async (eventType: ActivityEventType, customMessage: string) => {
      const now = Date.now();
      const lastRecorded = lastRecordedTimeRef.current[eventType] || 0;

      // Throttle identical events within 1.5s to prevent event spam
      if (now - lastRecorded < 1500) {
        return;
      }
      lastRecordedTimeRef.current[eventType] = now;

      // Update participant violation count
      const updatedParticipant = await participantService.incrementViolation(
        participantId,
        customMessage
      );
      setViolationCount(updatedParticipant.violation_count);

      // Record activity in service layer
      await activityService.recordActivity({
        participant_id: participantId,
        participant_name: participantName,
        registration_number: registrationNumber,
        question_id: currentQuestionId || null,
        event_type: eventType,
        details: customMessage,
      });

      // Show in-app subtle warning
      const toastData: ViolationToastState = {
        id: `v_${Date.now()}`,
        type: eventType,
        message: customMessage,
        timestamp: new Date().toLocaleTimeString(),
      };
      setActiveWarning(toastData);

      if (onViolation) {
        onViolation(eventType, customMessage);
      }

      // Auto-dismiss warning after 4 seconds
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      timeoutIdRef.current = setTimeout(() => {
        setActiveWarning(null);
      }, 4000);
    },
    [participantId, participantName, registrationNumber, currentQuestionId, onViolation]
  );

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // 1. Tab switch / Visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('tab_switch', 'Tab switch or window minimized detected');
      }
    };

    // 2. Window blur (focus lost)
    const handleBlur = () => {
      recordViolation('focus_loss', 'Window focus lost. Please stay on the quiz page.');
    };

    // 3. Fullscreen changes
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        recordViolation('fullscreen_exit', 'Fullscreen mode was exited.');
      }
    };

    // 4. Copy attempts
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation('copy_attempt', 'Copying question content is prohibited.');
    };

    // 5. Paste attempts
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation('paste_attempt', 'Pasting content into the test is prohibited.');
    };

    // 6. Context menu (Right click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      recordViolation('context_menu', 'Right-click context menu is disabled during the quiz.');
    };

    // 7. Developer tools shortcut attempts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 or Ctrl+Shift+I or Ctrl+Shift+J or Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
      ) {
        e.preventDefault();
        recordViolation('dev_tools', 'Keyboard shortcut inspection attempt logged.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [enabled, recordViolation]);

  const dismissWarning = useCallback(() => {
    setActiveWarning(null);
  }, []);

  const requestFullscreen = useCallback(() => {
    if (typeof document !== 'undefined' && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request rejected or blocked by browser:', err);
      });
    }
  }, []);

  return {
    violationCount,
    activeWarning,
    dismissWarning,
    requestFullscreen,
  };
}
