'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  Users,
  Activity,
  Award,
  ArrowLeft,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { adminSignOut } from '@/components/admin/AdminAuthGuard';

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Overview',
      href: '/admin',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: 'Quizzes',
      href: '/admin/quizzes',
      icon: Layers,
      exact: false,
    },
    {
      label: 'Live Monitor',
      href: '/admin/monitor',
      icon: Activity,
      exact: true,
      badge: 'LIVE',
    },
    {
      label: 'Participants',
      href: '/admin/participants',
      icon: Users,
      exact: true,
    },
    {
      label: 'Results',
      href: '/admin/results',
      icon: Award,
      exact: true,
    },
  ];

  const isActive = (item: (typeof navItems)[0]) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <aside className="w-64 bg-[#060B07] border-r border-[#283F5F]/50 flex flex-col justify-between h-screen sticky top-0">
      {/* Brand Header */}
      <div>
        <div className="h-16 px-6 flex items-center border-b border-[#283F5F]/40 gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#031C6C] border border-[#283F5F] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#9DB40C]" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight text-white leading-tight">
              Bug Busters
            </span>
            <span className="text-[11px] text-[#9DB40C] font-semibold">
              Admin Console
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  active
                    ? 'bg-[#031C6C] text-[#9DB40C] border border-[#283F5F] shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-[#283F5F]/20'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn('w-4 h-4', active ? 'text-[#9DB40C]' : 'text-slate-400')}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider',
                      active
                        ? 'bg-[#9DB40C] text-black'
                        : 'bg-[#9DB40C]/20 text-[#9DB40C] border border-[#9DB40C]/30'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Return & Sign Out CTA */}
      <div className="p-3 border-t border-[#283F5F]/40 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-[#9DB40C] px-3 py-2 rounded-lg hover:bg-[#283F5F]/20 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Landing Page</span>
        </Link>

        <button
          onClick={() => adminSignOut()}
          className="w-full flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-rose-400 px-3 py-2 rounded-lg hover:bg-rose-950/40 transition-colors cursor-pointer text-left"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
