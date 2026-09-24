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
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ParticipantDrawerProps {
  participant: Participant | null;
  isOpen: boolean;
  onClose: () => void;
  onFlagToggle?: (participantId: number, currentStatus: string) => void;
  initialTab?: 'violations' | 'activity' | 'review';
}

export const ParticipantDrawer: React.FC<ParticipantDrawerProps> = ({
  participant,
  isOpen,
  onClose,
  onFlagToggle,
  initialTab = 'violations',
}) => {
  const [userTab, setUserTab] = useState<'violations' | 'activity' | 'review' | null>(null);
  const [prevParticipantId, setPrevParticipantId] = useState<number | null>(null);

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

  if (!isOpen || !participant) return null;

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
          className="w-screen max-w-2xl bg-white border-l border-neutral-200 shadow-2xl flex flex-col justify-between"
        >
          {/* Header */}
          <div className="p-6 border-b border-neutral-100 bg-neutral-50/50">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Participant Audit & Review
                  </span>
                  <Badge
                    variant={
                      participant.status === 'flagged'
                        ? 'danger'
                        : participant.status === 'completed'
                        ? 'neutral'
                        : 'success'
                    }
                    dot
                  >
                    {participant.status}
                  </Badge>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mt-1">
                  {participant.name}
                </h2>
                <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono-tabular mt-1">
                  <Shield className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Phone: {participant.phone}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 text-center mt-5">
              <div className="p-3 bg-white border border-neutral-200/80 rounded-xl shadow-2xs">
                <span className="text-[11px] text-neutral-400 font-medium block">Progress</span>
                <span className="text-base font-bold text-neutral-900 font-mono-tabular">
                  {participant.current_question || 0}/{participant.total_questions || 40}
                </span>
              </div>

              <div className="p-3 bg-white border border-neutral-200/80 rounded-xl shadow-2xs">
                <span className="text-[11px] text-neutral-400 font-medium block">Score (+1 / 0)</span>
                <span className="text-base font-bold text-neutral-900 font-mono-tabular">
                  {participant.score !== null ? `${participant.score} / ${participant.total_questions || 40}` : 'In Progress'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setUserTab('violations')}
                className={cn(
                  'p-3 border rounded-xl shadow-2xs text-center transition-all cursor-pointer',
                  (participant.violation_count > 0 || violationEvents.length > 0)
                    ? 'bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100/70'
                    : 'bg-white border-neutral-200/80 text-neutral-900 hover:bg-neutral-50'
                )}
                title="Click to view full violations audit"
              >
                <span className="text-[11px] font-medium block opacity-70">Violations (View)</span>
                <span className="text-base font-bold font-mono-tabular flex items-center justify-center gap-1">
                  {(participant.violation_count > 0 || violationEvents.length > 0) && (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  )}
                  {violationEvents.length || participant.violation_count}
                </span>
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1.5 mt-5 p-1 bg-neutral-100 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setUserTab('violations')}
                className={cn(
                  'flex-1 py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                  activeTab === 'violations'
                    ? 'bg-white text-neutral-900 shadow-xs font-bold'
                    : 'text-neutral-500 hover:text-neutral-900'
                )}
              >
                <AlertTriangle
                  className={cn(
                    'w-3.5 h-3.5',
                    (participant.violation_count > 0 || violationEvents.length > 0)
                      ? 'text-rose-600'
                      : 'text-neutral-400'
                  )}
                />
                <span>Violations</span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-md font-mono-tabular font-bold',
                    (participant.violation_count > 0 || violationEvents.length > 0)
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-neutral-200 text-neutral-700'
                  )}
                >
                  {violationEvents.length || participant.violation_count}
                </span>
              </button>

              <button
                onClick={() => setUserTab('activity')}
                className={cn(
                  'flex-1 py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                  activeTab === 'activity'
                    ? 'bg-white text-neutral-900 shadow-xs font-bold'
                    : 'text-neutral-500 hover:text-neutral-900'
                )}
              >
                <History className="w-3.5 h-3.5" />
                <span>All Events</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-neutral-200 text-neutral-800 rounded-md font-mono-tabular">
                  {activities.length}
                </span>
              </button>

              <button
                onClick={() => setUserTab('review')}
                className={cn(
                  'flex-1 py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                  activeTab === 'review'
                    ? 'bg-white text-neutral-900 shadow-xs font-bold'
                    : 'text-neutral-500 hover:text-neutral-900'
                )}
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span>Review</span>
                {result && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-neutral-200 text-neutral-800 rounded-md font-mono-tabular">
                    {result.score}/{result.total_questions}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Body content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* TAB: VIOLATIONS AUDIT */}
            {activeTab === 'violations' && (
              <div className="space-y-4">
                {/* Status Alert Banner */}
                {participant.status === 'flagged' ? (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                    <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-rose-950">
                          Disqualified • Participant Flagged
                        </h4>
                        <span className="text-[10px] uppercase font-bold bg-rose-200/80 text-rose-800 px-2 py-0.5 rounded-full">
                          Flag Active
                        </span>
                      </div>
                      <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                        This participant exceeded test violation limits or was manually flagged. Their result is excluded from the leaderboard. Click "Clear Flag" below to reinstate the participant.
                      </p>
                    </div>
                  </div>
                ) : (participant.violation_count > 0 || violationEvents.length > 0) ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-amber-950">
                          Integrity Warnings ({participant.violation_count} recorded)
                        </h4>
                        <span className="text-[10px] uppercase font-bold bg-amber-200/80 text-amber-800 px-2 py-0.5 rounded-full">
                          Warning State
                        </span>
                      </div>
                      <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                        The participant triggered browser focus loss or window blur. Accumulating 3 violations will trigger automatic disqualification.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950">
                        Clean Test Integrity
                      </h4>
                      <p className="text-xs text-emerald-700">
                        Zero tab switches, clipboard copies/pastes, or focus interruptions recorded.
                      </p>
                    </div>
                  </div>
                )}

                {/* Violation Items List */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Recorded Violations & Infractions ({violationEvents.length})
                    </h3>
                    {violationEvents.length > 0 && (
                      <span className="text-[11px] text-rose-600 font-bold font-mono-tabular">
                        {violationEvents.filter((v) => v.severity === 'violation').length} critical •{' '}
                        {violationEvents.filter((v) => v.severity !== 'violation').length} warnings
                      </span>
                    )}
                  </div>

                  {loading ? (
                    <div className="py-8 text-center text-xs text-neutral-400">
                      Loading violation events...
                    </div>
                  ) : violationEvents.length === 0 ? (
                    <div className="py-10 text-center space-y-2 bg-neutral-50 rounded-2xl border border-neutral-150 p-6">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                      <p className="text-xs font-bold text-neutral-800">No violations logged</p>
                      <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
                        This participant has not triggered any anti-cheating detections during the quiz.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {violationEvents.map((v, i) => (
                        <div
                          key={v.activity_id || i}
                          className="p-3.5 bg-rose-50/60 border border-rose-200/90 rounded-xl space-y-2 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                              {getActivityIcon(v.event_type)}
                              <span>{formatViolationTitle(v.event_type)}</span>
                            </span>
                            <span className="text-[11px] font-mono-tabular text-neutral-500 shrink-0">
                              {formatTimestamp(v.event_time)}
                            </span>
                          </div>

                          <p className="text-xs text-rose-900 leading-relaxed font-mono-tabular bg-white/70 p-2 rounded-lg border border-rose-100">
                            {v.details || 'Integrity violation detected'}
                          </p>

                          <div className="flex items-center gap-2 pt-0.5 text-[11px] text-neutral-600">
                            {v.question_id && (
                              <span className="bg-white border border-neutral-200 px-2 py-0.5 rounded-md font-mono-tabular font-medium">
                                Question #{v.question_id}
                              </span>
                            )}
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider',
                                v.severity === 'violation'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
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
                  <div className="py-12 text-center text-xs text-neutral-400">
                    Loading question review...
                  </div>
                ) : !result ? (
                  <div className="py-12 text-center space-y-2">
                    <HelpCircle className="w-8 h-8 text-neutral-300 mx-auto" />
                    <p className="font-semibold text-neutral-800 text-sm">Attempt in progress</p>
                    <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                      This participant is currently answering questions. The complete answer review will be generated upon submission.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Performance Summary Banner */}
                    <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-neutral-400 block text-[11px] uppercase tracking-wider font-semibold">
                          Score Breakdown
                        </span>
                        <span className="text-base font-bold font-mono-tabular text-neutral-900">
                          {result.score} / {result.total_questions} ({result.percentage}%)
                        </span>
                        <span className="text-[11px] text-neutral-500 block">
                          No negative marking applied
                        </span>
                      </div>

                      <div className="flex items-center gap-3 font-mono-tabular">
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          {result.correct_count} Correct
                        </span>
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg font-semibold">
                          <XCircle className="w-3 h-3" />
                          {result.incorrect_count} Wrong
                        </span>
                        {result.unanswered_count > 0 && (
                          <span className="inline-flex items-center gap-1 text-neutral-600 bg-neutral-100 border border-neutral-200 px-2.5 py-1 rounded-lg">
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
                              ? 'bg-neutral-900 text-white'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
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
                          className="p-4 border border-neutral-200/90 rounded-2xl bg-white space-y-3"
                        >
                          {/* Question header */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold font-mono-tabular text-neutral-400">
                              Question #{item.question_index}
                            </span>
                            <Badge
                              variant={
                                item.is_correct
                                  ? 'success'
                                  : item.is_unanswered
                                  ? 'neutral'
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
                          <p className="text-sm font-semibold text-neutral-900 leading-snug">
                            {item.question}
                          </p>

                          {/* Answers comparison */}
                          <div className="space-y-2 pt-1">
                            {/* Participant Answer */}
                            <div
                              className={cn(
                                'p-2.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2',
                                item.is_correct
                                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                  : item.is_unanswered
                                  ? 'bg-neutral-50 border-neutral-200 text-neutral-500 italic'
                                  : 'bg-rose-50/70 border-rose-200 text-rose-950'
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
                              <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 text-emerald-950 text-xs leading-relaxed flex items-start gap-2">
                                <span className="font-bold shrink-0 font-mono-tabular text-emerald-800">
                                  Correct Answer:
                                </span>
                                <span>
                                  <strong className="font-mono-tabular text-emerald-800">
                                    [{item.correct_option_key}]
                                  </strong>{' '}
                                  {item.correct_option_text}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Explanation */}
                          {item.explanation && (
                            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-150 text-xs text-neutral-600 leading-relaxed">
                              <span className="font-semibold text-neutral-900 block mb-0.5">
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

            {/* TAB: ACTIVITY AUDIT TRAIL */}
            {activeTab === 'activity' && (
              <div className="space-y-6">
                {/* Timing metadata */}
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3.5 text-xs space-y-1.5 font-mono-tabular text-neutral-600">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Session Start:</span>
                    <span>
                      {participant.start_time
                        ? new Date(participant.start_time).toLocaleTimeString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Submission:</span>
                    <span>
                      {participant.end_time
                        ? new Date(participant.end_time).toLocaleTimeString()
                        : 'Active session'}
                    </span>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Telemetry Stream & Audit Events
                    </h3>
                    <span className="text-[10px] text-neutral-400 font-mono-tabular">
                      {activities.length} events logged
                    </span>
                  </div>

                  {loading ? (
                    <div className="py-8 text-center text-xs text-neutral-400">
                      Loading activity trail...
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="py-8 text-center text-xs text-neutral-400">
                      No recorded events for this participant yet.
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-neutral-100 ml-3.5 space-y-4 py-1">
                      {activities.map((act) => {
                        const isViolation = act.severity === 'violation';
                        const isWarning = act.severity === 'warning';

                        return (
                          <div key={act.activity_id} className="relative pl-6">
                            {/* Dot */}
                            <div
                              className={cn(
                                'absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center',
                                isViolation
                                  ? 'border-rose-500 text-rose-500'
                                  : isWarning
                                  ? 'border-amber-500 text-amber-500'
                                  : 'border-neutral-300 text-neutral-400'
                              )}
                            >
                              {getActivityIcon(act.event_type)}
                            </div>

                            <div className="flex items-baseline justify-between gap-2">
                              <span
                                className={cn(
                                  'text-xs font-medium',
                                  isViolation
                                    ? 'text-rose-900 font-semibold'
                                    : isWarning
                                    ? 'text-amber-900'
                                    : 'text-neutral-800'
                                )}
                              >
                                {act.details || act.event_type.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-mono-tabular shrink-0">
                                {formatTimestamp(act.event_time)}
                              </span>
                            </div>

                            {act.selected_option && (
                              <span className="text-[11px] text-neutral-500 font-mono-tabular">
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
          <div className="p-4 border-t border-neutral-200 bg-neutral-50/50 flex items-center justify-between gap-3">
            <Button
              variant={participant.status === 'flagged' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onFlagToggle?.(participant.participant_id, participant.status)}
              className={cn(
                'gap-1.5 cursor-pointer font-semibold',
                participant.status === 'flagged'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shadow-xs'
                  : 'border-neutral-300 text-rose-700 hover:bg-rose-50'
              )}
            >
              {participant.status === 'flagged' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Clear Flag & Reinstate</span>
                </>
              ) : (
                <>
                  <Flag className="w-3.5 h-3.5 text-rose-600" />
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
