'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { animatePageEntrance } from '@/animations/gsap';
import {
  CheckCircle2,
  ShieldCheck,
  HelpCircle,
  Clock,
  User,
  Phone,
  AlertTriangle,
  Check,
  Award,
} from 'lucide-react';
import { participantService } from '@/lib/api/participantService';
import { Participant } from '@/types/participant';

export default function ResultPage() {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    animatePageEntrance(containerRef.current);

    let isMounted = true;
    const loadSession = async () => {
      if (typeof window !== 'undefined') {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const qPid = urlParams.get('pid');

          // Verify with server if event is actually closed
          let actuallyClosed = false;
          try {
            const qRes = await fetch('/api/quizzes/1?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true', {
              headers: { 'Accept': 'application/json' },
            });
            if (qRes.ok) {
              const qData = await qRes.json();
              if (qData && qData.status === 'closed') {
                actuallyClosed = true;
              }
            }
          } catch {}

          setIsClosed(actuallyClosed);

          const activeParticipantId =
            qPid ||
            localStorage.getItem('bugbusters_active_participant_id') ||
            sessionStorage.getItem('bugbusters_active_participant_id');

          let p: Participant | null = null;

          if (activeParticipantId) {
            try {
              p = await participantService.getParticipant(Number(activeParticipantId));
            } catch (err) {
              console.warn('Failed direct fetch of participant:', err);
            }
          }

          if (!p) {
            const stored =
              sessionStorage.getItem('bugbusters_active_participant') ||
              localStorage.getItem('bugbusters_active_participant');
            if (stored) {
              try {
                p = JSON.parse(stored);
              } catch {}
            }
          }

          if (!p) {
            const all = await participantService.getAllParticipants();
            if (all.length > 0) {
              p = all[all.length - 1];
            }
          }

          if (isMounted && p) {
            // If the event is NOT closed, and the participant has NOT yet completed hands-on debugging,
            // immediately forward them to Hands-on Debugging so they complete their round.
            if (!actuallyClosed && (p.hands_on_score === undefined || p.hands_on_score === null)) {
              window.location.href = `/hands-on-debug?pid=${p.participant_id}`;
              return;
            }

            setParticipant(p);
          }
        } catch (err) {
          console.warn('Failed loading participant session:', err);
        }
      }
      if (isMounted) setIsLoaded(true);
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#070916] flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-8 h-8 border-2 border-[#283f5f] border-t-[#9db40c] rounded-full animate-spin" />
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="min-h-screen bg-[#070916] flex flex-col items-center justify-center p-6 text-center text-white selection:bg-[#9db40c] selection:text-[#070916]">
        <div className="w-12 h-12 rounded-2xl bg-[#0d1224] border border-[#283f5f] flex items-center justify-center text-[#9db40c] mb-4">
          <HelpCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">No Submission Found</h2>
        <p className="text-sm text-slate-400 mt-2 max-w-sm">
          No recently submitted test session was detected on this device.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link href="/join">
            <Button variant="primary" size="md">
              Join Quiz
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
      className="min-h-screen bg-[#070916] text-white flex flex-col justify-between selection:bg-[#9db40c] selection:text-[#070916] px-4 py-8 sm:py-12"
    >
      {/* Top Header */}
      <header className="max-w-2xl mx-auto w-full flex items-center justify-between pb-6 border-b border-[#283f5f]/40">
        <div className="flex items-center gap-2.5">
          <span className="font-extrabold text-lg text-white tracking-tight">Bug Busters</span>
        </div>
        <Badge variant="success" dot>
          Submitted
        </Badge>
      </header>

      {/* Main Thank You Container */}
      <main className="max-w-2xl mx-auto w-full my-8 space-y-6">
        {/* Event Closed Banner if applicable */}
        {isClosed && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-950/60 border border-amber-600/60 text-amber-200 text-sm shadow-lg">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold block text-white">Event Concluded</span>
              <span className="text-xs text-amber-200/90">
                The administrator has closed the event. All responses and submissions have been finalized.
              </span>
            </div>
          </div>
        )}

        {/* Primary Thank You Card */}
        <Card className="p-6 sm:p-10 space-y-8 bg-[#0d1224] border border-[#283f5f]/60 shadow-2xl text-center">
          {/* Big Check Circle Icon */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-[#9db40c]/15 border-2 border-[#9db40c] flex items-center justify-center text-[#9db40c] shadow-[0_0_30px_rgba(157,180,12,0.3)] mb-5">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Thank You for Participating!
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mt-2 max-w-md">
              Your answers and debugging challenges have been recorded successfully.
            </p>
          </div>

          {/* Participant Verification Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#070916] border border-[#283f5f]/70 text-left space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#283f5f]/40">
              <div className="flex items-center gap-2 text-slate-300 text-xs sm:text-sm">
                <User className="w-4 h-4 text-[#9db40c]" />
                <span className="text-slate-400">Participant:</span>
                <strong className="text-white font-semibold">{participant.name}</strong>
              </div>
              <Badge variant="success" size="sm">
                Completed
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300 font-mono-tabular">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">Registration:</span>
                <span className="text-white">{participant.phone}</span>
              </div>
              {participant.time_taken_formatted && (
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400">Time Taken:</span>
                  <span className="text-white">{participant.time_taken_formatted}</span>
                </div>
              )}
            </div>
          </div>

          {/* Completed Rounds Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            <div className="p-3.5 rounded-xl bg-[#070916] border border-[#283f5f]/50 flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#9db40c]/20 border border-[#9db40c] flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-[#9db40c] stroke-[3]" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Quiz Questions</span>
                <span className="text-[11px] text-slate-400">MCQ &amp; Debug recorded</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#070916] border border-[#283f5f]/50 flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#9db40c]/20 border border-[#9db40c] flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-[#9db40c] stroke-[3]" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Hands-On Debug</span>
                <span className="text-[11px] text-slate-400">Code submissions recorded</span>
              </div>
            </div>
          </div>

          {/* Evaluator Announcement Callout */}
          <div className="p-4 rounded-xl bg-[#031c6c]/30 border border-[#283f5f] text-xs text-slate-300 leading-relaxed text-left flex items-start gap-3">
            <Award className="w-5 h-5 text-[#9db40c] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block mb-0.5">Evaluation In Progress</span>
              <span>
                All responses have been submitted to the central server. The event coordinators and judges are reviewing submissions. Final results and prize winners will be declared at the valedictory ceremony.
              </span>
            </div>
          </div>

          {/* Action CTA */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="w-full sm:w-56 font-bold shadow-md cursor-pointer">
                Return to Home
              </Button>
            </Link>
          </div>

          {/* Security Telemetry Footer inside card */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-3 border-t border-[#283f5f]/40 font-mono-tabular">
            <ShieldCheck className="w-4 h-4 text-[#9db40c]" />
            <span>Telemetry &amp; Submission Verified</span>
          </div>
        </Card>
      </main>

      {/* Page Footer */}
      <footer className="max-w-2xl mx-auto w-full text-center text-xs text-slate-500 pt-6 border-t border-[#283f5f]/40">
        BugBusters Platform • Technica Symposium 2026
      </footer>
    </div>
  );
}
