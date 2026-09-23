'use client';

import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';
import { cn } from '@/lib/utils/cn';

interface QuizTimerProps {
  endTimeExpected: string;
  onExpire: () => void;
  className?: string;
}

export const QuizTimer: React.FC<QuizTimerProps> = ({
  endTimeExpected,
  onExpire,
  className,
}) => {
  const { formatted, isCritical } = useTimer({
    endTimeExpected,
    onExpire,
  });

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors shadow-xs',
        isCritical
          ? 'bg-rose-50 border-rose-200 text-rose-800 animate-pulse'
          : 'bg-white border-neutral-200/90 text-neutral-900',
        className
      )}
    >
      {isCritical ? (
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
      ) : (
        <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
      )}
      <div className="flex flex-col items-start leading-none">
        <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-400">
          Time Remaining
        </span>
        <span className="font-mono-tabular font-bold text-sm tracking-tight text-neutral-950 mt-0.5">
          {formatted}
        </span>
      </div>
    </div>
  );
};
