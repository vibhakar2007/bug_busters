'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ParticipantResult } from '@/types/participant';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { animatePageEntrance, animateResultReveal } from '@/animations/gsap';
import {
  AlertTriangle,
  ShieldCheck,
  HelpCircle,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { participantService } from '@/lib/api/participantService';

export default function ResultPage() {
  const [result, setResult] = useState<ParticipantResult | null>(null);
  const [displayedScore, setDisplayedScore] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    animatePageEntrance(containerRef.current);

    let isMounted = true;
    const loadResult = async () => {
      if (typeof window !== 'undefined') {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const qPid = urlParams.get('pid');
          const activeParticipantId =
            qPid ||
            localStorage.getItem('bugbusters_active_participant_id') ||
            sessionStorage.getItem('bugbusters_active_participant_id');

          const stored =
            localStorage.getItem('bugbusters_latest_result') ||
            sessionStorage.getItem('bugbusters_latest_result');

          let parsed: ParticipantResult | null = null;

          if (stored) {
            try {
              const obj: ParticipantResult = JSON.parse(stored);
              if (!activeParticipantId || String(obj.participant_id) === String(activeParticipantId)) {
                parsed = obj;
              }
            } catch {
              // ignore parse errors
            }
          }

          if (!parsed && activeParticipantId) {
            try {
              const res = await fetch('/api/results?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true', {
                headers: {
                  'Accept': 'application/json',
                  'ngrok-skip-browser-warning': 'true',
                  'bypass-tunnel-reminder': 'true',
                },
              });
              if (res.ok) {
                const text = await res.text();
                const allResults: ParticipantResult[] = JSON.parse(text);
                const found = allResults.find((r) => String(r.participant_id) === String(activeParticipantId));
                if (found) parsed = found;
              }
            } catch {
              // fallback to service
            }
            if (!parsed) {
              parsed = await participantService.getParticipantResult(Number(activeParticipantId));
            }
          }

          if (isMounted && parsed) {
            setResult(parsed);
            setDisplayedScore(parsed.score);
          }
        } catch (err) {
          console.warn('Failed to load result:', err);
        }
      }
      if (isMounted) setIsLoaded(true);
    };

    loadResult();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (result) {
      if (scoreRef.current) {
        animateResultReveal(scoreRef.current, result.score, (val) => {
          setDisplayedScore(val);
        });
      }
    }
  }, [result]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-500 mb-4">
          <HelpCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900">No Result Found</h2>
        <p className="text-sm text-neutral-500 mt-2 max-w-sm">
          No recently submitted quiz session was detected on this device.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link href="/join">
            <Button variant="primary" size="md">
              Join a Quiz
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="md">
              Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-white flex flex-col justify-between selection:bg-neutral-900 selection:text-white px-4 py-8 sm:py-12"
    >
      {/* Top Header */}
      <div className="max-w-2xl mx-auto w-full flex items-center justify-between pb-6 border-b border-neutral-100">
        <div className="flex items-center">
          <span className="font-bold text-base sm:text-lg text-neutral-950 tracking-tight">Bug Busters</span>
        </div>
        <Badge variant="success" dot>
          Completed
        </Badge>
      </div>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto w-full my-8 space-y-8">
        {/* Header Title */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-neutral-950 tracking-tight">
            Quiz Completed
          </h1>
          <p className="text-sm text-neutral-500 mt-1.5">
            Participant: <strong className="text-neutral-900 font-semibold">{result.name}</strong> •{' '}
            <span className="font-mono-tabular">{result.phone}</span>
          </p>
        </div>

        {/* Primary Scorecard */}
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="text-center pb-6 border-b border-neutral-100">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
              Final Score
            </span>
            <div className="flex items-baseline justify-center gap-2">
              <span
                ref={scoreRef}
                className="text-6xl sm:text-7xl font-bold tracking-tight text-neutral-950 font-mono-tabular"
              >
                {displayedScore > 0 ? displayedScore : result.score}
              </span>
              <span className="text-2xl sm:text-3xl font-medium text-neutral-400 font-mono-tabular">
                / {result.total_questions}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-center text-xs font-medium text-neutral-500">
              <span className="bg-neutral-100 px-3 py-1 rounded-full text-neutral-800 font-mono-tabular font-semibold">
                {result.percentage}% Accuracy
              </span>
            </div>
          </div>

          {/* Metric Grid: Right & Wrong */}
          <div className="grid grid-cols-2 gap-4">
            {/* Right */}
            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 text-center shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-emerald-800 text-xs sm:text-sm font-semibold mb-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Right Answers</span>
              </div>
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-950 font-mono-tabular">
                {result.correct_count}
              </span>
            </div>

            {/* Wrong */}
            <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200/90 text-center shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-rose-800 text-xs sm:text-sm font-semibold mb-1.5">
                <X className="w-4 h-4 text-rose-600" />
                <span>Wrong Answers</span>
              </div>
              <span className="text-3xl sm:text-4xl font-extrabold text-rose-950 font-mono-tabular">
                {Math.max(0, (result.total_questions || 40) - result.correct_count)}
              </span>
            </div>
          </div>

          {/* Security Violations if present */}
          {result.violation_count > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>
                <strong>{result.violation_count} security violation(s)</strong> were recorded during your quiz attempt.
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 font-mono-tabular">
            <span>Quiz: {result.quiz_title}</span>
            <span className="flex items-center gap-1 text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
              Verified Telemetry
            </span>
          </div>

          <div className="pt-2 flex items-center justify-center">
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="w-full sm:w-48 shadow-xs">
                Return to Home
              </Button>
            </Link>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="max-w-2xl mx-auto w-full text-center text-xs text-neutral-400 pt-8 border-t border-neutral-100">
        BugBusters Platform • Technica Symposium Results
      </footer>
    </div>
  );
}
