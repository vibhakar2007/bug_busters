'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Participant, ParticipantResult } from '@/types/participant';
import { participantService } from '@/lib/api/participantService';
import { ParticipantDrawer } from '@/components/admin/ParticipantDrawer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { animatePageEntrance, animateStaggerCards } from '@/animations/gsap';
import {
  Trophy,
  Medal,
  Award,
  Search,
  Download,
  AlertTriangle,
  ArrowUpDown,
  Clock,
  Eye,
} from 'lucide-react';
import { cn, formatTime } from '@/lib/utils/cn';

interface EnrichedResultItem {
  participant_id: number;
  participant: Participant;
  name: string;
  phone: string;
  score: number;
  total_questions: number;
  percentage: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  violation_count: number;
  time_taken_seconds: number;
  time_taken_formatted: string;
  integrity_status: 'Verified Clean' | 'Minor Warning' | 'Audit Flagged';
  is_valid: boolean;
  rank: number | null;
  result: ParticipantResult | null;
}

type SortField = 'score' | 'time' | 'violations' | 'status';
type SortOrder = 'asc' | 'desc';

export default function AdminResultsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [results, setResults] = useState<ParticipantResult[]>([]);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    animatePageEntrance(containerRef.current);
    Promise.all([
      participantService.getAllParticipants(),
      participantService.getResults(),
    ]).then(([pList, rList]) => {
      setParticipants(pList);
      setResults(rList);
    });
  }, []);

  const handleOpenReview = (p: Participant) => {
    setSelectedParticipant(p);
    setIsDrawerOpen(true);
  };

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'time' || field === 'violations' ? 'asc' : 'desc');
    }
  };

  // Build enriched list combining participant telemetry with full result details
  const enrichedList = useMemo<EnrichedResultItem[]>(() => {
    const resultMap = new Map<number, ParticipantResult>();
    results.forEach((r) => resultMap.set(r.participant_id, r));

    return participants
      .filter((p) => p.score !== null || p.status === 'completed')
      .map((p) => {
        const res = resultMap.get(p.participant_id) || null;
        const totalQ = res?.total_questions || p.total_questions || 10;
        const score = res?.score ?? (p.score || 0);
        const correct = res?.correct_count ?? score;
        const incorrect = res?.incorrect_count ?? Math.max(0, totalQ - correct);
        const unanswered = res?.unanswered_count ?? 0;
        const percentage = res?.percentage ?? Math.round((score / totalQ) * 100);

        let timeSec = res?.time_taken_seconds || 0;
        let timeFmt = res?.time_taken_formatted || '';

        if (!timeFmt) {
          if (p.start_time && p.end_time) {
            timeSec = Math.max(0, Math.floor((new Date(p.end_time).getTime() - new Date(p.start_time).getTime()) / 1000));
            timeFmt = formatTime(timeSec);
          } else {
            timeSec = 720;
            timeFmt = '12m 00s';
          }
        }

        const violations = p.violation_count || 0;
        const isFlagged = p.status === 'flagged' || violations >= 3;
        const isValid = !isFlagged;
        const integrity: 'Verified Clean' | 'Minor Warning' | 'Audit Flagged' =
          violations === 0 ? 'Verified Clean' : violations >= 3 ? 'Audit Flagged' : 'Minor Warning';

        return {
          participant_id: p.participant_id,
          participant: p,
          name: p.name,
          phone: p.phone,
          score,
          total_questions: totalQ,
          percentage,
          correct_count: correct,
          incorrect_count: incorrect,
          unanswered_count: unanswered,
          violation_count: violations,
          time_taken_seconds: timeSec,
          time_taken_formatted: timeFmt,
          integrity_status: integrity,
          is_valid: isValid,
          rank: null,
          result: res,
        };
      });
  }, [participants, results]);

  // Filter and sort
  const ranked = useMemo(() => {
    // 1. Calculate official standing for all valid (non-flagged) participants
    const validSorted = [...enrichedList]
      .filter((item) => item.is_valid)
      .sort((a, b) => {
        const scoreDiff = b.score - a.score;
        if (scoreDiff !== 0) return scoreDiff;
        return a.time_taken_seconds - b.time_taken_seconds;
      });

    const rankMap = new Map<number, number>();
    validSorted.forEach((item, index) => {
      rankMap.set(item.participant_id, index + 1);
    });

    const withRanks = enrichedList.map((item) => ({
      ...item,
      rank: item.is_valid ? rankMap.get(item.participant_id) || null : null,
    }));

    return withRanks
      .filter((item) => {
        const query = search.toLowerCase();
        return item.name.toLowerCase().includes(query) || item.phone.toLowerCase().includes(query);
      })
      .sort((a, b) => {
        // When sorting by score, valid participants always appear ahead of disqualified ones
        if (sortField === 'score') {
          if (a.is_valid !== b.is_valid) {
            return a.is_valid ? -1 : 1;
          }
          const diff = b.score - a.score;
          if (diff !== 0) return sortOrder === 'asc' ? -diff : diff;
          return a.time_taken_seconds - b.time_taken_seconds;
        }

        let diff = 0;
        if (sortField === 'time') {
          diff = a.time_taken_seconds - b.time_taken_seconds;
        } else if (sortField === 'violations') {
          diff = a.violation_count - b.violation_count;
        } else if (sortField === 'status') {
          const rankMap = { 'Verified Clean': 1, 'Minor Warning': 2, 'Audit Flagged': 3 };
          diff = rankMap[a.integrity_status] - rankMap[b.integrity_status];
        }

        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [enrichedList, search, sortField, sortOrder]);

  const top3 = useMemo(() => {
    // Only VALID (non-flagged) participants qualify for the final podium!
    return [...enrichedList]
      .filter((item) => item.is_valid)
      .sort((a, b) => {
        const scoreDiff = b.score - a.score;
        if (scoreDiff !== 0) return scoreDiff;
        return a.time_taken_seconds - b.time_taken_seconds;
      })
      .slice(0, 3);
  }, [enrichedList]);

  useEffect(() => {
    if (top3.length > 0) {
      const timer = setTimeout(() => {
        animateStaggerCards('.podium-card');
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [top3.length]);

  const exportCSV = () => {
    const headers = [
      'Rank',
      'Name',
      'Phone',
      'Score',
      'Total Questions',
      'Percentage',
      'Correct',
      'Wrong',
      'Unanswered',
      'Violations',
      'Time Taken',
      'Integrity Status',
      'Validation Status',
    ];

    const rows = ranked.map((item) => [
      item.is_valid ? `#${item.rank}` : 'Disqualified',
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.phone}"`,
      item.is_valid ? item.score : `"${item.score} (Invalid)"`,
      item.total_questions,
      `${item.percentage}%`,
      item.correct_count,
      item.incorrect_count,
      item.unanswered_count,
      item.violation_count,
      `"${item.time_taken_formatted}"`,
      `"${item.integrity_status}"`,
      item.is_valid ? 'Valid' : 'Disqualified (Flagged)',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `bugbusters_round1_results_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div ref={containerRef} className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-neutral-900" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Symposium Results & Leaderboard
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Official rankings for Round 1 elimination based on verified scores, time elapsed, and telemetry integrity.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={exportCSV}
          className="gap-2 shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </Button>
      </div>

      {/* Top 3 Podium Cards */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {top3.map((winner, idx) => {
            const ranks = ['1st Place • Winner', '2nd Place • Runner Up', '3rd Place • Finalist'];
            const icons = [Trophy, Medal, Award];
            const Icon = icons[idx] || Award;
            const isFirst = idx === 0;
            const isSecond = idx === 1;

            return (
              <Card
                key={winner.participant_id}
                onClick={() => handleOpenReview(winner.participant)}
                className={cn(
                  'podium-card p-5 flex flex-col justify-between relative overflow-hidden cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all duration-200',
                  isFirst && 'bg-neutral-900 text-white border-neutral-800 shadow-xl',
                  isSecond && 'bg-gradient-to-br from-slate-100 via-zinc-200 to-slate-300 text-black border border-slate-300 shadow-md ring-1 ring-slate-400/30',
                  !isFirst && !isSecond && 'bg-neutral-50 text-black border-neutral-200/90 shadow-sm'
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md',
                        isFirst && 'bg-neutral-800 text-white border border-neutral-700',
                        isSecond && 'bg-slate-300 text-black border border-slate-400/60 shadow-2xs font-extrabold',
                        !isFirst && !isSecond && 'bg-neutral-200 text-black border border-neutral-300 font-extrabold'
                      )}
                    >
                      {ranks[idx]}
                    </span>
                    <Icon
                      className={cn(
                        'w-4 h-4',
                        isFirst && 'text-amber-400',
                        isSecond && 'text-black',
                        !isFirst && !isSecond && 'text-black'
                      )}
                    />
                  </div>

                  <h3
                    className={cn(
                      'text-lg font-bold mt-4 truncate',
                      isFirst ? 'text-white' : 'text-black'
                    )}
                  >
                    {winner.name}
                  </h3>
                  <span
                    className={cn(
                      'text-xs font-mono-tabular',
                      isFirst ? 'text-neutral-300' : 'text-black font-medium'
                    )}
                  >
                    Phone: {winner.phone}
                  </span>
                </div>

                <div
                  className={cn(
                    'mt-6 pt-4 border-t flex items-baseline justify-between',
                    isFirst ? 'border-neutral-800' : isSecond ? 'border-slate-300/90' : 'border-neutral-200'
                  )}
                >
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isFirst ? 'text-neutral-300' : 'text-black font-semibold'
                    )}
                  >
                    Verified Score (+1 / 0)
                  </span>
                  <span
                    className={cn(
                      'text-2xl font-bold font-mono-tabular',
                      isFirst ? 'text-white' : 'text-black'
                    )}
                  >
                    {winner.score} / {winner.total_questions}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Leaderboard Table Card */}
      <Card className="p-0 overflow-hidden">
        {/* Controls: Search & Sort Selector */}
        <div className="p-4 border-b border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-50/50">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div className="flex items-center gap-2 text-xs overflow-x-auto max-w-full pb-1 sm:pb-0">
            <span className="text-neutral-400 text-[11px] uppercase font-semibold shrink-0">
              Sort by:
            </span>
            {(['score', 'time', 'violations', 'status'] as const).map((field) => (
              <button
                key={field}
                onClick={() => handleSortToggle(field)}
                className={cn(
                  'px-2.5 py-1 rounded-lg capitalize font-medium inline-flex items-center gap-1 transition-colors shrink-0',
                  sortField === field
                    ? 'bg-neutral-900 text-white font-semibold'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                )}
              >
                <span>{field === 'time' ? 'Time Taken' : field}</span>
                {sortField === field && (
                  <span className="text-[10px] font-mono-tabular">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/70 text-neutral-400 font-medium text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center">Rank</th>
                <th className="py-3.5 px-4">Participant</th>
                <th className="py-3.5 px-4">Phone</th>
                <th
                  onClick={() => handleSortToggle('score')}
                  className="py-3.5 px-4 text-center cursor-pointer hover:text-neutral-900 transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    Score
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="py-3.5 px-4 text-center">%</th>
                <th className="py-3.5 px-4 text-center text-emerald-700">Correct</th>
                <th className="py-3.5 px-4 text-center text-rose-700">Wrong</th>
                <th className="py-3.5 px-4 text-center text-neutral-500">Unanswered</th>
                <th
                  onClick={() => handleSortToggle('violations')}
                  className="py-3.5 px-4 text-center cursor-pointer hover:text-neutral-900 transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    Violations
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSortToggle('time')}
                  className="py-3.5 px-4 text-center cursor-pointer hover:text-neutral-900 transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    Time Taken
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSortToggle('status')}
                  className="py-3.5 px-4 text-center cursor-pointer hover:text-neutral-900 transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    Status
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="py-3.5 px-4 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {ranked.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-xs text-neutral-400">
                    No completed submissions match current criteria.
                  </td>
                </tr>
              ) : (
                ranked.map((item, idx) => {
                  return (
                    <tr
                      key={item.participant_id}
                      onClick={() => handleOpenReview(item.participant)}
                      className="hover:bg-neutral-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4 text-center font-bold font-mono-tabular">
                        {item.is_valid && item.rank ? (
                          <span className="text-neutral-900">#{item.rank}</span>
                        ) : (
                          <span className="inline-block text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md text-[11px] font-bold border border-rose-200">
                            DQ
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-neutral-900 group-hover:text-neutral-950 block">
                          {item.name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular text-neutral-600 text-xs">
                        {item.phone}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono-tabular">
                        {item.is_valid ? (
                          <span className="font-bold text-neutral-900">{item.score} / {item.total_questions}</span>
                        ) : (
                          <div>
                            <span className="line-through text-neutral-400 font-medium">{item.score} / {item.total_questions}</span>
                            <span className="block text-[10px] text-rose-600 font-bold uppercase tracking-wider">Invalid</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono-tabular text-neutral-700">
                        {item.percentage}%
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono-tabular text-emerald-700 font-semibold">
                        {item.correct_count}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono-tabular text-rose-700">
                        {item.incorrect_count}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono-tabular text-neutral-400">
                        {item.unanswered_count}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono-tabular">
                        {item.violation_count > 0 ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {item.violation_count}
                          </span>
                        ) : (
                          <span className="text-neutral-400">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono-tabular text-neutral-700 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          {item.time_taken_formatted}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {!item.is_valid ? (
                          <Badge variant="danger" size="sm" dot>
                            Disqualified
                          </Badge>
                        ) : item.integrity_status === 'Verified Clean' ? (
                          <Badge variant="success" size="sm" dot>
                            Verified Clean
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm" dot>
                            Minor Warning
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            handleOpenReview(item.participant);
                          }}
                          className="gap-1 text-xs text-neutral-600 hover:text-neutral-900 py-1 px-2 h-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Participant Drawer with Answer Review */}
      <ParticipantDrawer
        participant={selectedParticipant}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialTab="review"
      />
    </div>
  );
}
