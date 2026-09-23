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
    <aside className="w-64 bg-neutral-50/50 border-r border-neutral-200/80 flex flex-col justify-between h-screen sticky top-0">
      {/* Brand Header */}
      <div>
        <div className="h-16 px-6 flex items-center border-b border-neutral-200/80">
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-neutral-900 leading-tight">
              Bug Busters
            </span>
            <span className="text-[11px] text-neutral-400 font-medium">
              Admin Console
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  active
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn('w-4 h-4', active ? 'text-white' : 'text-neutral-500')}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider',
                      active
                        ? 'bg-emerald-500 text-neutral-950'
                        : 'bg-emerald-100 text-emerald-800'
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
      <div className="p-3 border-t border-neutral-200/80 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-medium text-neutral-500 hover:text-neutral-900 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Landing Page</span>
        </Link>

        <button
          onClick={() => adminSignOut()}
          className="w-full flex items-center gap-2 text-xs font-medium text-neutral-500 hover:text-rose-600 px-3 py-2 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer text-left"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
