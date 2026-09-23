'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils/cn';

interface QuestionPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalQuestions: number;
  currentIndex: number;
  answers: Record<number, string>;
  questionIds: number[];
  onSelectQuestion: (index: number) => void;
}

export const QuestionPaletteModal: React.FC<QuestionPaletteModalProps> = ({
  isOpen,
  onClose,
  totalQuestions,
  currentIndex,
  answers,
  questionIds,
  onSelectQuestion,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Question Palette"
      description="Quickly navigate to any question in your session."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-2.5 max-h-64 overflow-y-auto p-1">
          {Array.from({ length: totalQuestions }, (_, index) => {
            const qId = questionIds[index];
            const isAnswered = Boolean(answers[qId]);
            const isCurrent = index === currentIndex;

            return (
              <button
                key={index}
                onClick={() => {
                  onSelectQuestion(index);
                  onClose();
                }}
                className={cn(
                  'h-11 rounded-xl text-xs font-semibold font-mono-tabular transition-all flex flex-col items-center justify-center border',
                  isCurrent
                    ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm ring-2 ring-neutral-900 ring-offset-1'
                    : isAnswered
                    ? 'bg-neutral-100 border-neutral-300 text-neutral-900 hover:bg-neutral-200'
                    : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                )}
              >
                <span>{index + 1}</span>
                {isAnswered && !isCurrent && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-xs text-neutral-500 pt-3 border-t border-neutral-200">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            <span>Answered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-200 border border-neutral-300 inline-block" />
            <span>Unanswered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-900 inline-block" />
            <span>Current</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
