'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ExternalLink, Radio } from 'lucide-react';

export const AdminHeader: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 border-b border-neutral-200/80 bg-white sticky top-0 z-20 px-6 flex items-center justify-between">
      {/* Event Details */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-neutral-900">
            Technical Symposium 2026
          </span>
          <span className="text-neutral-300">•</span>
          <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md">
            Round 1 (Elimination)
          </span>
        </div>
      </div>

      {/* Right controls: Realtime Pulse, Clock, Jump to Participant App, Admin Avatar */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Realtime Live Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="flex items-center gap-1">
            <Radio className="w-3 h-3 text-emerald-600" />
            Sync Active
          </span>
        </div>

        {/* Live Clock */}
        <span className="text-xs font-mono-tabular text-neutral-500 hidden md:inline-block">
          {currentTime}
        </span>

        {/* Participant view quick link */}
        <Link
          href="/join"
          target="_blank"
          className="text-xs font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          <span>Test Participant View</span>
          <ExternalLink className="w-3 h-3 text-neutral-400" />
        </Link>

        {/* Admin profile avatar placeholder */}
        <div className="flex items-center gap-2.5 border-l border-neutral-200 pl-4">
          <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-medium text-xs">
            AD
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="text-xs font-medium text-neutral-900">Symposium Admin</span>
            <span className="text-[10px] text-neutral-400">Chief Coordinator</span>
          </div>
        </div>
      </div>
    </header>
  );
};
