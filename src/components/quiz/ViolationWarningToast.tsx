'use client';

import React, { useEffect, useRef } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { ViolationToastState } from '@/hooks/useViolationMonitor';
import { animateViolationAlert } from '@/animations/gsap';

interface ViolationWarningToastProps {
  warning: ViolationToastState | null;
  violationCount: number;
  onDismiss: () => void;
}

export const ViolationWarningToast: React.FC<ViolationWarningToastProps> = ({
  warning,
  violationCount,
  onDismiss,
}) => {
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (warning && toastRef.current) {
      animateViolationAlert(toastRef.current);
    }
  }, [warning]);

  if (!warning) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-auto">
      <div
        ref={toastRef}
        className="bg-[#0d1224] border border-rose-500/60 text-rose-200 p-4 rounded-2xl shadow-2xl flex items-start gap-3 backdrop-blur-md"
      >
        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="flex-1 text-xs sm:text-sm">
          <div className="font-semibold text-rose-300 flex items-center justify-between">
            <span>Security Warning</span>
            <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold px-2 py-0.5 rounded-md font-mono-tabular">
              Violation #{violationCount}
            </span>
          </div>
          <p className="mt-1 text-rose-200 leading-relaxed">{warning.message}</p>
          <p className="mt-1 text-[11px] text-rose-400 font-mono-tabular">
            All focus losses and tab switches are logged to the symposium invigilator console.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-rose-500/20 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
