import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTimerProps {
  endTimeExpected: string; // ISO string
  onExpire?: () => void;
  isPaused?: boolean;
}

export function useTimer({ endTimeExpected, onExpire, isPaused = false }: UseTimerProps) {
  const calculateRemaining = useCallback(() => {
    const end = new Date(endTimeExpected).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((end - now) / 1000));
  }, [endTimeExpected]);

  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => calculateRemaining());
  const onExpireRef = useRef(onExpire);
  const expiredHandledRef = useRef(false);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    expiredHandledRef.current = false;
    const initial = calculateRemaining();
    const timer = setTimeout(() => {
      setRemainingSeconds(initial);
    }, 0);
    return () => clearTimeout(timer);
  }, [endTimeExpected, calculateRemaining]);

  useEffect(() => {
    if (isPaused) return;

    const tick = () => {
      const remaining = calculateRemaining();
      setRemainingSeconds(remaining);

      if (remaining <= 0 && !expiredHandledRef.current) {
        expiredHandledRef.current = true;
        if (onExpireRef.current) {
          onExpireRef.current();
        }
      }
    };

    // Initial tick
    tick();

    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [calculateRemaining, isPaused]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const isCritical = remainingSeconds > 0 && remainingSeconds <= 120; // Under 2 minutes
  const isExpired = remainingSeconds <= 0;

  return {
    remainingSeconds,
    formatted,
    minutes,
    seconds,
    isCritical,
    isExpired,
  };
}
