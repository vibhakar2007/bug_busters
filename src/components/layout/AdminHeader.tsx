'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ExternalLink,
  Radio,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Layers,
  Activity,
  Users,
  Award,
} from 'lucide-react';
import { adminSignOut } from '@/components/admin/AdminAuthGuard';
import { cn } from '@/lib/utils/cn';

export const AdminHeader: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Quizzes', href: '/admin/quizzes', icon: Layers, exact: false },
    { label: 'Live Monitor', href: '/admin/monitor', icon: Activity, exact: true, badge: 'LIVE' },
    { label: 'Participants', href: '/admin/participants', icon: Users, exact: true },
    { label: 'Results', href: '/admin/results', icon: Award, exact: true },
  ];

  const isActive = (item: (typeof navItems)[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <>
      <header className="h-14 sm:h-16 border-b border-[#283F5F]/50 bg-[#060B07] sticky top-0 z-20 px-3 sm:px-6 flex items-center justify-between">
        {/* Left: Mobile menu toggle + Brand/Event Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#283F5F]/30 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm sm:text-base text-white tracking-tight">
              Bug Busters
            </span>
            <span className="text-[#283F5F] hidden sm:inline">•</span>
            <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
              Admin Console
            </span>
          </div>
        </div>

        {/* Right controls: Realtime Pulse, Clock, Jump to Participant App, Admin Avatar */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Realtime Live Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-[#9DB40C]/15 border border-[#9DB40C]/40 text-[#9DB40C] text-[11px] sm:text-xs font-semibold">
            <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9DB40C] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-[#9DB40C]"></span>
            </span>
            <Radio className="w-3 h-3 text-[#9DB40C] hidden sm:inline" />
            <span>Live</span>
          </div>

          {/* Participant view quick link */}
          <Link
            href="/join"
            target="_blank"
            className="text-xs font-semibold text-slate-300 hover:text-[#9DB40C] flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-[#283F5F]/20 transition-colors"
          >
            <span className="hidden sm:inline">Participant View</span>
            <span className="sm:hidden">Join</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>

          {/* Sign Out */}
          <div className="flex items-center border-l border-[#283F5F]/40 pl-2 sm:pl-3">
            <button
              onClick={() => adminSignOut()}
              title="Sign out of Admin Console"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer / Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#060B07] border-b border-[#283F5F] px-4 py-3 space-y-1 shadow-xl sticky top-14 z-20">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                  active
                    ? 'bg-[#031C6C] text-[#9DB40C] border border-[#283F5F]'
                    : 'text-slate-400 hover:bg-[#283F5F]/20 hover:text-white'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={cn('w-4 h-4', active ? 'text-[#9DB40C]' : 'text-slate-400')} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-[#9DB40C] text-black">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
};
