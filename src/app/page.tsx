'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Cpu, Terminal, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { animatePageEntrance } from '@/animations/gsap';

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    animatePageEntrance(containerRef.current);
  }, []);

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-white text-neutral-900 flex flex-col justify-between selection:bg-neutral-900 selection:text-white"
    >
      {/* Top minimal header */}
      <header className="w-full max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
            BB
          </div>
          <span className="font-semibold text-base tracking-tight text-neutral-950">
            BugBusters
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-medium border border-neutral-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Round 1 System Live</span>
          </div>

          <Link
            href="/admin"
            className="text-xs font-medium text-neutral-600 hover:text-neutral-950 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            Admin Portal
          </Link>
        </div>
      </header>

      {/* Main hero section */}
      <main className="w-full max-w-4xl mx-auto px-6 py-12 sm:py-20 flex flex-col items-center text-center">
        {/* Event Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100 border border-neutral-200/70 text-neutral-800 text-xs font-medium tracking-wide mb-8 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-neutral-600" />
          <span>Technical Symposium • Round 1</span>
        </div>

        {/* Big Apple Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-neutral-950 max-w-2xl leading-[1.05]">
          BUGBUSTERS
        </h1>

        {/* Editorial Subtitle */}
        <p className="mt-4 text-xl sm:text-2xl font-normal text-neutral-600 tracking-tight">
          &ldquo;Think fast. Debug faster.&rdquo;
        </p>

        <p className="mt-4 text-sm sm:text-base text-neutral-500 max-w-lg leading-relaxed font-normal">
          Competitive timed evaluation. Randomized technical MCQs, algorithmic challenges, and anti-cheating browser telemetry.
        </p>

        {/* Primary and Secondary CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
          <Link
            href="/join"
            className="w-full sm:w-auto h-13 px-8 rounded-xl bg-neutral-900 text-white font-medium text-sm flex items-center justify-center gap-2.5 hover:bg-neutral-800 active:scale-[0.98] transition-all shadow-sm border border-neutral-900"
          >
            <span>Join Quiz</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/admin"
            className="w-full sm:w-auto h-13 px-7 rounded-xl bg-neutral-100 text-neutral-900 font-medium text-sm flex items-center justify-center gap-2 hover:bg-neutral-200 active:scale-[0.98] transition-all border border-neutral-200/80"
          >
            <span>Admin Dashboard</span>
          </Link>
        </div>

        {/* Minimal visual representation of the quiz system */}
        <div className="mt-16 w-full max-w-2xl">
          <div className="rounded-2xl border border-neutral-200/90 bg-neutral-50/50 p-5 sm:p-6 shadow-sm text-left">
            {/* Mock Top bar */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200/80 text-xs text-neutral-500">
              <div className="flex items-center gap-2 font-mono-tabular">
                <span className="font-semibold text-neutral-900">Question 04 / 25</span>
                <span className="text-neutral-300">•</span>
                <span>JavaScript Memory & Scope</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono-tabular font-semibold text-neutral-800 bg-white px-2.5 py-1 rounded-lg border border-neutral-200">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                <span>14:22</span>
              </div>
            </div>

            {/* Mock Question Preview */}
            <div className="mt-5 space-y-3">
              <p className="text-sm sm:text-base font-semibold text-neutral-900 leading-snug">
                What is the time complexity of searching for an element in an unindexed B-Tree vs Hash Map?
              </p>

              {/* Mock 4 options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <div className="p-3 rounded-xl border border-neutral-200 bg-white text-xs flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-neutral-100 text-neutral-600 font-bold flex items-center justify-center shrink-0">
                    A
                  </span>
                  <span className="text-neutral-700">O(log N) vs O(1)</span>
                </div>

                <div className="p-3 rounded-xl border border-neutral-900 bg-neutral-900 text-white text-xs flex items-center gap-3 shadow-xs">
                  <span className="w-6 h-6 rounded-lg bg-white text-neutral-900 font-bold flex items-center justify-center shrink-0">
                    B
                  </span>
                  <span className="text-neutral-100 font-medium">O(N) vs O(log N)</span>
                  <CheckCircle2 className="w-4 h-4 ml-auto text-white/70" />
                </div>

                <div className="p-3 rounded-xl border border-neutral-200 bg-white text-xs flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-neutral-100 text-neutral-600 font-bold flex items-center justify-center shrink-0">
                    C
                  </span>
                  <span className="text-neutral-700">O(1) vs O(N)</span>
                </div>

                <div className="p-3 rounded-xl border border-neutral-200 bg-white text-xs flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-neutral-100 text-neutral-600 font-bold flex items-center justify-center shrink-0">
                    D
                  </span>
                  <span className="text-neutral-700">O(N log N) vs O(1)</span>
                </div>
              </div>
            </div>

            {/* Micro badges below preview */}
            <div className="mt-5 pt-4 border-t border-neutral-200/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-neutral-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Anti-Cheating Telemetry Active
                </span>
                <span className="flex items-center gap-1 hidden sm:flex">
                  <Cpu className="w-3.5 h-3.5 text-neutral-400" />
                  Randomized Option Order
                </span>
              </div>
              <span className="font-mono-tabular">Live Session Ready</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-6 h-16 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-neutral-400" />
          <span>BugBusters Quiz Platform</span>
        </div>
        <span>College Technical Symposium 2026</span>
      </footer>
    </div>
  );
}
