'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Participant, ParticipantResult } from '@/types/participant';
import { participantService } from '@/lib/api/participantService';
import { ParticipantDrawer } from '@/components/admin/ParticipantDrawer';
import { exportScoresToExcel, buildExportItemsFromData } from '@/lib/utils/exportXlsx';
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
  Eye,
  Clock,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { calculateAuthoritativeDuration, formatTimeClock } from '@/lib/utils/time';

interface EnrichedResultItem {
  participant_id: number;
  participant: Participant;
  name: string;
  phone: string;
  start_time: string | null;
  end_time: string | null;
  duration_seconds: number;
  duration_formatted: string;
  mcq_score: number;
  mcq_total: number;
  hands_on_solved: number;
  hands_on_total: number;
  hands_on_marks: number;
  total_marks: number;
  total_max_marks: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  violation_count: number;
  integrity_status: 'Verified Clean' | 'Minor Warning' | 'Audit Flagged';
  is_valid: boolean;
  rank: number | null;
  result: ParticipantResult | null;
}

type SortField = 'score' | 'mcq' | 'hands_on' | 'time';
type SortOrder = 'asc' | 'desc';

function formatTime(isoString: string | null | undefined): string {
  return formatTimeClock(isoString);
}

export default function AdminResultsPage() {
  const [participants, setParticipants] = useState<Participant[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('bugbusters_participants');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });
  const [results, setResults] = useState<ParticipantResult[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('bugbusters_results');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [pList, rList] = await Promise.all([
        participantService.getAllParticipants(),
        participantService.getResults(),
      ]);
      if (Array.isArray(pList) && pList.length > 0) setParticipants(pList);
      if (Array.isArray(rList) && rList.length > 0) setResults(rList);
    } catch (err) {
      console.warn('Failed to sync leaderboard data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    animatePageEntrance(containerRef.current);
    loadData();

    // Automatically synchronize when new submissions happen in real time
    const unsub = participantService.subscribeToParticipants((updated) => {
      if (Array.isArray(updated) && updated.length > 0) {
        setParticipants(updated);
      }
    });

    return () => {
      unsub();
    };
  }, [loadData]);

  const handleOpenReview = (p: Participant) => {
    setSelectedParticipant(p);
    setIsDrawerOpen(true);
  };

  const handleFlagToggle = async (id: number, currentStatus: string) => {
    if (currentStatus === 'flagged') {
      const target = participants.find((p) => p.participant_id === id);
      const isCompleted = target?.status === 'completed' || Boolean(target?.end_time);
      const updated = await participantService.updateParticipant(id, {
        status: isCompleted ? 'completed' : 'active',
        violation_count: 0,
        last_activity_description: 'Flag cleared by admin',
      });
      setSelectedParticipant(updated);
      setParticipants((prev) => prev.map((p) => (p.participant_id === id ? updated : p)));
    } else {
      const updated = await participantService.updateParticipant(id, {
        status: 'flagged',
        last_activity_description: 'Manually flagged by admin',
      });
      setSelectedParticipant(updated);
      setParticipants((prev) => prev.map((p) => (p.participant_id === id ? updated : p)));
    }
  };

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'time' ? 'asc' : 'desc');
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
        const totalQ = res?.total_questions || p.total_questions || 40;
        const mcqScore = res?.score ?? (p.score || 0);
        const correct = res?.correct_count ?? mcqScore;
        const incorrect = res?.incorrect_count ?? Math.max(0, totalQ - correct);
        const unanswered = res?.unanswered_count ?? 0;

        const violations = p.violation_count || 0;
        const isFlagged = p.status === 'flagged' || violations >= 2;
        const isValid = !isFlagged;
        const integrity: 'Verified Clean' | 'Minor Warning' | 'Audit Flagged' =
          violations === 0 ? 'Verified Clean' : violations >= 2 ? 'Audit Flagged' : 'Minor Warning';
        const handsOnSolved =
          res?.hands_on_score ??
          p.hands_on_score ??
          (p.hands_on_submissions ? Object.values(p.hands_on_submissions).filter((s) => s.is_solved).length : 0);
        const handsOnTotal = res?.hands_on_total ?? p.hands_on_total ?? 10;

        // 1 mark per MCQ/Debug question (40 max), 5 marks per hands-on debug question (50 max)
        const mcqMarks = mcqScore * 1;
        const handsOnMarks = handsOnSolved * 5;
        const totalMarks = mcqMarks + handsOnMarks;
        const totalMaxMarks = (totalQ * 1) + (handsOnTotal * 5); // 40 + 50 = 90 max

        const authDuration = calculateAuthoritativeDuration(p.start_time, p.end_time);

        return {
          participant_id: p.participant_id,
          participant: p,
          name: p.name,
          phone: p.phone,
          start_time: p.start_time,
          end_time: p.end_time,
          duration_seconds: authDuration.seconds,
          duration_formatted: authDuration.formatted,
          mcq_score: mcqMarks,
          mcq_total: totalQ,
          hands_on_solved: handsOnSolved,
          hands_on_total: handsOnTotal,
          hands_on_marks: handsOnMarks,
          total_marks: totalMarks,
          total_max_marks: totalMaxMarks,
          correct_count: correct,
          incorrect_count: incorrect,
          unanswered_count: unanswered,
          violation_count: violations,
          integrity_status: integrity,
          is_valid: isValid,
          rank: null,
          result: res,
        };
      });
  }, [participants, results]);

  // Filter and sort
  const ranked = useMemo(() => {
    const validSorted = [...enrichedList]
      .filter((item) => item.is_valid)
      .sort((a, b) => {
        const scoreDiff = b.total_marks - a.total_marks;
        if (scoreDiff !== 0) return scoreDiff;
        const timeDiff = a.duration_seconds - b.duration_seconds;
        if (timeDiff !== 0) return timeDiff;
        return a.violation_count - b.violation_count;
      });

    const rankMap = new Map<number, number>();
    validSorted.forEach((item, index) => {
      rankMap.set(item.participant_id, index + 1);
    });

    const withRanks = enrichedList.map((item) => ({
      ...item,
      rank: item.is_valid ? rankMap.get(item.participant_id) || null : null,
    }));

    const filtered = withRanks.filter((item) => {
      const q = search.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.phone.toLowerCase().includes(q);
    });

    return filtered.sort((a, b) => {
      if (sortField === 'score') {
        const diff = b.total_marks - a.total_marks;
        return sortOrder === 'desc' ? diff : -diff;
      }
      if (sortField === 'mcq') {
        const diff = b.mcq_score - a.mcq_score;
        return sortOrder === 'desc' ? diff : -diff;
      }
      if (sortField === 'hands_on') {
        const diff = b.hands_on_marks - a.hands_on_marks;
        return sortOrder === 'desc' ? diff : -diff;
      }
      if (sortField === 'time') {
        const diff = a.duration_seconds - b.duration_seconds;
        return sortOrder === 'asc' ? diff : -diff;
      }
      return 0;
    });
  }, [enrichedList, search, sortField, sortOrder]);

  const top3 = useMemo(() => {
    return [...enrichedList]
      .filter((item) => item.is_valid)
      .sort((a, b) => {
        const scoreDiff = b.total_marks - a.total_marks;
        if (scoreDiff !== 0) return scoreDiff;
        return a.violation_count - b.violation_count;
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
      'Participant',
      'Phone',
      'MCQ (40)',
      'Hands-on Debug (50)',
      'Total (90)',
      'Time Taken',
      'Start Time',
      'End Time',
    ];

    const rows = ranked.map((item) => [
      item.is_valid ? `#${item.rank}` : 'Disqualified',
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.phone}"`,
      `"${item.mcq_score} / 40"`,
      `"${item.hands_on_marks} / 50"`,
      item.is_valid ? `"${item.total_marks} / 90"` : `"${item.total_marks} / 90 (Invalid)"`,
      `"${item.duration_formatted}"`,
      `"${formatTime(item.start_time)}"`,
      `"${item.end_time ? formatTime(item.end_time) : 'In Progress'}"`,
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

  const exportExcel = () => {
    const items = buildExportItemsFromData(participants, results);
    exportScoresToExcel(items, `BugBusters_Scores_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div ref={containerRef} className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#9db40c]" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Symposium Results & Leaderboard
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Official rankings for Round 1 elimination based on verified scores, time elapsed, and telemetry integrity.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="gap-2 shadow-xs bg-[#0d1224] text-slate-200 border-[#283f5f] hover:bg-[#283f5f]/30 cursor-pointer"
            title="Refresh latest scores from server"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-[#9db40c]", isRefreshing && "animate-spin")} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportExcel}
            className="gap-2 shadow-xs bg-[#0d1224] text-slate-200 border-[#283f5f] hover:bg-[#283f5f]/30"
            title="Download formatted Excel workbook (.xlsx)"
          >
            <Download className="w-3.5 h-3.5 text-[#9db40c]" />
            <span>Export Excel (.xlsx)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="gap-2 shadow-xs bg-[#0d1224] text-slate-200 border-[#283f5f] hover:bg-[#283f5f]/30"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
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
                  isFirst && 'bg-[#0d1224] text-white border-2 border-[#9db40c] shadow-xl ring-2 ring-[#9db40c]/20',
                  isSecond && 'bg-[#0d1224] text-white border border-[#283f5f] shadow-md ring-1 ring-[#031c6c]/40',
                  !isFirst && !isSecond && 'bg-[#070916] text-white border border-[#283f5f]/70 shadow-sm'
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md',
                        isFirst && 'bg-[#506022]/40 text-[#9db40c] border border-[#9db40c]/50',
                        isSecond && 'bg-[#031c6c] text-slate-200 border border-[#283f5f]',
                        !isFirst && !isSecond && 'bg-[#070916] text-slate-300 border border-[#283f5f]'
                      )}
                    >
                      {ranks[idx]}
                    </span>
                    <Icon
                      className={cn(
                        'w-4 h-4',
                        isFirst && 'text-[#9db40c]',
                        isSecond && 'text-slate-300',
                        !isFirst && !isSecond && 'text-amber-400'
                      )}
                    />
                  </div>

                  <h3 className="text-lg font-bold mt-4 truncate text-white">
                    {winner.name}
                  </h3>
                  <span className="text-xs font-mono-tabular text-slate-400 font-medium">
                    Phone: {winner.phone}
                  </span>
                  <div className="mt-1 flex items-center gap-2 text-[11px] font-mono-tabular text-slate-400">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>Time: {winner.duration_formatted}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#283f5f]/60 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-400 block">
                      MCQ: {winner.mcq_score} / 40
                    </span>
                    <span className="text-xs font-bold text-blue-400 block mt-0.5">
                      Hands-on Debug: {winner.hands_on_marks} / 50
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-2xl font-bold font-mono-tabular',
                      isFirst ? 'text-[#9db40c]' : 'text-white'
                    )}
                  >
                    {winner.total_marks} / 90
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
        <div className="p-4 border-b border-[#283f5f]/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#070916]">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#0d1224] border border-[#283f5f] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#9db40c]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs overflow-x-auto max-w-full pb-1 sm:pb-0">
            <span className="text-slate-400 text-[11px] uppercase font-semibold shrink-0">
              Sort by:
            </span>
            {(['score', 'mcq', 'hands_on', 'time'] as const).map((field) => (
              <button
                key={field}
                onClick={() => handleSortToggle(field)}
                className={cn(
                  'px-2.5 py-1 rounded-lg capitalize font-medium inline-flex items-center gap-1 transition-colors shrink-0',
                  sortField === field
                    ? 'bg-[#031c6c] text-[#9db40c] border border-[#283f5f] font-semibold'
                    : 'bg-[#0d1224] border border-[#283f5f]/60 text-slate-400 hover:text-white'
                )}
              >
                <span>
                  {field === 'score'
                    ? 'Total'
                    : field === 'mcq'
                    ? 'MCQ'
                    : field === 'hands_on'
                    ? 'Hands-on Debug'
                    : 'Time'}
                </span>
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
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[#283f5f] bg-[#070916] text-slate-400 font-medium text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center w-16">Rank</th>
                <th className="py-3.5 px-4">Participant</th>
                <th
                  onClick={() => handleSortToggle('mcq')}
                  className="py-3.5 px-4 text-center cursor-pointer hover:text-white transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    MCQ
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSortToggle('hands_on')}
                  className="py-3.5 px-4 text-center cursor-pointer hover:text-white transition-colors text-blue-400 font-bold"
                >
                  <span className="inline-flex items-center gap-1">
                    Hands-on Debug
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSortToggle('score')}
                  className="py-3.5 px-4 text-center cursor-pointer hover:text-white transition-colors"
                >
                  <span className="inline-flex items-center gap-1 font-bold text-[#9db40c]">
                    Total
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSortToggle('time')}
                  className="py-3.5 px-4 text-center cursor-pointer hover:text-white transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    Time
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#283f5f]/40">
              {isLoading && ranked.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-[#9db40c] border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-slate-400 font-medium">Loading symposium leaderboard...</span>
                    </div>
                  </td>
                </tr>
              ) : ranked.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    No completed submissions match current criteria.
                  </td>
                </tr>
              ) : (
                ranked.map((item) => {
                  return (
                    <tr
                      key={item.participant_id}
                      onClick={() => handleOpenReview(item.participant)}
                      className="hover:bg-[#283f5f]/15 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4 text-center font-bold font-mono-tabular">
                        {item.is_valid && item.rank ? (
                          <span className="text-white">#{item.rank}</span>
                        ) : (
                          <span className="inline-block text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md text-[11px] font-bold border border-rose-500/30">
                            DQ
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-white group-hover:text-[#9db40c] block transition-colors">
                          {item.name}
                        </span>
                        <span className="text-xs font-mono-tabular text-slate-400 block mt-0.5">
                          {item.phone}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono-tabular text-slate-200">
                        {item.mcq_score} / 40
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono-tabular">
                        <span className="font-bold text-blue-300 bg-[#031c6c]/40 px-2.5 py-1 rounded-md border border-[#283f5f] text-xs">
                          {item.hands_on_marks} / 50
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono-tabular">
                        {item.is_valid ? (
                          <span className="font-bold text-[#9db40c] bg-[#506022]/20 border border-[#9db40c]/40 px-2.5 py-1 rounded-md text-xs">
                            {item.total_marks} / 90
                          </span>
                        ) : (
                          <div>
                            <span className="line-through text-slate-500 font-medium text-xs">{item.total_marks} / 90</span>
                            <span className="block text-[10px] text-rose-400 font-bold uppercase tracking-wider">Invalid</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono-tabular text-xs whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md bg-[#031c6c]/30 border border-[#283f5f] text-slate-200 text-xs">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {item.duration_formatted}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Audit Drawer */}
      <ParticipantDrawer
        participant={selectedParticipant}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onFlagToggle={handleFlagToggle}
        initialTab="review"
      />
    </div>
  );
}
