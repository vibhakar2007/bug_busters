'use client';

import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { Participant, ParticipantResult } from '@/types/participant';
import { ParticipantActivity } from '@/types/activity';
import { activityService } from '@/lib/api/activityService';
import { participantService } from '@/lib/api/participantService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatTimestamp } from '@/lib/utils/cn';
import {
  X,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  EyeOff,
  Minimize2,
  Copy,
  Send,
  Flag,
  ListChecks,
  History,
  XCircle,
  HelpCircle,
  Code2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import handsOnQuestionsData from '../../../data/hands_on_debug.json';
import { HandsOnDebugQuestion } from '@/types/handsOnDebug';

interface ParticipantDrawerProps {
  participant: Participant | null;
  isOpen: boolean;
  onClose: () => void;
  onFlagToggle?: (participantId: number, currentStatus: string) => void;
  initialTab?: 'violations' | 'activity' | 'review' | 'hands_on';
}

function formatTimeString(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '—';
  }
}

function calculateDurationText(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): string {
  if (!startTime) return '—';
  try {
    const start = new Date(startTime).getTime();
    if (isNaN(start)) return '—';

    let end = endTime ? new Date(endTime).getTime() : Date.now();
    if (isNaN(end) || end < start) end = Date.now();

    const diffSec = Math.max(0, Math.floor((end - start) / 1000));
    const hours = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;

    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  } catch {
    return '—';
  }
}

export const ParticipantDrawer: React.FC<ParticipantDrawerProps> = ({
  participant,
  isOpen,
  onClose,
  onFlagToggle,
  initialTab = 'violations',
}) => {
  const [localParticipant, setLocalParticipant] = useState<Participant | null>(participant);

  useEffect(() => {
    setLocalParticipant(participant);
  }, [participant]);

  const [userTab, setUserTab] = useState<'violations' | 'activity' | 'review' | 'hands_on' | null>(null);
  const [prevParticipantId, setPrevParticipantId] = useState<number | null>(null);
  const [expandedCodeId, setExpandedCodeId] = useState<number | null>(null);

  if (participant && participant.participant_id !== prevParticipantId) {
    setPrevParticipantId(participant.participant_id);
    setUserTab(null);
  }

  const activeTab = userTab ?? initialTab;

  const [activities, setActivities] = useState<ParticipantActivity[]>([]);
  const [result, setResult] = useState<ParticipantResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');

  useEffect(() => {
    let isMounted = true;
    if (participant && isOpen) {
      Promise.resolve().then(() => {
        if (isMounted) setLoading(true);
      });

      const fetchParticipantActivities = async () => {
        try {
          const res = await fetch(`/api/activity?participant_id=${participant.participant_id}&ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true`, {
            headers: {
              'Accept': 'application/json',
              'ngrok-skip-browser-warning': 'true',
              'bypass-tunnel-reminder': 'true',
            },
          });
          if (res.ok) {
            const data: ParticipantActivity[] = await res.json();
            if (Array.isArray(data)) return data;
          }
        } catch (e) {
          console.warn('Direct fetch of participant activity failed:', e);
        }
        return activityService.getParticipantActivity(participant.participant_id);
      };

      Promise.all([
        fetchParticipantActivities(),
        participantService.getParticipantResult(participant.participant_id),
      ]).then(([acts, res]) => {
        if (isMounted) {
          setActivities(acts);
          setResult(res);
          setLoading(false);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [participant, isOpen]);

  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && panelRef.current && backdropRef.current) {
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.25, ease: 'power2.out' }
      );
      gsap.fromTo(
        panelRef.current,
        { x: 60, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.35, ease: 'power3.out' }
      );
    }
  }, [isOpen, participant?.participant_id]);

  const currentP = localParticipant || participant;
  if (!isOpen || !currentP) return null;

  const isEffectivelyFlagged = Boolean(
    currentP.status === 'flagged' || (currentP.violation_count || 0) >= 2
  );

  const handleFlagAction = async () => {
    if (!currentP) return;
    const isCompleted = currentP.status === 'completed' || Boolean(currentP.end_time);

    try {
      if (isEffectivelyFlagged) {
        // 1. Update participant state locally and on server
        const updated = await participantService.updateParticipant(currentP.participant_id, {
          status: isCompleted ? 'completed' : 'active',
          violation_count: 0,
          last_activity_description: 'Flag cleared by admin',
        });
        setLocalParticipant(updated);

        // 2. Log activity
        await activityService
          .recordActivity({
            participant_id: currentP.participant_id,
            participant_name: currentP.name,
            registration_number: currentP.phone,
            event_type: 'flag_cleared',
            details: 'Admin cleared violations and reinstated participant',
          })
          .catch(() => {});

        // 3. Notify parent callback
        await onFlagToggle?.(currentP.participant_id, 'flagged');
      } else {
        const updated = await participantService.updateParticipant(currentP.participant_id, {
          status: 'flagged',
          last_activity_description: 'Manually flagged by admin',
        });
        setLocalParticipant(updated);

        await activityService
          .recordActivity({
            participant_id: currentP.participant_id,
            participant_name: currentP.name,
            registration_number: currentP.phone,
            event_type: 'flag_added',
            details: 'Manually flagged by administrator',
          })
          .catch(() => {});

        await onFlagToggle?.(currentP.participant_id, 'active');
      }
    } catch (err) {
      console.error('Failed to toggle participant flag:', err);
    }
  };

  const getActivityIcon = (type: string) => {
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
      case 'quiz_submitted':
        return <Send className="w-3.5 h-3.5 text-emerald-600" />;
      case 'answer_selected':
        return <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  const formatViolationTitle = (type: string) => {
    switch (type) {
      case 'tab_switch':
        return 'Tab Switch / Window Inactive';
      case 'fullscreen_exit':
        return 'Fullscreen Mode Exited';
      case 'focus_loss':
        return 'Browser Focus Lost';
      case 'copy_attempt':
        return 'Copy Attempt Detected';
      case 'paste_attempt':
        return 'Paste Attempt Detected';
      case 'dev_tools':
        return 'Developer Tools / Inspect Opened';
      case 'context_menu':
        return 'Right-Click Context Menu';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  const violationEvents = activities.filter((act) => {
    return (
      act.severity === 'violation' ||
      act.severity === 'warning' ||
      [
        'tab_switch',
        'fullscreen_exit',
        'focus_loss',
        'copy_attempt',
        'paste_attempt',
        'dev_tools',
        'context_menu',
      ].includes(act.event_type)
    );
  });

  const filteredReviewItems = (result?.review_items || []).filter((item) => {
    if (reviewFilter === 'correct') return item.is_correct;
    if (reviewFilter === 'incorrect') return !item.is_correct && !item.is_unanswered;
    if (reviewFilter === 'unanswered') return item.is_unanswered;
    return true;
  });

  const mcqMarks = currentP.score ?? result?.score ?? 0;
  const handsOnSolved =
    currentP.hands_on_score ??
    result?.hands_on_score ??
    (currentP.hands_on_submissions
      ? Object.values(currentP.hands_on_submissions).filter((s) => s.is_solved).length
      : 0);
  const handsOnMarks = handsOnSolved * 5;
  const totalScoreMarks = mcqMarks + handsOnMarks;
  const hasScore =
    currentP.score !== null ||
    currentP.hands_on_score !== undefined ||
    currentP.status === 'completed' ||
    result !== null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={onClose}
        className="absolute inset-0 bg-neutral-900/30 backdrop-blur-xs transition-opacity"
      />

      {/* Slide-over Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div
          ref={panelRef}
          className="w-screen max-w-2xl bg-[#0d1224] border-l border-[#283f5f] shadow-2xl flex flex-col justify-between text-white"
        >
          {/* Header */}
          <div className="p-6 border-b border-[#283f5f]/50 bg-[#070916]">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Participant Audit & Review
                  </span>
                  <Badge
                    variant={
                      isEffectivelyFlagged
                        ? 'danger'
                        : currentP.status === 'completed'
                        ? 'neutral'
                        : 'success'
                    }
                    dot
                  >
                    {isEffectivelyFlagged ? 'FLAGGED' : currentP.status.toUpperCase()}
                  </Badge>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {currentP.name}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono-tabular mt-1">
                  <Shield className="w-3.5 h-3.5 text-[#9db40c]" />
                  <span>Phone: {currentP.phone}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-[#283f5f]/40 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mt-5">
              <div className="p-3 bg-[#070916] border border-[#283f5f]/60 rounded-xl shadow-xs">
                <span className="text-[11px] text-slate-400 font-semibold block">MCQ Progress</span>
                <span className="text-base font-bold text-white font-mono-tabular">
                  {currentP.current_question || 0}/{currentP.total_questions || 40}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-mono-tabular">
                  MCQ: {mcqMarks} / 40
                </span>
              </div>

              <div className="p-3 bg-[#070916] border border-[#283f5f]/60 rounded-xl shadow-xs">
                <span className="text-[11px] text-slate-400 font-semibold block">Total Score (90)</span>
                <span className="text-base font-black text-[#9db40c] font-mono-tabular">
                  {hasScore ? `${totalScoreMarks} / 90` : 'In Progress'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-mono-tabular">
                  MCQ: {mcqMarks} • Debug: {handsOnMarks}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setUserTab('hands_on')}
                className="p-3 bg-[#070916] border border-[#283f5f]/60 hover:border-blue-500/50 rounded-xl shadow-xs text-center transition-all cursor-pointer group"
                title="Click to view Hands-On code and test cases"
              >
                <span className="text-[11px] text-blue-400 font-semibold block group-hover:text-blue-300">Hands-On Debug (50)</span>
                <span className="text-base font-black text-blue-400 font-mono-tabular">
                  {handsOnMarks} / 50
                </span>
                <span className="text-[10px] text-blue-300/80 block mt-0.5 font-mono-tabular">
                  {handsOnSolved} / {currentP.hands_on_total || 10} Solved
                </span>
              </button>

              <button
                type="button"
                onClick={() => setUserTab('violations')}
                className={cn(
                  'p-3 border rounded-xl shadow-xs text-center transition-all cursor-pointer',
                  (currentP.violation_count > 0 || violationEvents.length > 0)
                    ? 'bg-rose-950/60 border-rose-800 text-rose-300 hover:bg-rose-900/60'
                    : 'bg-[#070916] border-[#283f5f]/60 text-white hover:bg-[#283f5f]/25'
                )}
                title="Click to view full violations audit"
              >
                <span className="text-[11px] font-semibold block opacity-80">Violations (View)</span>
                <span className="text-base font-bold font-mono-tabular flex items-center justify-center gap-1">
                  {(currentP.violation_count > 0 || violationEvents.length > 0) && (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  {violationEvents.length || currentP.violation_count}
                </span>
              </button>
            </div>

            {/* Timing Telemetry Strip */}
            <div className="grid grid-cols-3 gap-2 text-center mt-3 pt-3 border-t border-[#283f5f]/40 font-mono-tabular">
              <div className="p-2 bg-[#070916]/80 border border-[#283f5f]/40 rounded-lg">
                <span className="text-[10px] text-slate-400 font-semibold block">Start Time</span>
                <span className="text-xs text-slate-200 font-semibold">
                  {formatTimeString(currentP.start_time)}
                </span>
              </div>
              <div className="p-2 bg-[#070916]/80 border border-[#283f5f]/40 rounded-lg">
                <span className="text-[10px] text-slate-400 font-semibold block">End Time</span>
                <span className="text-xs text-slate-200 font-semibold">
                  {currentP.end_time ? formatTimeString(currentP.end_time) : <span className="text-amber-400">In Progress</span>}
                </span>
              </div>
              <div className="p-2 bg-[#070916]/80 border border-[#283f5f]/40 rounded-lg">
                <span className="text-[10px] text-slate-400 font-semibold block">Time Taken</span>
                <span className="text-xs text-[#9db40c] font-bold">
                  {calculateDurationText(currentP.start_time, currentP.end_time)}
                </span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1.5 mt-5 p-1 bg-[#070916] border border-[#283f5f]/60 rounded-xl text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setUserTab('violations')}
                className={cn(
                  'flex-1 py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0',
                  activeTab === 'violations'
                    ? 'bg-[#031c6c] text-[#9db40c] border border-[#283f5f] shadow-xs font-bold'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <AlertTriangle
                  className={cn(
                    'w-3.5 h-3.5',
                    (currentP.violation_count > 0 || violationEvents.length > 0)
                      ? 'text-rose-400'
                      : 'text-slate-500'
                  )}
                />
                <span>Violations</span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-md font-mono-tabular font-bold',
                    (currentP.violation_count > 0 || violationEvents.length > 0)
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-[#283f5f]/40 text-slate-300'
                  )}
                >
                  {violationEvents.length || currentP.violation_count}
                </span>
              </button>

              <button
                onClick={() => setUserTab('activity')}
                className={cn(
                  'flex-1 py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0',
                  activeTab === 'activity'
                    ? 'bg-[#031c6c] text-[#9db40c] border border-[#283f5f] shadow-xs font-bold'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <History className="w-3.5 h-3.5" />
                <span>All Events</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-[#070916] text-[#9db40c] border border-[#283f5f] rounded-md font-mono-tabular">
                  {activities.length}
                </span>
              </button>

              <button
                onClick={() => setUserTab('review')}
                className={cn(
                  'flex-1 py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0',
                  activeTab === 'review'
                    ? 'bg-[#031c6c] text-[#9db40c] border border-[#283f5f] shadow-xs font-bold'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span>MCQ Review</span>
                {result && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-[#070916] text-[#9db40c] border border-[#283f5f] rounded-md font-mono-tabular">
                    {result.score}/{result.total_questions}
                  </span>
                )}
              </button>

              <button
                onClick={() => setUserTab('hands_on')}
                className={cn(
                  'flex-1 py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0',
                  activeTab === 'hands_on'
                    ? 'bg-[#031c6c] text-blue-300 border border-[#283f5f] shadow-xs font-bold'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <Code2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Hands-On</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-[#0d1224] text-blue-300 border border-[#283f5f] rounded-md font-mono-tabular font-bold">
                  {currentP.hands_on_score ?? result?.hands_on_score ?? 0}/{currentP.hands_on_total ?? result?.hands_on_total ?? 10}
                </span>
              </button>
            </div>
          </div>

          {/* Body content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* TAB: VIOLATIONS AUDIT */}
            {activeTab === 'violations' && (
              <div className="space-y-4">
                {/* Status Alert Banner */}
                {isEffectivelyFlagged ? (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3">
                    <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-rose-300">
                          Disqualified • Participant Flagged
                        </h4>
                        <span className="text-[10px] uppercase font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-mono-tabular">
                          Flag Active ({currentP.violation_count} Violations)
                        </span>
                      </div>
                      <p className="text-xs text-rose-200 mt-1 leading-relaxed">
                        This participant exceeded test violation limits ({currentP.violation_count} violations) or was manually flagged. Their result is excluded from the leaderboard. Click &ldquo;Clear Flag &amp; Reinstate&rdquo; below to clear all infractions and restore their result.
                      </p>
                    </div>
                  </div>
                ) : (currentP.violation_count > 0 || violationEvents.length > 0) ? (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-amber-300">
                          Integrity Warnings ({currentP.violation_count} recorded)
                        </h4>
                        <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono-tabular">
                          Warning State
                        </span>
                      </div>
                      <p className="text-xs text-amber-200 mt-1 leading-relaxed">
                        The participant triggered browser focus loss or window blur. Accumulating 3 violations triggers automatic disqualification.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[#506022]/20 border border-[#9db40c]/40 rounded-2xl flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#9db40c] shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-[#9db40c]">
                        Clean Test Integrity
                      </h4>
                      <p className="text-xs text-slate-300">
                        Zero tab switches, clipboard copies/pastes, or focus interruptions recorded.
                      </p>
                    </div>
                  </div>
                )}

                {/* Violation Items List */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Recorded Violations & Infractions ({violationEvents.length || currentP.violation_count})
                    </h3>
                    {(violationEvents.length > 0 || currentP.violation_count > 0) && (
                      <span className="text-[11px] text-rose-400 font-bold font-mono-tabular">
                        {violationEvents.filter((v) => v.severity === 'violation').length || currentP.violation_count} critical •{' '}
                        {violationEvents.filter((v) => v.severity !== 'violation').length} warnings
                      </span>
                    )}
                  </div>

                  {loading ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Loading violation events...
                    </div>
                  ) : violationEvents.length === 0 ? (
                    currentP.violation_count > 0 ? (
                      <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                          <AlertOctagon className="w-4 h-4 text-rose-400" />
                          <span>{currentP.violation_count} Anti-Cheating Violation(s) Logged</span>
                        </div>
                        <p className="text-xs text-rose-200 leading-relaxed">
                          {currentP.last_activity_description || 'Window inactive / Tab switch detected during test session.'}
                        </p>
                        <p className="text-[11px] text-rose-400 font-mono-tabular">
                          Last detected: {formatTimestamp(currentP.last_activity_time || new Date().toISOString())}
                        </p>
                      </div>
                    ) : (
                      <div className="py-10 text-center space-y-2 bg-[#070916] rounded-2xl border border-[#283f5f]/60 p-6">
                        <CheckCircle2 className="w-8 h-8 text-[#9db40c] mx-auto" />
                        <p className="text-xs font-bold text-white">No violations logged</p>
                        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                          This participant has not triggered any anti-cheating detections during the quiz.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="space-y-2.5">
                      {violationEvents.map((v, i) => (
                        <div
                          key={v.activity_id || i}
                          className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                              {getActivityIcon(v.event_type)}
                              <span>{formatViolationTitle(v.event_type)}</span>
                            </span>
                            <span className="text-[11px] font-mono-tabular text-slate-400 shrink-0">
                              {formatTimestamp(v.event_time)}
                            </span>
                          </div>

                          <p className="text-xs text-rose-200 leading-relaxed font-mono-tabular bg-[#070916] p-2 rounded-lg border border-rose-500/20">
                            {v.details || 'Integrity violation detected'}
                          </p>

                          <div className="flex items-center gap-2 pt-0.5 text-[11px] text-slate-300">
                            {v.question_id && (
                              <span className="bg-[#070916] border border-[#283f5f] px-2 py-0.5 rounded-md font-mono-tabular font-medium text-slate-300">
                                Question #{v.question_id}
                              </span>
                            )}
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider',
                                v.severity === 'violation'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              )}
                            >
                              {v.severity}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: QUESTION REVIEW */}
            {activeTab === 'review' && (
              <div className="space-y-4">
                {loading ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Loading question review...
                  </div>
                ) : !result ? (
                  <div className="py-12 text-center space-y-2 bg-[#070916] rounded-2xl border border-[#283f5f]/60 p-6">
                    <HelpCircle className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="font-semibold text-white text-sm">Attempt in progress</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      This participant is currently answering questions. The complete answer review will be generated upon submission.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Performance Summary Banner */}
                    <div className="p-4 bg-[#070916] border border-[#283f5f] rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">
                          Score Breakdown
                        </span>
                        <span className="text-base font-bold font-mono-tabular text-white">
                          {result.score} / {result.total_questions} Marks (1 Mark each)
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          No negative marking applied
                        </span>
                      </div>

                      <div className="flex items-center gap-3 font-mono-tabular">
                        <span className="inline-flex items-center gap-1 text-[#9db40c] bg-[#506022]/20 border border-[#9db40c]/40 px-2.5 py-1 rounded-lg font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-[#9db40c]" />
                          {result.correct_count} Correct
                        </span>
                        <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-lg font-semibold">
                          <XCircle className="w-3 h-3" />
                          {result.incorrect_count} Wrong
                        </span>
                        {result.unanswered_count > 0 && (
                          <span className="inline-flex items-center gap-1 text-slate-400 bg-[#283f5f]/30 border border-[#283f5f] px-2.5 py-1 rounded-lg">
                            {result.unanswered_count} Skipped
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Filter controls */}
                    <div className="flex items-center gap-1.5 pb-2">
                      {(['all', 'correct', 'incorrect', 'unanswered'] as const).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setReviewFilter(filter)}
                          className={cn(
                            'text-xs font-semibold px-2.5 py-1 rounded-lg capitalize transition-colors',
                            reviewFilter === filter
                              ? 'bg-[#031c6c] text-[#9db40c] border border-[#283f5f]'
                              : 'bg-[#070916] text-slate-400 hover:text-white border border-[#283f5f]/50'
                          )}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>

                    {/* Question Items List */}
                    <div className="space-y-4">
                      {filteredReviewItems.map((item, idx) => (
                        <div
                          key={`${item.question_id}-${item.question_index ?? idx}`}
                          className="p-4 border border-[#283f5f]/60 rounded-2xl bg-[#070916] space-y-3"
                        >
                          {/* Question header */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold font-mono-tabular text-slate-400">
                              Question #{item.question_index}
                            </span>
                            <Badge
                              variant={
                                item.is_correct
                                  ? 'success'
                                  : item.is_unanswered
                                  ? 'outline'
                                  : 'danger'
                              }
                              size="sm"
                              dot
                            >
                              {item.is_correct
                                ? 'Correct (+1)'
                                : item.is_unanswered
                                ? 'Unanswered (0)'
                                : 'Incorrect (0)'}
                            </Badge>
                          </div>

                          {/* Question prompt */}
                          <p className="text-sm font-semibold text-white leading-snug">
                            {item.question}
                          </p>

                          {/* Answers comparison */}
                          <div className="space-y-2 pt-1">
                            {/* Participant Answer */}
                            <div
                              className={cn(
                                'p-2.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2',
                                item.is_correct
                                  ? 'bg-[#506022]/20 border-[#9db40c]/40 text-[#9db40c]'
                                  : item.is_unanswered
                                  ? 'bg-[#0d1224] border-[#283f5f] text-slate-400 italic'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                              )}
                            >
                              <span className="font-bold shrink-0 font-mono-tabular">
                                Participant Answer:
                              </span>
                              <span>
                                {item.is_unanswered ? (
                                  'Not answered (Skipped)'
                                ) : (
                                  <>
                                    <strong className="font-mono-tabular">[{item.user_selected_key}]</strong>{' '}
                                    {item.user_selected_text}
                                  </>
                                )}
                              </span>
                            </div>

                            {/* Correct Answer */}
                            {(!item.is_correct || item.is_unanswered) && (
                              <div className="p-2.5 rounded-xl border border-[#9db40c]/40 bg-[#506022]/20 text-[#9db40c] text-xs leading-relaxed flex items-start gap-2">
                                <span className="font-bold shrink-0 font-mono-tabular text-[#9db40c]">
                                  Correct Answer:
                                </span>
                                <span>
                                  <strong className="font-mono-tabular text-white">
                                    [{item.correct_option_key}]
                                  </strong>{' '}
                                  {item.correct_option_text}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Explanation */}
                          {item.explanation && (
                            <div className="p-3 bg-[#0d1224] rounded-xl border border-[#283f5f]/70 text-xs text-slate-300 leading-relaxed">
                              <span className="font-semibold text-white block mb-0.5">
                                Explanation
                              </span>
                              {item.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB: HANDS-ON DEBUGGING AUDIT */}
            {activeTab === 'hands_on' && (
              <div className="space-y-4">
                {/* Score & Overview Banner */}
                <div className="p-4 bg-[#070916] border border-[#283f5f] rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-blue-400 block text-[11px] uppercase tracking-wider font-semibold">
                      Hands-On Debugging Performance
                    </span>
                    <span className="text-lg font-black font-mono-tabular text-white flex items-center gap-2 mt-0.5">
                      <span className="text-blue-400">
                        {currentP.hands_on_score ?? result?.hands_on_score ?? 0}
                      </span>
                      <span className="text-slate-500">/</span>
                      <span>{currentP.hands_on_total ?? result?.hands_on_total ?? 10} Challenges Solved</span>
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Live in-browser code editor & test suite validation
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono-tabular">
                    <span className="inline-flex items-center gap-1.5 text-blue-300 bg-[#031c6c]/40 border border-[#283f5f] px-3 py-1.5 rounded-xl font-bold text-xs">
                      <Code2 className="w-3.5 h-3.5 text-blue-400" />
                      {Object.keys(currentP.hands_on_submissions || result?.hands_on_submissions || {}).length} Challenges Attempted
                    </span>
                  </div>
                </div>

                {/* Challenges List */}
                <div className="space-y-3">
                  {(handsOnQuestionsData as HandsOnDebugQuestion[]).map((q) => {
                    const submissions = currentP.hands_on_submissions || result?.hands_on_submissions || {};
                    const sub = submissions[q.id];
                    const isSolved = sub?.is_solved || false;
                    const hasAttempted = Boolean(sub);
                    const isExpanded = expandedCodeId === q.id;

                    return (
                      <div
                        key={q.id}
                        className={cn(
                          'p-4 border rounded-2xl bg-[#070916] transition-all space-y-3',
                          isSolved
                            ? 'border-emerald-500/40 hover:border-emerald-500/70'
                            : hasAttempted
                            ? 'border-blue-500/40 hover:border-blue-500/70'
                            : 'border-[#283f5f]/60 hover:border-[#283f5f]'
                        )}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono-tabular text-slate-400">
                              Challenge #{q.id}
                            </span>
                            <span
                              className={cn(
                                'text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border font-mono-tabular',
                                q.difficulty === 'easy'
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                  : q.difficulty === 'medium'
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                              )}
                            >
                              {q.difficulty}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isSolved ? (
                              <Badge variant="success" size="sm" dot>
                                Solved ({sub.passed_test_cases}/{sub.total_test_cases} tests)
                              </Badge>
                            ) : hasAttempted ? (
                              <Badge variant="outline" size="sm" dot className="border-blue-500/40 text-blue-300">
                                Incomplete ({sub.passed_test_cases}/{sub.total_test_cases} tests)
                              </Badge>
                            ) : (
                              <Badge variant="outline" size="sm" dot>
                                Unattempted
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h4 className="text-sm font-bold text-white leading-snug">
                            {q.title}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            {q.description}
                          </p>
                        </div>

                        {/* Submission Details Bar */}
                        {hasAttempted && (
                          <div className="flex items-center justify-between pt-2 border-t border-[#283f5f]/50 text-xs">
                            <div className="flex items-center gap-2 font-mono-tabular text-slate-300">
                              <span className="px-2 py-0.5 bg-[#0d1224] border border-[#283f5f] rounded-md text-[11px]">
                                {sub.language === 'python' ? 'Python 3.10' : 'JavaScript (Browser)'}
                              </span>
                              {sub.submitted_at && (
                                <span className="text-[11px] text-slate-400">
                                  {new Date(sub.submitted_at).toLocaleTimeString()}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => setExpandedCodeId(isExpanded ? null : q.id)}
                              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span>{isExpanded ? 'Hide Code' : 'View Code'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}

                        {/* Expanded Code Block */}
                        {hasAttempted && isExpanded && (
                          <div className="pt-2">
                            <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 font-mono-tabular">
                              <span>Submitted Code ({sub.language})</span>
                              <span className={isSolved ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}>
                                {isSolved ? '✓ All Tests Passed' : 'Incomplete Tests'}
                              </span>
                            </div>
                            <pre className="p-3 bg-[#030611] border border-[#283f5f] rounded-xl text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed max-h-64 whitespace-pre">
                              <code>{sub.code}</code>
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: ACTIVITY AUDIT TRAIL */}
            {activeTab === 'activity' && (
              <div className="space-y-6">
                {/* Timing metadata */}
                <div className="bg-[#070916] border border-[#283f5f]/80 rounded-xl p-3.5 text-xs space-y-1.5 font-mono-tabular text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Session Start:</span>
                    <span className="text-white">
                      {currentP.start_time
                        ? new Date(currentP.start_time).toLocaleTimeString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Submission:</span>
                    <span className="text-white">
                      {currentP.end_time
                        ? new Date(currentP.end_time).toLocaleTimeString()
                        : 'Active session'}
                    </span>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Telemetry Stream & Audit Events
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono-tabular">
                      {activities.length} events logged
                    </span>
                  </div>

                  {loading ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Loading activity trail...
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No recorded events for this participant yet.
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-[#283f5f] ml-3.5 space-y-4 py-1">
                      {activities.map((act) => {
                        const isViolation = act.severity === 'violation';
                        const isWarning = act.severity === 'warning';

                        return (
                          <div key={act.activity_id} className="relative pl-6">
                            {/* Dot */}
                            <div
                              className={cn(
                                'absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 bg-[#0d1224] flex items-center justify-center',
                                isViolation
                                  ? 'border-rose-500 text-rose-500'
                                  : isWarning
                                  ? 'border-amber-400 text-amber-400'
                                  : 'border-[#283f5f] text-slate-400'
                              )}
                            >
                              {getActivityIcon(act.event_type)}
                            </div>

                            <div className="flex items-baseline justify-between gap-2">
                              <span
                                className={cn(
                                  'text-xs font-medium',
                                  isViolation
                                    ? 'text-rose-400 font-semibold'
                                    : isWarning
                                    ? 'text-amber-300'
                                    : 'text-slate-200'
                                )}
                              >
                                {act.details || act.event_type.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono-tabular shrink-0">
                                {formatTimestamp(act.event_time)}
                              </span>
                            </div>

                            {act.selected_option && (
                              <span className="text-[11px] text-slate-400 font-mono-tabular">
                                Option selected: {act.selected_option.toUpperCase()}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer action */}
          <div className="p-4 border-t border-[#283f5f] bg-[#070916] flex items-center justify-between gap-3">
            <Button
              variant={isEffectivelyFlagged ? 'primary' : 'outline'}
              size="sm"
              onClick={handleFlagAction}
              className={cn(
                'gap-1.5 cursor-pointer font-semibold',
                isEffectivelyFlagged
                  ? 'bg-[#9db40c] hover:bg-[#9db40c]/90 text-[#070916] border-transparent shadow-xs font-bold'
                  : 'border-rose-500/40 text-rose-400 hover:bg-rose-500/10'
              )}
            >
              {isEffectivelyFlagged ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Clear Flag & Reinstate</span>
                </>
              ) : (
                <>
                  <Flag className="w-3.5 h-3.5 text-rose-400" />
                  <span>Flag Participant</span>
                </>
              )}
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose} className="cursor-pointer">
              Close Audit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
