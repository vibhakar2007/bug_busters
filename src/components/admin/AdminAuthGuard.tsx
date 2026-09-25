'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const AUTH_KEY = 'bugbusters_admin_auth';

export function adminSignOut() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_KEY);
    window.dispatchEvent(new Event('admin_auth_changed'));
  }
}

export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    sessionStorage.getItem(AUTH_KEY) === 'true' ||
    localStorage.getItem(AUTH_KEY) === 'true'
  );
}

export const AdminAuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(isAdminAuthenticated());
      setIsChecking(false);
    };

    checkAuth();

    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener('admin_auth_changed', handleAuthChange);
    return () => {
      window.removeEventListener('admin_auth_changed', handleAuthChange);
    };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (cleanUser === 'admin' && cleanPass === 'root') {
      sessionStorage.setItem(AUTH_KEY, 'true');
      localStorage.setItem(AUTH_KEY, 'true');
      setIsAuthenticated(true);
      setError(null);
      setIsSubmitting(false);
    } else {
      setTimeout(() => {
        setError('Invalid username or password. Please verify admin credentials.');
        setIsSubmitting(false);
      }, 250);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#070916] flex flex-col items-center justify-center p-6">
        <div className="w-8 h-8 border-2 border-[#283f5f] border-t-[#9db40c] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070916] flex flex-col justify-between selection:bg-[#9db40c] selection:text-[#070916] px-4 py-8 sm:py-12">
        {/* Top return link */}
        <div className="max-w-md mx-auto w-full">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Home</span>
          </Link>
        </div>

        {/* Login Card */}
        <div className="max-w-md mx-auto w-full my-auto py-6">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-[#031c6c] text-[#9db40c] border border-[#283f5f] rounded-2xl flex items-center justify-center font-bold text-lg mx-auto shadow-sm mb-4">
              <Lock className="w-5 h-5 text-[#9db40c]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Bug Busters Admin
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Sign in with your administrator credentials.
            </p>
          </div>

          <Card className="p-6 sm:p-8 shadow-md border-[#283f5f]">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-[#070916] border border-[#283f5f] rounded-xl text-sm font-mono-tabular text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#9db40c] transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 bg-[#070916] border border-[#283f5f] rounded-xl text-sm font-mono-tabular text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#9db40c] transition-all"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full text-sm font-bold cursor-pointer"
                  isLoading={isSubmitting}
                >
                  Sign In to Admin Console
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-5 border-t border-[#283f5f]/60 flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-[#9db40c]" />
              <span>Protected symposium administrative gateway</span>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <footer className="max-w-md mx-auto w-full text-center text-xs text-slate-500">
          BugBusters Platform • Technica Symposium 2026
        </footer>
      </div>
    );
  }

  return <>{children}</>;
};
