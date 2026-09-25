'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/cn';
import { animateProgressBar } from '@/animations/gsap';

export interface ProgressProps {
  value: number; // 0 to 100
  max?: number;
  className?: string;
  barClassName?: string;
  showText?: boolean;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  className,
  barClassName,
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    animateProgressBar(barRef.current, percentage);
  }, [percentage]);

  return (
    <div className={cn('h-2 w-full bg-[#070916] border border-[#283f5f]/40 rounded-full overflow-hidden', className)}>
      <div
        ref={barRef}
        className={cn('h-full bg-[#9db40c] rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(157,180,12,0.45)]', barClassName)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
