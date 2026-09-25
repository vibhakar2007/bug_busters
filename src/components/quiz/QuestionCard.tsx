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
            variant={isDebug ? 'moss' : 'neutral'}
            size="sm"
            className="font-bold uppercase tracking-wider text-[10px]"
          >
            {isDebug ? 'Debugging' : 'Quiz'}
          </Badge>

          {/* Language / Subject Tag */}
          {question.language && (
            <Badge variant="outline" size="sm" className="text-[11px] text-slate-300">
              {question.language}
            </Badge>
          )}
        </div>

        {/* Preferred Language Dropdown (Available on Debug Questions) */}
        {isDebug && onSwitchLanguage && (
          <div className="flex items-center gap-2 bg-[#0d1224] px-2.5 py-1 rounded-xl border border-[#283f5f]">
            <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
              Preferred Language:
            </span>
            <select
              value={question.language || 'Python'}
              onChange={(e) => onSwitchLanguage(e.target.value)}
              className="text-xs font-semibold bg-[#070916] border border-[#283f5f] rounded-lg px-2.5 py-1 text-white shadow-xs focus:outline-none focus:ring-2 focus:ring-[#9db40c] cursor-pointer"
            >
              <option value="Python" className="bg-[#0d1224] text-white">Python</option>
              <option value="Java" className="bg-[#0d1224] text-white">Java</option>
              <option value="C" className="bg-[#0d1224] text-white">C</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Question Text */}
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-snug tracking-tight">
        {question.question}
      </h2>

      {/* Code Snippet Box (if present) */}
      {question.code_snippet && (
        <div className="rounded-xl overflow-hidden border border-[#283f5f] bg-[#070916] text-slate-100 shadow-xl text-xs sm:text-sm font-mono-tabular">
          <div className="px-4 py-2 bg-[#0d1224] border-b border-[#283f5f]/60 flex items-center justify-between text-slate-400 text-xs">
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-[#9db40c]" />
              <span className="font-semibold text-slate-200">{question.language ? `${question.language} Snippet` : 'Snippet'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Terminal className="w-3 h-3 text-slate-500" />
              <span>Output Analysis</span>
            </div>
          </div>
          <pre className="p-4 overflow-x-auto leading-relaxed text-slate-200 bg-[#070916]">
            <code>{question.code_snippet}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
