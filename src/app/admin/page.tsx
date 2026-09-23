'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { StatsCard } from '@/components/admin/StatsCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { quizService } from '@/lib/api/quizService';
import { participantService } from '@/lib/api/participantService';
import { activityService } from '@/lib/api/activityService';
import { Quiz } from '@/types/quiz';
import { Participant } from '@/types/participant';
import { ParticipantActivity } from '@/types/activity';
import { animatePageEntrance } from '@/animations/gsap';
import {
  Layers,
  Users,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { formatTimestamp } from '@/lib/utils/cn';

export default function AdminDashboardPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activities, setActivities] = useState<ParticipantActivity[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    animatePageEntrance(containerRef.current);

    Promise.all([
      quizService.getAllQuizzes(),
      participantService.getAllParticipants(),
      activityService.getRecentActivities(8),
    ]).then(([qList, pList, aList]) => {
      setQuizzes(qList);
      setParticipants(pList);
      setActivities(aList);
    });
  }, []);

  const totalQuizzes = quizzes.length;
  const totalParticipants = participants.length;
  const activeParticipants = participants.filter((p) => p.status === 'active').length;
  const completedParticipants = participants.filter((p) => p.status === 'completed').length;
  const flaggedParticipants = participants.filter((p) => p.status === 'flagged').length;

  return (
    <div ref={containerRef} className="space-y-8">
      {/* Dashboard Top Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            Overview
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Real-time status and participant tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/admin/monitor">
            <Button variant="outline" size="sm" className="gap-1.5 shadow-xs">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Live Monitor</span>
            </Button>
          </Link>
          <Link href="/admin/quizzes/create">
            <Button variant="primary" size="sm" className="gap-1.5 shadow-xs">
              <Plus className="w-4 h-4" />
              <span>Create Quiz</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Total Quizzes"
          value={totalQuizzes}
          subtitle="Configured rounds"
          icon={Layers}
          variant="neutral"
        />

        <StatsCard
          title="Participants"
          value={totalParticipants}
          subtitle="Registered attendees"
          icon={Users}
          variant="neutral"
        />

        <StatsCard
          title="Active Now"
          value={activeParticipants}
          subtitle="Currently testing"
          icon={Radio}
          variant="success"
          trend="Live"
        />

        <StatsCard
          title="Completed"
          value={completedParticipants}
          subtitle="Submissions finalized"
          icon={CheckCircle2}
          variant="neutral"
        />

        <StatsCard
          title="Flagged"
          value={flaggedParticipants}
          subtitle="Suspicious focus losses"
          icon={AlertTriangle}
          variant={flaggedParticipants > 0 ? 'danger' : 'neutral'}
        />
      </div>

      {/* Two Column Section: Live Round & Recent Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Quizzes & Quick Launcher */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">Active Rounds</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Currently running and upcoming competitive rounds
                </p>
              </div>
              <Link
                href="/admin/quizzes"
                className="text-xs font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-1"
              >
                <span>Manage All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-neutral-100 mt-2">
              {quizzes.slice(0, 3).map((quiz) => (
                <div key={quiz.quiz_id} className="py-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-neutral-900">{quiz.title}</span>
                      <Badge
                        variant={
                          quiz.status === 'live'
                            ? 'success'
                            : quiz.status === 'draft'
                            ? 'neutral'
                            : 'warning'
                        }
                        dot
                      >
                        {quiz.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-neutral-500 font-mono-tabular">
                      <span>Code: <strong>{quiz.code}</strong></span>
                      <span>•</span>
                      <span>{quiz.question_count} Questions</span>
                      <span>•</span>
                      <span>{quiz.duration_minutes} Mins</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/admin/quizzes/${quiz.quiz_id}`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Info / Instructions Banner */}
          <div className="p-5 rounded-2xl border border-neutral-200/80 bg-neutral-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Symposium Mode Active
              </span>
              <h4 className="text-base font-bold mt-1">Live Monitor is streaming events</h4>
              <p className="text-xs text-neutral-400 mt-1 max-w-md">
                Monitor student screen changes, tab switching, and real-time answer progression directly from the Live Monitor console.
              </p>
            </div>
            <Link href="/admin/monitor">
              <Button variant="secondary" size="md" className="shrink-0 text-xs font-semibold">
                Open Live Monitor
              </Button>
            </Link>
          </div>
        </div>

        {/* Right 1 Col: Live Activity Ticker */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-semibold text-neutral-900">Live Activity Feed</h3>
              </div>
              <Link href="/admin/monitor" className="text-[11px] text-neutral-500 hover:text-neutral-900">
                View All
              </Link>
            </div>

            <div className="divide-y divide-neutral-100 mt-2 space-y-1">
              {activities.map((act) => (
                <div key={act.activity_id} className="py-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-900 truncate max-w-[140px]">
                      {act.participant_name}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono-tabular">
                      {formatTimestamp(act.event_time)}
                    </span>
                  </div>
                  <p
                    className={`mt-0.5 text-[11px] truncate ${
                      act.severity === 'violation'
                        ? 'text-rose-700 font-medium'
                        : act.severity === 'warning'
                        ? 'text-amber-700'
                        : 'text-neutral-500'
                    }`}
                  >
                    {act.details || act.event_type}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
