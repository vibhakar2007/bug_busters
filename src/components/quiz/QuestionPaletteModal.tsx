'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils/cn';
import { SessionQuestion } from '@/types/quiz';
import { isQuestionAnswered } from '@/lib/quiz/sessionEngine';
import { Check, ArrowRight } from 'lucide-react';

interface QuestionPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: SessionQuestion[];
  currentIndex: number;
  answers: Record<string | number, string>;
  onSelectQuestion: (index: number) => void;
}

export const QuestionPaletteModal: React.FC<QuestionPaletteModalProps> = ({
  isOpen,
  onClose,
  questions,
  currentIndex,
  answers,
  onSelectQuestion,
}) => {
  const totalQuestions = questions.length;
  const answeredCount = questions.filter((q) => isQuestionAnswered(q, answers)).length;
  const unansweredCount = totalQuestions - answeredCount;

  // Find first unanswered question index
  const nextUnansweredIndex = questions.findIndex((q) => !isQuestionAnswered(q, answers));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Question Palette"
      description="Quickly navigate to any question or find unanswered questions."
    >
      <div className="space-y-4">
        {/* Status progress bar summary */}
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-slate-300 font-medium">
            Progress:{' '}
            <strong className="text-[#9db40c] font-mono-tabular font-bold">
              {answeredCount}/{totalQuestions}
            </strong>{' '}
            Answered
          </span>
          {unansweredCount > 0 && nextUnansweredIndex !== -1 && (
            <button
              type="button"
              onClick={() => {
                onSelectQuestion(nextUnansweredIndex);
                onClose();
              }}
              className="text-xs font-semibold text-[#9db40c] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Next Unanswered (#{nextUnansweredIndex + 1})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 5-column Question Grid */}
        <div className="grid grid-cols-5 gap-2.5 max-h-72 overflow-y-auto p-1">
          {questions.map((q, index) => {
            const isAnswered = isQuestionAnswered(q, answers);
            const isCurrent = index === currentIndex;

            return (
              <button
                key={q.question_id || index}
                onClick={() => {
                  onSelectQuestion(index);
                  onClose();
                }}
                className={cn(
                  'h-12 rounded-xl text-xs font-black font-mono-tabular transition-all flex flex-col items-center justify-center border relative cursor-pointer',
                  isAnswered
                    ? 'bg-[#9db40c] text-[#070916] border-[#9db40c] shadow-[0_0_10px_rgba(157,180,12,0.35)] hover:brightness-105'
                    : 'bg-[#070916] border-[#283f5f]/70 text-slate-300 hover:border-slate-400 hover:bg-[#283f5f]/30',
                  isCurrent && 'ring-2 ring-white ring-offset-2 ring-offset-[#0d1224] scale-105 z-10'
                )}
                title={`Question ${index + 1}: ${isAnswered ? 'Answered' : 'Unanswered'}`}
              >
                <span>{index + 1}</span>
                {isAnswered ? (
                  <Check className="w-3 h-3 stroke-[3] mt-0.5 text-[#070916]" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-[#283f5f]/40">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-[#9db40c] border border-[#9db40c] inline-block" />
            <span className="text-white font-medium">Answered ({answeredCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-[#070916] border border-[#283f5f] inline-block" />
            <span>Unanswered ({unansweredCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-transparent border-2 border-white inline-block" />
            <span>Current</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
