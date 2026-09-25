'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalQuestions: number;
  answeredCount: number;
  unansweredIndices?: number[];
  onJumpToQuestion?: (index: number) => void;
  isSubmitting: boolean;
}

export const SubmitModal: React.FC<SubmitModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  totalQuestions,
  answeredCount,
  unansweredIndices = [],
  onJumpToQuestion,
  isSubmitting,
}) => {
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Continue"
      description="Review your progress before continuing."
    >
      <div className="space-y-4">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-[#070916] border border-[#283f5f]/60">
            <span className="text-xs text-slate-400 font-medium block">Answered</span>
            <span className="text-xl font-bold text-[#9db40c] font-mono-tabular">
              {answeredCount} / {totalQuestions}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#070916] border border-[#283f5f]/60">
            <span className="text-xs text-slate-400 font-medium block">Unanswered</span>
            <span className="text-xl font-bold text-slate-200 font-mono-tabular">
              {unansweredCount}
            </span>
          </div>
        </div>

        {/* Warning or Success Message */}
        {unansweredCount > 0 ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                You still have <strong>{unansweredCount} unanswered questions</strong>. Once you proceed, you cannot change your answers.
              </span>
            </div>

            {/* List unanswered question jump chips */}
            {unansweredIndices.length > 0 && onJumpToQuestion && (
              <div className="p-3 rounded-xl bg-[#070916] border border-[#283f5f]/50">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Unanswered Questions (Click to jump):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {unansweredIndices.map((qNum) => (
                    <button
                      key={qNum}
                      type="button"
                      onClick={() => {
                        onJumpToQuestion(qNum - 1);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono-tabular font-bold bg-[#283f5f]/40 border border-[#283f5f] text-[#9db40c] hover:bg-[#9db40c] hover:text-[#070916] transition-colors cursor-pointer"
                    >
                      #{qNum}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#031c6c]/40 border border-[#9db40c]/50 text-slate-200 text-xs leading-relaxed">
            <CheckCircle2 className="w-5 h-5 text-[#9db40c] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#9db40c] block text-sm font-semibold">
                All {totalQuestions} questions answered!
              </strong>
              <span>You are ready to continue.</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#283f5f]/40">
          <Button variant="outline" size="md" onClick={onClose} disabled={isSubmitting}>
            Keep Answering
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => onConfirm()}
            isLoading={isSubmitting}
            className="font-bold cursor-pointer"
          >
            Continue
          </Button>
        </div>
      </div>
    </Modal>
  );
};
