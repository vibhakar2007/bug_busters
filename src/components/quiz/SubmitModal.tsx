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
  isSubmitting: boolean;
}

export const SubmitModal: React.FC<SubmitModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  totalQuestions,
  answeredCount,
  isSubmitting,
}) => {
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Quiz?"
      description="Please review your progress before finalizing your submission."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
            <span className="text-xs text-neutral-500 font-medium block">Answered</span>
            <span className="text-lg font-bold text-neutral-900 font-mono-tabular">
              {answeredCount} / {totalQuestions}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
            <span className="text-xs text-neutral-500 font-medium block">Unanswered</span>
            <span className="text-lg font-bold text-neutral-900 font-mono-tabular">
              {unansweredCount}
            </span>
          </div>
        </div>

        {unansweredCount > 0 ? (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              You still have <strong>{unansweredCount} unanswered questions</strong>. Once submitted,
              you cannot change your answers.
            </span>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs leading-relaxed">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>All questions have been answered. You are ready to submit!</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
          <Button variant="outline" size="md" onClick={onClose} disabled={isSubmitting}>
            Keep Answering
          </Button>
          <Button variant="primary" size="md" onClick={onConfirm} isLoading={isSubmitting}>
            Confirm & Submit
          </Button>
        </div>
      </div>
    </Modal>
  );
};
