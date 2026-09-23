'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

interface OptionButtonProps {
  optionKey: string;
  label: string;
  text: string;
  isSelected: boolean;
  onSelect: (key: string) => void;
  disabled?: boolean;
}

export const OptionButton: React.FC<OptionButtonProps> = ({
  optionKey,
  label,
  text,
  isSelected,
  onSelect,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(optionKey)}
      className={cn(
        'w-full text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex items-start gap-4 min-h-[64px] select-none group focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900',
        isSelected
          ? 'bg-neutral-900 text-white border-neutral-900 shadow-md transform scale-[1.008]'
          : 'bg-white text-neutral-900 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/70 shadow-xs'
      )}
    >
      {/* Option Key Badge (A, B, C, D) */}
      <div
        className={cn(
          'w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors',
          isSelected
            ? 'bg-white text-neutral-900'
            : 'bg-neutral-100 text-neutral-600 group-hover:bg-neutral-200 group-hover:text-neutral-900'
        )}
      >
        {label}
      </div>

      {/* Option Text */}
      <div className="flex-1 pt-1 text-sm sm:text-base leading-relaxed font-normal">
        {text}
      </div>

      {/* Selected Indicator Pill */}
      <div
        className={cn(
          'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 transition-all',
          isSelected
            ? 'border-white bg-white'
            : 'border-neutral-300 group-hover:border-neutral-400'
        )}
      >
        {isSelected && <div className="w-2 h-2 rounded-full bg-neutral-900" />}
      </div>
    </button>
  );
};
