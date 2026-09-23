'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Participant } from '@/types/participant';
import { participantService } from '@/lib/api/participantService';
import { LiveParticipantTable } from '@/components/monitoring/LiveParticipantTable';
import { ParticipantDrawer } from '@/components/admin/ParticipantDrawer';
import { animatePageEntrance } from '@/animations/gsap';

export default function ParticipantsAdminPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    animatePageEntrance(containerRef.current);
    participantService.getAllParticipants().then(setParticipants);

    const unsubscribe = participantService.subscribeToParticipants(setParticipants);
    return () => unsubscribe();
  }, []);

  const handleSelectParticipant = (p: Participant) => {
    setSelectedParticipant(p);
    setIsDrawerOpen(true);
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
          Participant Directory
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Complete registry of all symposium participants, progress states, and audit records.
        </p>
      </div>

      <LiveParticipantTable
        participants={participants}
        onSelectParticipant={handleSelectParticipant}
      />

      <ParticipantDrawer
        participant={selectedParticipant}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onFlagToggle={handleFlagToggle}
      />
    </div>
  );
}
