'use client';

import React from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-[#070916] text-white flex selection:bg-[#9db40c] selection:text-[#070916]">
        {/* Sidebar (Desktop) */}
        <div className="hidden md:block shrink-0">
          <AdminSidebar />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader />
          <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-7xl w-full mx-auto min-w-0">{children}</main>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
