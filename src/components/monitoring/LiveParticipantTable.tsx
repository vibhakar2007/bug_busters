'use client';

import React, { useState, useMemo } from 'react';
import { Participant } from '@/types/participant';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Search, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface LiveParticipantTableProps {
  participants: Participant[];
  onSelectParticipant: (participant: Participant) => void;
  quizDurationMinutes?: number;
  className?: string;
}

export const LiveParticipantTable: React.FC<LiveParticipantTableProps> = ({
  participants,
  onSelectParticipant,
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
    <div className={cn('bg-white border border-neutral-200/80 rounded-2xl p-5 flex flex-col', className)}>
      {/* Header controls: Search & filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search participant or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl text-xs font-medium self-start sm:self-auto overflow-x-auto max-w-full">
          {(['all', 'active', 'flagged', 'completed'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={cn(
                'px-3 py-1.5 rounded-lg capitalize transition-all whitespace-nowrap',
                statusFilter === filter
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900'
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Table list */}
      <div className="overflow-x-auto mt-2 -mx-2 sm:mx-0 px-2 sm:px-0">
        <table className="w-full min-w-[680px] text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-neutral-400 font-medium text-[11px] uppercase tracking-wider">
              <th className="py-3 px-3">Participant</th>
              <th className="py-3 px-3">Phone</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Progress</th>
              <th className="py-3 px-3 text-center">Score</th>
              <th className="py-3 px-3 text-center">Violations</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-neutral-400 text-xs">
                  No participants match current filter.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const totalQ = p.total_questions || 20;
                const currentQ = p.current_question || 0;
                const percent = Math.round((currentQ / totalQ) * 100);

                return (
                  <tr
                    key={p.participant_id}
                    onClick={() => onSelectParticipant(p)}
                    className="hover:bg-neutral-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-3">
                      <span className="font-semibold text-neutral-900 group-hover:text-neutral-950 block truncate">
                        {p.name}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono-tabular text-neutral-600 text-xs">
                      {p.phone}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getStatusBadge(p.status, p.violation_count)}
                    </td>
                    <td className="py-3 px-3 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <Progress value={percent} className="h-1.5 flex-1" />
                        <span className="text-[11px] font-mono-tabular text-neutral-500 whitespace-nowrap">
                          {currentQ}/{totalQ}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono-tabular font-medium text-neutral-900">
                      {p.score !== null ? `${p.score}/${totalQ}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-center font-mono-tabular">
                      {p.violation_count > 0 ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-xs',
                            p.violation_count >= 3
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          )}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {p.violation_count}
                        </span>
                      ) : (
                        <span className="text-neutral-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center justify-center p-1.5 rounded-lg text-neutral-400 group-hover:text-neutral-900 group-hover:bg-neutral-100 transition-colors">
                        <ChevronRight className="w-4 h-4" />
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
