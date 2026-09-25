'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, Trophy, Clock, HelpCircle, Sparkles } from 'lucide-react';
import { animatePageEntrance } from '@/animations/gsap';

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    animatePageEntrance(containerRef.current);
  }, []);

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#070916] text-white flex flex-col justify-between selection:bg-[#9db40c] selection:text-[#070916]"
    >
      {/* Top minimal header */}
      <header className="w-full max-w-5xl mx-auto px-6 h-20 flex items-center justify-between border-b border-[#283f5f]/30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#031c6c] border border-[#283f5f] flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-[#9db40c]" />
          </div>
          <span className="font-black text-xl tracking-tight text-white">
            Bug Busters
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0d1224] text-[#9db40c] text-xs font-bold border border-[#9db40c]/40 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9db40c] animate-pulse" />
            <span>Quiz Active</span>
          </div>
        </div>
      </header>

      {/* Main hero section */}
      <main className="w-full max-w-2xl mx-auto px-6 py-16 sm:py-24 flex flex-col items-center text-center my-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#031c6c]/40 border border-[#283f5f] text-slate-200 text-xs font-semibold mb-6">
          <Trophy className="w-3.5 h-3.5 text-[#9db40c]" />
          <span>Technica Symposium 2026</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
          Bug Busters
        </h1>

        <p className="mt-3 text-lg sm:text-xl text-slate-300 font-medium">
          Competitive Technical Quiz
        </p>

        <p className="mt-3 text-sm text-slate-400 max-w-md leading-relaxed">
          Answer randomized questions across Quiz &amp; Debugging challenges. Enter your details to begin.
        </p>

        {/* Primary CTA */}
        <div className="mt-8 flex items-center justify-center w-full sm:w-auto">
          <Link
            href="/join"
            className="w-full sm:w-auto h-12 px-8 rounded-xl bg-[#9db40c] text-[#070916] font-black text-sm flex items-center justify-center gap-2 hover:bg-[#b0c90e] hover:shadow-[0_0_20px_rgba(157,180,12,0.45)] active:scale-[0.98] transition-all shadow-md cursor-pointer"
          >
            <span>Start Quiz</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </Link>
        </div>

        {/* Event Details Pills */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-xs text-slate-300 font-semibold">
          <span className="px-3.5 py-1.5 rounded-full bg-[#0d1224] border border-[#283f5f]/70 flex items-center gap-1.5 shadow-xs">
            <HelpCircle className="w-3.5 h-3.5 text-[#9db40c]" />
            <span>40 Questions</span>
          </span>
          <span className="px-3.5 py-1.5 rounded-full bg-[#0d1224] border border-[#283f5f]/70 flex items-center gap-1.5 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-[#9db40c]" />
            <span>1:30 Hours</span>
          </span>
          <span className="px-3.5 py-1.5 rounded-full bg-[#0d1224] border border-[#283f5f]/70 flex items-center gap-1.5 shadow-xs">
            <Trophy className="w-3.5 h-3.5 text-[#9db40c]" />
            <span>Cash Prizes</span>
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-6 h-16 border-t border-[#283f5f]/30 flex items-center justify-between text-xs text-slate-500">
        <span>Bug Busters</span>
        <span>Technical Symposium</span>
      </footer>
    </div>
  );
}
