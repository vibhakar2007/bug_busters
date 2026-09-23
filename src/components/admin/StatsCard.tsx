import React from 'react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'neutral' | 'success' | 'danger' | 'warning';
  trend?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'neutral',
  trend,
}) => {
  const iconVariants = {
    neutral: 'bg-neutral-100 text-neutral-800',
    success: 'bg-emerald-50 text-emerald-700',
    danger: 'bg-rose-50 text-rose-700',
    warning: 'bg-amber-50 text-amber-700',
  };

  return (
    <Card hover className="p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
          {title}
        </span>
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', iconVariants[variant])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 font-mono-tabular">
            {value}
          </span>
          {trend && (
            <span className="text-xs font-medium text-emerald-600 font-mono-tabular">
              {trend}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-neutral-500 mt-1 font-normal">{subtitle}</p>}
      </div>
    </Card>
  );
};
