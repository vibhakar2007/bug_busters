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
        className="bg-rose-50 border border-rose-200 text-rose-950 p-4 rounded-2xl shadow-lg flex items-start gap-3"
      >
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="flex-1 text-xs sm:text-sm">
          <div className="font-semibold text-rose-900 flex items-center justify-between">
            <span>Security Warning</span>
            <span className="text-xs bg-rose-200 text-rose-800 font-bold px-1.5 py-0.5 rounded">
              Violation #{violationCount}
            </span>
          </div>
          <p className="mt-1 text-rose-800 leading-relaxed">{warning.message}</p>
          <p className="mt-1 text-[11px] text-rose-600">
            All focus losses and tab switches are logged to the symposium invigilator console.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-rose-500 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
