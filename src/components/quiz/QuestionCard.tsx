'use client';

import React from 'react';
import { SessionQuestion } from '@/types/quiz';
import { Badge } from '@/components/ui/Badge';
import { Code2, Terminal } from 'lucide-react';

interface QuestionCardProps {
  question: SessionQuestion;
  onSwitchLanguage?: (language: string) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onSwitchLanguage,
}) => {
  const isDebug = question.question_type === 'debug' || Boolean(question.code_snippet);

  return (
    <div className="space-y-4">
      {/* Category Pill & Dynamic Language Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2">
          {/* Question Type: Quiz vs Debugging */}
          <Badge
            variant={isDebug ? 'warning' : 'neutral'}
            size="sm"
            className="font-bold uppercase tracking-wider text-[10px]"
          >
            {isDebug ? 'Debugging' : 'Quiz'}
          </Badge>

          {/* Language / Subject Tag */}
          {question.language && (
            <Badge variant="outline" size="sm" className="text-[11px] text-neutral-600">
              {question.language}
            </Badge>
          )}
        </div>

        {/* Preferred Language Dropdown (Available on Debug Questions) */}
        {isDebug && onSwitchLanguage && (
          <div className="flex items-center gap-2 bg-neutral-50 px-2.5 py-1 rounded-xl border border-neutral-200">
            <span className="text-[11px] font-medium text-neutral-500 whitespace-nowrap">
              Preferred Language:
            </span>
            <select
              value={question.language || 'Python'}
              onChange={(e) => onSwitchLanguage(e.target.value)}
              className="text-xs font-semibold bg-white border border-neutral-300 rounded-lg px-2.5 py-1 text-neutral-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer"
            >
              <option value="Python">Python</option>
              <option value="Java">Java</option>
              <option value="C">C</option>
            </select>
          </div>
        )}
      </div>

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
              <span>{question.language ? `${question.language} Snippet` : 'Snippet'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
              <Terminal className="w-3 h-3" />
              <span>Output Analysis</span>
            </div>
          </div>
          <pre className="p-4 overflow-x-auto leading-relaxed text-neutral-200">
            <code>{question.code_snippet}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
