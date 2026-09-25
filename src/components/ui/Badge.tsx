import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'neutral' | 'outline' | 'moss';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className,
  dot = false,
}) => {
  const baseStyles = 'inline-flex items-center font-semibold rounded-full select-none';

  const variants = {
    success: 'bg-[#9db40c]/15 text-[#9db40c] border border-[#9db40c]/50',
    danger: 'bg-rose-950/50 text-rose-300 border border-rose-800/60',
    warning: 'bg-amber-950/50 text-amber-300 border border-amber-800/60',
    neutral: 'bg-[#031c6c]/40 text-slate-200 border border-[#283f5f]',
    outline: 'bg-transparent text-slate-300 border border-[#283f5f]',
    moss: 'bg-[#506022]/40 text-[#d4ee47] border border-[#506022]',
  };

  const dotColors = {
    success: 'bg-[#9db40c] ring-2 ring-[#9db40c]/30',
    danger: 'bg-rose-500 ring-2 ring-rose-500/30',
    warning: 'bg-amber-500 ring-2 ring-amber-500/30',
    neutral: 'bg-sky-400 ring-2 ring-sky-400/30',
    outline: 'bg-slate-400 ring-2 ring-slate-400/30',
    moss: 'bg-[#9db40c] ring-2 ring-[#9db40c]/30',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-0.5 gap-1.5',
    md: 'text-sm px-3 py-1 gap-2',
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
};
