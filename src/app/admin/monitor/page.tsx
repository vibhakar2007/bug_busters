'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLiveMonitor } from '@/hooks/useLiveMonitor';
import { StatsCard } from '@/components/admin/StatsCard';
import { LiveParticipantTable } from '@/components/monitoring/LiveParticipantTable';
import { LiveActivityFeed } from '@/components/monitoring/LiveActivityFeed';
import { ParticipantDrawer } from '@/components/admin/ParticipantDrawer';
import { Participant } from '@/types/participant';
import { Quiz } from '@/types/quiz';
import { participantService } from '@/lib/api/participantService';
import { quizService } from '@/lib/api/quizService';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { animatePageEntrance } from '@/animations/gsap';
import {
  Users,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Clock,
} from 'lucide-react';

export default function LiveMonitorPage() {
  const {
    participants,
    activities,
    stats,
    isSimulating,
    startSimulation,
    stopSimulation,
  } = useLiveMonitor();

  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);
  const [newDuration, setNewDuration] = useState<number>(15);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    animatePageEntrance(containerRef.current);
    quizService.getQuiz(1).then((q) => {
      if (q) {
        setActiveQuiz(q);
        setNewDuration(q.duration_minutes);
      }
    });
  }, []);

  const handleSaveDuration = async () => {
    if (!activeQuiz) return;
    await quizService.updateQuizDuration(activeQuiz.quiz_id, newDuration);
    setActiveQuiz((prev) => (prev ? { ...prev, duration_minutes: newDuration } : null));
    setIsDurationModalOpen(false);
  };

  const handleSelectParticipant = (p: Participant) => {
    setSelectedParticipant(p);
    setIsDrawerOpen(true);
  };

  const handleSelectParticipantById = async (id: number) => {
    const p = await participantService.getParticipant(id);
    if (p) {
      setSelectedParticipant(p);
      setIsDrawerOpen(true);
    }
  };

  const handleFlagToggle = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'flagged' ? 'active' : 'flagged';
    const updated = await participantService.updateParticipant(id, {
      status: newStatus as 'active' | 'flagged',
    });
    setSelectedParticipant(updated);
  };

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Top Title & Live Simulation Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Live Monitor
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Real-time telemetry stream, anti-cheating violations, and participant activity inspection.
          </p>
        </div>

        {/* Live Simulation Controls */}
        <div className="flex items-center gap-2.5 self-stretch sm:self-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeQuiz) setNewDuration(activeQuiz.duration_minutes);
              setIsDurationModalOpen(true);
            }}
            className="gap-1.5 text-xs text-neutral-800 hover:text-neutral-950 border-neutral-300 shadow-xs"
          >
            <Clock className="w-3.5 h-3.5 text-neutral-600" />
            <span>Adjust Duration ({activeQuiz?.duration_minutes || 15}m)</span>
          </Button>

          {isSimulating ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={stopSimulation}
              className="gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Stop Traffic Simulation</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={startSimulation}
              className="gap-1.5 text-xs text-neutral-800 hover:text-neutral-950 border-neutral-300 shadow-xs"
            >
              <Play className="w-3.5 h-3.5 text-emerald-600" />
              <span>Simulate Live Traffic</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
            title="Refresh"
            className="p-2"
          >
            <RefreshCw className="w-3.5 h-3.5 text-neutral-500" />
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard
          title="Participants"
          value={stats.total}
          subtitle="Registered attendees"
          icon={Users}
          variant="neutral"
        />

        <StatsCard
          title="Active"
          value={stats.active}
          subtitle="Currently answering"
          icon={Radio}
          variant="success"
          trend="Live"
        />

        <StatsCard
          title="Completed"
          value={stats.completed}
          subtitle="Finished attempts"
          icon={CheckCircle2}
          variant="neutral"
        />

        <StatsCard
          title="Flagged"
          value={stats.flagged}
          subtitle="Focus & tab violations"
          icon={AlertTriangle}
          variant={stats.flagged > 0 ? 'danger' : 'neutral'}
        />
      </div>

      {/* Main Grid: Participant Table (2/3) + Real-time Activity Feed (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Participants Table */}
        <div className="lg:col-span-2">
          <LiveParticipantTable
            participants={participants}
            onSelectParticipant={handleSelectParticipant}
            quizDurationMinutes={activeQuiz?.duration_minutes || 15}
          />
        </div>

        {/* Live Activity Feed */}
        <div>
          <LiveActivityFeed
            activities={activities}
            onSelectParticipant={handleSelectParticipantById}
          />
        </div>
      </div>

      {/* Slide-over Audit Drawer for Participant Detail */}
      <ParticipantDrawer
        participant={selectedParticipant}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onFlagToggle={handleFlagToggle}
      />

      {/* Adjust Quiz Duration Modal */}
      <Modal
        isOpen={isDurationModalOpen}
        onClose={() => setIsDurationModalOpen(false)}
        title="Adjust Live Quiz Duration"
        description="Broadcasting duration changes automatically recalculates remaining countdown timers across all connected participant screens without resetting."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Duration Limit (Minutes)
            </label>
            <input
              type="number"
              min={1}
              max={180}
              value={newDuration}
              onChange={(e) => setNewDuration(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono-tabular font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white"
            />
          </div>

          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600 leading-relaxed">
            <p>
              • If increased: Active participants receive extra time seamlessly.
            </p>
            <p className="mt-1">
              • If decreased below elapsed time: The attempt auto-submits immediately.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
            <Button variant="outline" size="sm" onClick={() => setIsDurationModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveDuration}>
              Apply New Duration
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
