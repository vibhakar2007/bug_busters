'use client';

import React from 'react';
import { ParticipantActivity } from '@/types/activity';
import { formatTimestamp } from '@/lib/utils/cn';
import { cn } from '@/lib/utils/cn';
import {
  AlertOctagon,
  EyeOff,
  Minimize2,
  Copy,
  CheckCircle2,
  LogIn,
  Send,
  HelpCircle,
} from 'lucide-react';

interface LiveActivityFeedProps {
  activities: ParticipantActivity[];
  onSelectParticipant?: (participantId: number) => void;
  className?: string;
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({
  activities,
  onSelectParticipant,
  className,
}) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'tab_switch':
        return <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />;
      case 'focus_loss':
        return <EyeOff className="w-3.5 h-3.5 text-amber-400" />;
      case 'fullscreen_exit':
        return <Minimize2 className="w-3.5 h-3.5 text-amber-400" />;
      case 'copy_attempt':
      case 'paste_attempt':
        return <Copy className="w-3.5 h-3.5 text-rose-400" />;
      case 'answer_selected':
        return <CheckCircle2 className="w-3.5 h-3.5 text-[#9db40c]" />;
      case 'quiz_started':
        return <LogIn className="w-3.5 h-3.5 text-[#9db40c]" />;
      case 'quiz_submitted':
        return <Send className="w-3.5 h-3.5 text-[#9db40c]" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const uniqueActivities = React.useMemo(() => {
    const seen = new Set<string>();
    return activities.filter((act, idx) => {
      const key = act.activity_id ? String(act.activity_id) : `${act.event_time}_${idx}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [activities]);

  return (
    <div className={cn('bg-[#0d1224] border border-[#283f5f]/60 rounded-2xl p-5 flex flex-col text-white shadow-xl', className)}>
      <div className="flex items-center justify-between pb-3 border-b border-[#283f5f]/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#9db40c] animate-pulse" />
          <h3 className="text-sm font-bold text-white tracking-tight">Recent Activity</h3>
        </div>
        <span className="text-[11px] text-slate-400 font-mono-tabular">Live Feed</span>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto space-y-2.5 max-h-[520px] pr-1">
        {uniqueActivities.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-medium">No activity recorded yet.</div>
        ) : (
          uniqueActivities.map((act, index) => {
            const isViolation = act.severity === 'violation';
            const isWarning = act.severity === 'warning';
            const stableKey = act.activity_id ? `act_${act.activity_id}` : `act_${act.event_time}_${index}`;

            return (
              <div
                key={stableKey}
                onClick={() => onSelectParticipant?.(act.participant_id)}
                className={cn(
                  'p-3 rounded-xl border text-xs transition-all cursor-pointer flex items-start gap-2.5',
                  isViolation
                    ? 'bg-rose-950/60 border-rose-800 text-rose-200 hover:bg-rose-900/60'
                    : isWarning
                    ? 'bg-amber-950/60 border-amber-800 text-amber-200 hover:bg-amber-900/60'
                    : 'bg-[#070916] border-[#283f5f]/40 text-slate-300 hover:bg-[#283f5f]/25'
                )}
              >
                <div className="mt-0.5 shrink-0">{getEventIcon(act.event_type)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-white truncate">
                      {act.participant_name || `Participant #${act.participant_id}`}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono-tabular shrink-0">
                      {formatTimestamp(act.event_time)}
                    </span>
                  </div>

                  <p
                    className={cn(
                      'mt-0.5 text-[11px] truncate',
                      isViolation
                        ? 'text-rose-300 font-medium'
                        : isWarning
                        ? 'text-amber-300'
                        : 'text-slate-400'
                    )}
                  >
                    {act.details || act.event_type.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
