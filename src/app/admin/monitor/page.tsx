'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLiveMonitor } from '@/hooks/useLiveMonitor';
import { StatsCard } from '@/components/admin/StatsCard';
import { LiveParticipantTable } from '@/components/monitoring/LiveParticipantTable';
import { LiveActivityFeed } from '@/components/monitoring/LiveActivityFeed';
import { ParticipantDrawer } from '@/components/admin/ParticipantDrawer';
import { Participant } from '@/types/participant';
import { participantService } from '@/lib/api/participantService';
import { Button } from '@/components/ui/Button';
import { animatePageEntrance } from '@/animations/gsap';
import {
  Users,
  Radio,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export default function LiveMonitorPage() {
  const {
    participants,
    activities,
    stats,
  } = useLiveMonitor();

  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    animatePageEntrance(containerRef.current);
  }, []);

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
    if (currentStatus === 'flagged') {
      const target = participants.find((p) => p.participant_id === id);
      const isCompleted = target?.status === 'completed' || Boolean(target?.end_time);
      const updated = await participantService.updateParticipant(id, {
        status: isCompleted ? 'completed' : 'active',
        violation_count: 0,
        last_activity_description: 'Flag cleared by admin',
      });
      setSelectedParticipant(updated);
    } else {
      const updated = await participantService.updateParticipant(id, {
        status: 'flagged',
        last_activity_description: 'Manually flagged by admin',
      });
      setSelectedParticipant(updated);
    }
  };

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Top Title & Live Simulation Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9db40c] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#9db40c]"></span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Live Monitor
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time telemetry stream, anti-cheating violations, and participant activity inspection.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-stretch sm:self-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            title="Refresh"
            className="gap-1.5 text-xs text-slate-200 hover:text-white border-[#283f5f] hover:bg-[#283f5f]/30 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Refresh</span>
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
            onClearFlag={(id) => handleFlagToggle(id, 'flagged')}
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
        initialTab="violations"
      />
    </div>
  );
}
