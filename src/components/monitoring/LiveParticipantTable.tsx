'use client';

import React, { useState, useMemo } from 'react';
import { Participant } from '@/types/participant';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Search, AlertTriangle, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface LiveParticipantTableProps {
  participants: Participant[];
  onSelectParticipant: (participant: Participant) => void;
  onClearFlag?: (participantId: number) => void;
  quizDurationMinutes?: number;
  className?: string;
}

function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '—';
  }
}

function calculateDuration(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): { text: string; isRunning: boolean } {
  if (!startTime) return { text: '—', isRunning: false };
  try {
    const start = new Date(startTime).getTime();
    if (isNaN(start)) return { text: '—', isRunning: false };

    let end = endTime ? new Date(endTime).getTime() : Date.now();
    if (isNaN(end) || end < start) end = Date.now();

    const diffSec = Math.max(0, Math.floor((end - start) / 1000));
    const hours = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;

    let formatted = '';
    if (hours > 0) {
      formatted = `${hours}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      formatted = `${mins}m ${secs}s`;
    } else {
      formatted = `${secs}s`;
    }

    return {
      text: formatted,
      isRunning: !endTime,
    };
  } catch {
    return { text: '—', isRunning: false };
  }
}

export const LiveParticipantTable: React.FC<LiveParticipantTableProps> = ({
  participants,
  onSelectParticipant,
  onClearFlag,
  className,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'flagged'>('all');

  const filtered = useMemo(() => {
    return participants.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.phone.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [participants, search, statusFilter]);

  const getStatusBadge = (status: string, violations: number) => {
    if (status === 'flagged') {
      return (
        <Badge variant="danger" dot>
          Flagged
        </Badge>
      );
    }
    if (status === 'completed') {
      return (
        <Badge variant="neutral" dot>
          Completed
        </Badge>
      );
    }
    if (violations > 0) {
      return (
        <Badge variant="warning" dot>
          Active (Warning)
        </Badge>
      );
    }
    return (
      <Badge variant="success" dot>
        Active
      </Badge>
    );
  };

  return (
    <div className={cn('bg-[#0d1224] border border-[#283f5f]/60 rounded-2xl p-5 flex flex-col text-white shadow-xl', className)}>
      {/* Header controls: Search & filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-[#283f5f]/40">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search participant or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-[#070916] border border-[#283f5f] text-white rounded-xl placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#9db40c] transition-all"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-[#070916] border border-[#283f5f]/60 rounded-xl text-xs font-semibold self-start sm:self-auto overflow-x-auto max-w-full">
          {(['all', 'active', 'flagged', 'completed'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={cn(
                'px-3 py-1.5 rounded-lg capitalize transition-all whitespace-nowrap cursor-pointer',
                statusFilter === filter
                  ? 'bg-[#031c6c] text-[#9db40c] border border-[#283f5f] shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Table list */}
      <div className="overflow-x-auto mt-2 -mx-2 sm:mx-0 px-2 sm:px-0">
        <table className="w-full min-w-[960px] text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-[#283f5f]/40 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
              <th className="py-3 px-3">Participant</th>
              <th className="py-3 px-3">Phone</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 min-w-[130px]">MCQ (40)</th>
              <th className="py-3 px-3 min-w-[130px]">Hands-On (10)</th>
              <th className="py-3 px-3">Start Time</th>
              <th className="py-3 px-3">End Time</th>
              <th className="py-3 px-3">Duration</th>
              <th className="py-3 px-3 text-center text-[#9db40c]">Total Score (90)</th>
              <th className="py-3 px-3 text-center">Violations</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#283f5f]/20">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-500 text-xs font-medium">
                  No participants match current filter.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const totalQ = p.total_questions || 40;
                const currentQ = p.current_question || 0;
                const mcqPercent = Math.min(100, Math.round((currentQ / totalQ) * 100));

                const handsOnSolved =
                  p.hands_on_score ??
                  (p.hands_on_submissions
                    ? Object.values(p.hands_on_submissions).filter((s) => s.is_solved).length
                    : 0);
                const handsOnTotal = p.hands_on_total ?? 10;
                const handsOnPercent = Math.min(100, Math.round((handsOnSolved / handsOnTotal) * 100));

                const durationInfo = calculateDuration(p.start_time, p.end_time);

                return (
                  <tr
                    key={p.participant_id}
                    onClick={() => onSelectParticipant(p)}
                    className="hover:bg-[#283f5f]/20 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-3">
                      <span className="font-bold text-white group-hover:text-[#9db40c] block truncate">
                        {p.name}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono-tabular text-slate-400 text-xs">
                      {p.phone}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getStatusBadge(p.status, p.violation_count)}
                    </td>

                    {/* MCQ Progress */}
                    <td className="py-3 px-3 min-w-[130px]">
                      <div className="flex items-center gap-2">
                        <Progress value={mcqPercent} className="h-1.5 flex-1 bg-[#070916]" barClassName="bg-[#9db40c]" />
                        <span className="text-[11px] font-mono-tabular text-slate-300 font-semibold whitespace-nowrap">
                          {currentQ}/{totalQ}
                        </span>
                      </div>
                    </td>

                    {/* Hands-On Debug Progress */}
                    <td className="py-3 px-3 min-w-[130px]">
                      <div className="flex items-center gap-2">
                        <Progress value={handsOnPercent} className="h-1.5 flex-1 bg-[#070916]" barClassName="bg-blue-400" />
                        <span className="text-[11px] font-mono-tabular text-blue-300 font-semibold whitespace-nowrap">
                          {handsOnSolved}/{handsOnTotal}
                        </span>
                      </div>
                    </td>

                    {/* Start Time */}
                    <td className="py-3 px-3 font-mono-tabular text-xs text-slate-300 whitespace-nowrap">
                      {formatTime(p.start_time)}
                    </td>

                    {/* End Time */}
                    <td className="py-3 px-3 font-mono-tabular text-xs whitespace-nowrap">
                      {p.end_time ? (
                        <span className="text-slate-300">{formatTime(p.end_time)}</span>
                      ) : (
                        <span className="text-amber-400 font-medium">In Progress</span>
                      )}
                    </td>

                    {/* Duration / Time Taken */}
                    <td className="py-3 px-3 font-mono-tabular text-xs whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md border text-[11px]',
                          durationInfo.isRunning
                            ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                            : 'bg-[#031c6c]/40 border-[#283f5f] text-slate-200'
                        )}
                      >
                        <Clock className="w-3 h-3 text-slate-400" />
                        {durationInfo.text}
                      </span>
                    </td>

                    {/* Total Score (90) */}
                    <td className="py-3 px-3 text-center font-mono-tabular">
                      {p.score !== null || p.hands_on_score !== undefined || p.status === 'completed' || handsOnSolved > 0 ? (
                        <span className="text-[#9db40c] font-black text-xs sm:text-sm">
                          {(p.score ?? 0) + (handsOnSolved * 5)} / 90
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* Violations */}
                    <td className="py-3 px-3 text-center font-mono-tabular">
                      {p.violation_count > 0 ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-xs',
                            p.violation_count >= 2
                              ? 'bg-rose-950/70 border border-rose-800 text-rose-300'
                              : 'bg-amber-950/70 border border-amber-800 text-amber-300'
                          )}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {p.violation_count}
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(p.status === 'flagged' || (p.violation_count || 0) >= 2) && onClearFlag && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClearFlag(p.participant_id);
                            }}
                            className="px-2.5 py-1 bg-[#9db40c] hover:bg-[#b0c90e] text-[#070916] text-[11px] font-bold rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                            title="Clear flag & reset violations"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Clear Flag</span>
                          </button>
                        )}
                        <div className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 group-hover:text-white group-hover:bg-[#283f5f]/40 transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
