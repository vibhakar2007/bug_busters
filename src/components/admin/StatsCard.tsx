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
    neutral: 'bg-[#031c6c]/40 text-[#9db40c] border border-[#283f5f]',
    success: 'bg-[#9db40c]/20 text-[#9db40c] border border-[#9db40c]/40',
    danger: 'bg-rose-950/60 text-rose-300 border border-rose-800/60',
    warning: 'bg-amber-950/60 text-amber-300 border border-amber-800/60',
  };

  return (
    <Card hover className="p-5 flex flex-col justify-between bg-[#0d1224] border border-[#283f5f]/60 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shadow-xs', iconVariants[variant])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono-tabular">
            {value}
          </span>
          {trend && (
            <span className="text-xs font-bold text-[#9db40c] font-mono-tabular">
              {trend}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>}
      </div>
    </Card>
  );
};
