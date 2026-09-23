'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { quizService } from '@/lib/api/quizService';
import { participantService } from '@/lib/api/participantService';
import { animatePageEntrance } from '@/animations/gsap';
import { ArrowLeft, Shield, AlertCircle, Sparkles, Check } from 'lucide-react';

export default function JoinPage() {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);

  const [quizCode, setQuizCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    animatePageEntrance(formRef.current);
  }, []);

  const isValidPhone = (phoneNumber: string): boolean => {
    const digits = phoneNumber.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = quizCode.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanCode) {
      setError('Please enter a Quiz Code.');
      return;
    }

    if (!cleanName) {
      setError('Please enter your full name.');
      return;
    }

    if (!cleanPhone) {
      setError('Phone number is required.');
      return;
    }

    if (!isValidPhone(cleanPhone)) {
      setError('Please enter a valid phone number (at least 10 digits, e.g. +91 98765 43210).');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Verify quiz exists and is live
      const quiz = await quizService.getQuizByCode(cleanCode);
      if (!quiz) {
        setError(`This quiz code "${cleanCode}" isn't valid. Please verify with the event coordinator.`);
        setIsLoading(false);
        return;
      }

      if (quiz.status === 'closed') {
        setError('This quiz is closed and no longer accepting participants.');
        setIsLoading(false);
        return;
      }

      if (quiz.status === 'draft') {
        setError('This quiz is currently in draft mode and has not been launched by the administrator yet.');
        setIsLoading(false);
        return;
      }

      // 2. Check if this phone number already completed this quiz
      const existingParticipant = await participantService.getParticipantByPhone(cleanPhone, quiz.quiz_id);
      if (existingParticipant && existingParticipant.status === 'completed') {
        setError('You have already completed this quiz with this phone number. Re-attempts are not permitted.');
        setIsLoading(false);
        return;
      }

      // 3. Create or resume participant
      const participant = await participantService.createParticipant({
        name: cleanName,
        phone: cleanPhone,
        quiz_id: quiz.quiz_id,
      });

      // 4. Save active keys for session restoration in browser
      if (typeof window !== 'undefined') {
        localStorage.setItem('bugbusters_active_quiz_code', cleanCode);
        localStorage.setItem('bugbusters_active_phone', cleanPhone);
        localStorage.setItem('bugbusters_active_participant_id', String(participant.participant_id));
      }

      // 5. Navigate directly to /quiz
      router.push('/quiz');
    } catch (err: unknown) {
      console.error('Failed to join quiz:', err);
      const msg = err instanceof Error ? err.message : 'An error occurred while connecting. Please try again.';
      setError(msg);
      setIsLoading(false);
    }
  };

  const applyPreset = (code: string, sampleName: string, samplePhone: string) => {
    setQuizCode(code);
    setName(sampleName);
    setPhone(samplePhone);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between selection:bg-neutral-900 selection:text-white px-4 py-6 sm:py-10">
      {/* Top Header */}
      <div className="max-w-md mx-auto w-full flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
        <span className="text-xs font-mono-tabular text-neutral-400">Technica Symposium</span>
      </div>

      {/* Main Join Form */}
      <div ref={formRef} className="max-w-md mx-auto w-full my-auto py-6">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-neutral-900 text-white rounded-2xl flex items-center justify-center font-bold text-lg mx-auto shadow-sm mb-4">
            BB
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">
            BUGBUSTERS
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 mt-1">
            Enter the challenge
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Enter your symposium quiz credentials to begin your timed attempt.
          </p>
        </div>

        <Card className="p-6 sm:p-8">
          <form onSubmit={handleJoin} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-900 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Quiz Code */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Quiz Code
              </label>
              <input
                type="text"
                value={quizCode}
                onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
                placeholder="TECH26"
                maxLength={10}
                required
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono-tabular font-bold tracking-wider text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all uppercase"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  required
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono-tabular text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
                />
              </div>
              <span className="text-[11px] text-neutral-400 mt-1 block">
                Used to verify attempt integrity (no duplicate attempts allowed)
              </span>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full text-sm font-semibold"
                isLoading={isLoading}
              >
                Enter Quiz
              </Button>
            </div>
          </form>

          {/* Quick Presets for Demo */}
          <div className="mt-6 pt-5 border-t border-neutral-100">
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-2.5 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick Demo Fill</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('TECH26', 'Vibhakar S', '+91 98765 43210')}
                className="text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-3 py-1.5 rounded-lg font-mono-tabular flex items-center gap-1 transition-colors"
              >
                <Check className="w-3 h-3 text-neutral-500" />
                TECH26 • Vibhakar
              </button>
              <button
                type="button"
                onClick={() => applyPreset('TECH26', 'Rahul Mehta', '+91 98450 12345')}
                className="text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-3 py-1.5 rounded-lg font-mono-tabular flex items-center gap-1 transition-colors"
              >
                <Check className="w-3 h-3 text-neutral-500" />
                TECH26 • Rahul
              </button>
            </div>
          </div>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-neutral-400 text-center font-normal">
          <Shield className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span>Browser focus loss and tab-switch telemetry active during session.</span>
        </div>
      </div>

      {/* Bottom Footer */}
      <footer className="max-w-md mx-auto w-full text-center text-xs text-neutral-400">
        BugBusters Platform • Technica Symposium
      </footer>
    </div>
  );
}
