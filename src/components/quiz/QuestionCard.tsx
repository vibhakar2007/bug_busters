'use client';

import React from 'react';
import { SessionQuestion } from '@/types/quiz';
import { Badge } from '@/components/ui/Badge';
import { Code2 } from 'lucide-react';

interface QuestionCardProps {
  question: SessionQuestion;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question }) => {
  return (
    <div className="space-y-4">
      {/* Category Pill */}
      {question.category && (
        <div className="flex items-center gap-2">
          <Badge variant="neutral" size="sm">
            {question.category}
          </Badge>
        </div>
      )}

      {/* Main Question Text */}
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-neutral-900 leading-snug tracking-tight">
        {question.question}
      </h2>

      {/* Code Snippet Box (if present) */}
      {question.code_snippet && (
        <div className="rounded-xl overflow-hidden border border-neutral-800 bg-[#0d1117] text-neutral-100 shadow-sm text-xs sm:text-sm font-mono-tabular">
          <div className="px-4 py-2 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-neutral-400 text-xs">
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-neutral-400" />
              <span>Snippet</span>
            </div>
            <span className="text-[11px] text-neutral-500">Read-only</span>
          </div>
          <pre className="p-4 overflow-x-auto leading-relaxed text-neutral-200">
            <code>{question.code_snippet}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
