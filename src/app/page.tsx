'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
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
        <div className="flex items-center">
          <span className="font-bold text-lg sm:text-xl tracking-tight text-neutral-950">
            Bug Busters
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-medium border border-neutral-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Quiz Active</span>
          </div>
        </div>
      </header>

      {/* Main hero section */}
      <main className="w-full max-w-2xl mx-auto px-6 py-16 sm:py-24 flex flex-col items-center text-center my-auto">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-neutral-950 leading-tight">
          Bug Busters
        </h1>

        <p className="mt-3 text-lg sm:text-xl text-neutral-600 font-normal">
          Competitive Technical Quiz
        </p>

        <p className="mt-3 text-sm text-neutral-500 max-w-md">
          Answer randomized questions. Enter your details to begin.
        </p>

        {/* Primary CTA */}
        <div className="mt-8 flex items-center justify-center w-full sm:w-auto">
          <Link
            href="/join"
            className="w-full sm:w-auto h-12 px-8 rounded-xl bg-neutral-900 text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-[0.98] transition-all shadow-sm"
          >
            <span>Start Quiz</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Simple details pills */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-neutral-500">
          <span className="px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200/60">40 Questions</span>
          <span className="px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200/60">Cash Prizes</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-6 h-16 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
        <span>Bug Busters</span>
        <span>Technical Symposium</span>
      </footer>
    </div>
  );
}
