'use client';

import React from 'react';
import Link from 'next/link';
import { Phone, Maximize, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ParticipantNavbarProps {
  quizTitle?: string;
  phone?: string;
  registrationNumber?: string;
  onFullscreenRequest?: () => void;
  className?: string;
  isSticky?: boolean;
}

export const ParticipantNavbar: React.FC<ParticipantNavbarProps> = ({
  quizTitle,
  phone,
  registrationNumber,
  onFullscreenRequest,
  className,
  isSticky = true,
}) => {
  const displayPhone = phone || registrationNumber;

  return (
    <header
      className={cn(
        'w-full bg-[#070916] border-b border-[#283f5f]/50',
        isSticky && 'sticky top-0 z-30',
        className
      )}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center group">
          <span className="font-extrabold text-base sm:text-lg tracking-tight text-white group-hover:text-[#9db40c] transition-colors">
            Bug Busters
          </span>
        </Link>

        {/* Center info if in quiz */}
        {quizTitle && (
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-medium truncate max-w-xs">
            <span className="truncate">{quizTitle}</span>
          </div>
        )}

        {/* Status indicator & fullscreen CTA */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#9db40c]/15 border border-[#9db40c]/40 text-[#9db40c] text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9db40c] animate-pulse" />
            <span className="hidden sm:inline">Connected</span>
            <Wifi className="w-3 h-3 sm:hidden" />
          </div>

          {displayPhone && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 bg-[#0d1224] px-2.5 py-1 rounded-full border border-[#283f5f] font-mono-tabular">
              <Phone className="w-3 h-3 text-[#9db40c]" />
              <span>{displayPhone}</span>
            </div>
          )}

          {onFullscreenRequest && (
            <button
              onClick={onFullscreenRequest}
              title="Toggle Fullscreen"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#283f5f]/40 rounded-lg transition-colors cursor-pointer"
            >
              <Maximize className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
