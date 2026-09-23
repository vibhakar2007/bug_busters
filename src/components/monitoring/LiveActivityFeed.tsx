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
        return <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />;
      case 'focus_loss':
        return <EyeOff className="w-3.5 h-3.5 text-amber-600" />;
      case 'fullscreen_exit':
        return <Minimize2 className="w-3.5 h-3.5 text-amber-600" />;
      case 'copy_attempt':
      case 'paste_attempt':
        return <Copy className="w-3.5 h-3.5 text-rose-600" />;
      case 'answer_selected':
        return <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400" />;
      case 'quiz_started':
        return <LogIn className="w-3.5 h-3.5 text-emerald-600" />;
      case 'quiz_submitted':
        return <Send className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  return (
    <div className={cn('bg-white border border-neutral-200/80 rounded-2xl p-5 flex flex-col', className)}>
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-neutral-900 tracking-tight">Recent Activity</h3>
        </div>
        <span className="text-[11px] text-neutral-400 font-mono-tabular">Live Feed</span>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto space-y-2.5 max-h-[520px] pr-1">
        {activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400">No activity recorded yet.</div>
        ) : (
          activities.map((act) => {
            const isViolation = act.severity === 'violation';
            const isWarning = act.severity === 'warning';

            return (
              <div
                key={act.activity_id}
                onClick={() => onSelectParticipant?.(act.participant_id)}
                className={cn(
                  'p-3 rounded-xl border text-xs transition-all cursor-pointer flex items-start gap-2.5',
                  isViolation
                    ? 'bg-rose-50/70 border-rose-200/80 hover:bg-rose-50'
                    : isWarning
                    ? 'bg-amber-50/50 border-amber-200/70 hover:bg-amber-50'
                    : 'bg-neutral-50/60 border-neutral-200/60 hover:bg-neutral-100/60'
                )}
              >
                <div className="mt-0.5 shrink-0">{getEventIcon(act.event_type)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-neutral-900 truncate">
                      {act.participant_name || `Participant #${act.participant_id}`}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono-tabular shrink-0">
                      {formatTimestamp(act.event_time)}
                    </span>
                  </div>

                  <p
                    className={cn(
                      'mt-0.5 text-[11px] truncate',
                      isViolation
                        ? 'text-rose-800 font-medium'
                        : isWarning
                        ? 'text-amber-800'
                        : 'text-neutral-600'
                    )}
                  >
                    {act.details || act.event_type.replace('_', ' ')}
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
