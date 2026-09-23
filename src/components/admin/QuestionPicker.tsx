'use client';

import React, { useState, useMemo } from 'react';
import { Question } from '@/types/quiz';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Search, CheckSquare, Square, Filter } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface QuestionPickerProps {
  questions: Question[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  className?: string;
}

export const QuestionPicker: React.FC<QuestionPickerProps> = ({
  questions,
  selectedIds,
  onChange,
  className,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      if (q.category) set.add(q.category);
    });
    return ['all', ...Array.from(set)];
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchSearch =
        q.question.toLowerCase().includes(search.toLowerCase()) ||
        q.option_a.toLowerCase().includes(search.toLowerCase()) ||
        q.option_b.toLowerCase().includes(search.toLowerCase()) ||
        q.option_c.toLowerCase().includes(search.toLowerCase()) ||
        q.option_d.toLowerCase().includes(search.toLowerCase());

      const matchCategory = categoryFilter === 'all' || q.category === categoryFilter;

      return matchSearch && matchCategory;
    });
  }, [questions, search, categoryFilter]);

  const toggleQuestion = (id: number) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAllFiltered = () => {
    const toAdd = filteredQuestions.map((q) => q.question_id);
    const combined = Array.from(new Set([...selectedIds, ...toAdd]));
    onChange(combined);
  };

  const clearAllFiltered = () => {
    const toRemove = new Set(filteredQuestions.map((q) => q.question_id));
    onChange(selectedIds.filter((id) => !toRemove.has(id)));
  };

  return (
    <div className={cn('bg-white border border-neutral-200/80 rounded-2xl p-5 space-y-4', className)}>
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
        <div>
          <h4 className="text-sm font-semibold text-neutral-900">Select Questions</h4>
          <p className="text-xs text-neutral-500 mt-0.5">
            Choose questions to include in the quiz pool. Selected questions will be randomly drawn for participants.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between">
          <Badge variant="neutral" size="md" className="font-mono-tabular font-semibold">
            Selected: {selectedIds.length} / {questions.length}
          </Badge>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAllFiltered}
              className="text-xs h-8 px-2.5"
            >
              Select All
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAllFiltered}
              className="text-xs h-8 px-2.5"
            >
              Clear All
            </Button>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search questions or options..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3 h-3 text-neutral-400 mr-1 shrink-0" />
          {categories.map((cat) => (
            <button
              type="button"
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-colors capitalize',
                categoryFilter === cat
                  ? 'bg-neutral-900 text-white font-medium'
                  : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Question list items */}
      <div className="max-h-96 overflow-y-auto space-y-2 pr-1 divide-y divide-neutral-100">
        {filteredQuestions.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400">
            No questions match search or filter.
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const isSelected = selectedSet.has(q.question_id);

            return (
              <div
                key={q.question_id}
                onClick={() => toggleQuestion(q.question_id)}
                className={cn(
                  'pt-2.5 pb-2.5 px-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3',
                  isSelected
                    ? 'bg-neutral-50/80 border-neutral-300'
                    : 'bg-white border-transparent hover:bg-neutral-50/50'
                )}
              >
                <div className="mt-0.5 text-neutral-900 shrink-0">
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-neutral-900" />
                  ) : (
                    <Square className="w-4 h-4 text-neutral-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono-tabular font-bold text-neutral-500">
                      #{q.question_id}
                    </span>
                    {q.category && (
                      <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-medium">
                        {q.category}
                      </span>
                    )}
                    {q.difficulty && (
                      <span className="text-[10px] text-neutral-400 uppercase font-mono-tabular">
                        {q.difficulty}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-neutral-900 leading-snug">{q.question}</p>
                  {q.code_snippet && (
                    <span className="text-[10px] text-neutral-500 font-mono-tabular mt-1 inline-block">
                      Includes code snippet
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
