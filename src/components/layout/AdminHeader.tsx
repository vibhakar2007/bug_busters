'use client';

import React, { useState, useEffect } from 'react';
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
  const [currentTime, setCurrentTime] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

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
      <header className="h-14 sm:h-16 border-b border-neutral-200/80 bg-white sticky top-0 z-20 px-3 sm:px-6 flex items-center justify-between">
        {/* Left: Mobile menu toggle + Brand/Event Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2">
            <span className="font-bold text-sm sm:text-base text-neutral-900 tracking-tight">
              Bug Busters
            </span>
            <span className="text-neutral-300 hidden sm:inline">•</span>
            <span className="text-xs text-neutral-500 font-medium hidden sm:inline">
              Admin Console
            </span>
          </div>
        </div>

        {/* Right controls: Realtime Pulse, Clock, Jump to Participant App, Admin Avatar */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Realtime Live Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] sm:text-xs font-medium">
            <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
            </span>
            <Radio className="w-3 h-3 text-emerald-600 hidden sm:inline" />
            <span>Live</span>
          </div>

          {/* Live Clock */}
          <span className="text-xs font-mono-tabular text-neutral-500 hidden lg:inline-block">
            {currentTime}
          </span>

          {/* Participant view quick link */}
          <Link
            href="/join"
            target="_blank"
            className="text-xs font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <span className="hidden sm:inline">Participant View</span>
            <span className="sm:hidden">Join</span>
            <ExternalLink className="w-3 h-3 text-neutral-400" />
          </Link>

          {/* Sign Out */}
          <div className="flex items-center border-l border-neutral-200 pl-2 sm:pl-3">
            <button
              onClick={() => adminSignOut()}
              title="Sign out of Admin Console"
              className="p-1.5 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer / Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-neutral-200 px-4 py-3 space-y-1 shadow-sm sticky top-14 z-20">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                  active
                    ? 'bg-neutral-900 text-white font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={cn('w-4 h-4', active ? 'text-white' : 'text-neutral-400')} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500 text-white">
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
