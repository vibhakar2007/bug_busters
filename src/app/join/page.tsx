'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { animatePageEntrance } from '@/animations/gsap';
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function JoinPage() {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);

  const [quizCode, setQuizCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    animatePageEntrance(formRef.current);

    // Auto-fill active quiz code or phone if user visited previously
    if (typeof window !== 'undefined') {
      const storedCode = localStorage.getItem('bugbusters_active_quiz_code');
      const storedPhone = localStorage.getItem('bugbusters_active_phone');
      if (storedCode) setQuizCode(storedCode);
      if (storedPhone) setPhone(storedPhone);
    }
  }, []);

  const isValidPhone = (phoneNumber: string): boolean => {
    const digits = phoneNumber.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

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
      setError('Please enter a valid phone number (at least 10 digits, e.g. 9876543210).');
      return;
    }

    setIsLoading(true);

    try {
      // Send directly to the host machine backend with tunnel bypass query params
      const joinUrl = '/api/quiz/join?ngrok-skip-browser-warning=true&bypass-tunnel-reminder=true';
      const res = await fetch(joinUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'bypass-tunnel-reminder': 'true',
        },
        body: JSON.stringify({
          name: cleanName,
          phone: cleanPhone,
          quiz_code: cleanCode,
        }),
      });

      const rawText = await res.text();
      let data: {
        success?: boolean;
        error?: string;
        isUnique?: boolean;
        isResumed?: boolean;
        participant?: {
          participant_id: number;
          name: string;
          phone: string;
          quiz_id: number;
        };
        quiz?: {
          quiz_id: number;
          title: string;
          code: string;
        };
      };

      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        console.error('Non-JSON response from host machine:', rawText.slice(0, 300));
        if (rawText.includes('ngrok') || rawText.includes('Visit Site') || rawText.includes('ERR_NGROK')) {
          throw new Error('Ngrok tunnel blocked this request. Please open the main tunnel link in your browser first and tap "Visit Site", then try again.');
        }
        if (rawText.includes('localtunnel') || rawText.includes('tunnel password') || rawText.includes('Friendly reminder')) {
          throw new Error('Localtunnel requires confirmation. Please open the main link in your browser and accept the prompt.');
        }
        if (res.status === 502 || res.status === 503 || res.status === 504 || rawText.includes('502 Bad Gateway')) {
          throw new Error(`Tunnel gateway timeout (HTTP ${res.status}). Verify that the host computer is actively running the development server.`);
        }
        throw new Error(`Host machine returned HTTP ${res.status}: ${rawText.slice(0, 80) || 'Empty response'}`);
      }

      if (!res.ok || !data.success || !data.participant || !data.quiz) {
        // Machine rejected: keep form fields intact so user does not lose typed data!
        setError(data.error || 'Authentication denied by host machine.');
        setIsLoading(false);
        return;
      }

      // Machine gave positive response!
      const participant = data.participant;
      const quiz = data.quiz;

      setSuccessMsg(data.isResumed ? 'Resuming active session...' : 'Verified! Connecting to quiz...');

      // Save credentials into both localStorage and sessionStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('bugbusters_latest_result');
        localStorage.setItem('bugbusters_active_quiz_code', quiz.code);
        localStorage.setItem('bugbusters_active_phone', participant.phone);
        localStorage.setItem('bugbusters_active_participant_id', String(participant.participant_id));
        sessionStorage.setItem('bugbusters_active_participant', JSON.stringify(participant));
        sessionStorage.setItem('bugbusters_active_quiz', JSON.stringify(quiz));
      }

      // Route directly to /quiz with query parameters to guarantee session access
      const targetUrl = `/quiz?code=${encodeURIComponent(quiz.code)}&phone=${encodeURIComponent(participant.phone)}&pid=${participant.participant_id}`;
      router.push(targetUrl);
    } catch (err: unknown) {
      console.error('Failed to communicate with host machine:', err);
      const msg = err instanceof Error ? err.message : 'Network error communicating with host machine.';
      setError(msg);
      setIsLoading(false);
    }
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950">
            Bug Busters
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Enter your details to begin the quiz.
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

            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{successMsg}</span>
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
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                required
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono-tabular text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Each phone number is validated by the host machine and allows one attempt.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2 font-semibold cursor-pointer"
            >
              {isLoading ? 'Verifying with host machine...' : 'Start Quiz'}
            </Button>
          </form>
        </Card>
      </div>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full text-center text-xs text-neutral-400 py-4">
        <span>Bug Busters Technical Symposium</span>
      </footer>
    </div>
  );
}
