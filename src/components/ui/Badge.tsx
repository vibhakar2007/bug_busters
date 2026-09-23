import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'neutral' | 'outline';
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
  const baseStyles = 'inline-flex items-center font-medium rounded-full select-none';

  const variants = {
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    danger: 'bg-rose-50 text-rose-800 border border-rose-200/80',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/80',
    neutral: 'bg-neutral-100 text-neutral-800 border border-neutral-200/70',
    outline: 'bg-white text-neutral-700 border border-neutral-300',
  };

  const dotColors = {
    success: 'bg-emerald-500 ring-2 ring-emerald-200',
    danger: 'bg-rose-500 ring-2 ring-rose-200',
    warning: 'bg-amber-500 ring-2 ring-amber-200',
    neutral: 'bg-neutral-400',
    outline: 'bg-neutral-400',
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
