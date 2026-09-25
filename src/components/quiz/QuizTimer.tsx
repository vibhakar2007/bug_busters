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
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 animate-pulse'
          : 'bg-[#0d1224] border-[#283f5f] text-white',
        className
      )}
    >
      {isCritical ? (
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
      ) : (
        <Clock className="w-3.5 h-3.5 text-[#9db40c] shrink-0" />
      )}
      <div className="flex flex-col items-start leading-none">
        <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
          Time Remaining
        </span>
        <span className="font-mono-tabular font-bold text-sm tracking-tight text-white mt-0.5">
          {formatted}
        </span>
      </div>
    </div>
  );
};
