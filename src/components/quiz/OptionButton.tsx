'use client';

import React, { useRef } from 'react';
import gsap from 'gsap';
import { cn } from '@/lib/utils/cn';
import { Check } from 'lucide-react';

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
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    if (disabled) return;
    if (buttonRef.current) {
      gsap.fromTo(
        buttonRef.current,
        { scale: 0.98 },
        { scale: 1, duration: 0.22, ease: 'back.out(2)' }
      );
    }
    onSelect(optionKey);
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'w-full text-left p-4 sm:p-5 rounded-2xl border transition-all duration-150 flex items-start gap-4 min-h-[64px] select-none group focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 cursor-pointer',
        isSelected
          ? 'bg-neutral-900 text-white border-neutral-900 shadow-md ring-2 ring-neutral-900 ring-offset-2 ring-offset-white'
          : 'bg-white text-neutral-900 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50/80 shadow-xs active:bg-neutral-100'
      )}
    >
      {/* Option Key Badge (A, B, C, D) */}
      <div
        className={cn(
          'w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors',
          isSelected
            ? 'bg-white text-neutral-900 shadow-xs'
            : 'bg-neutral-100 text-neutral-700 group-hover:bg-neutral-200 group-hover:text-neutral-900'
        )}
      >
        {label}
      </div>

      {/* Option Text */}
      <div
        className={cn(
          'flex-1 pt-1 text-sm sm:text-base leading-relaxed font-normal',
          isSelected ? 'text-white' : 'text-neutral-900'
        )}
      >
        {text}
      </div>

      {/* Selected Indicator Pill */}
      <div
        className={cn(
          'w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all',
          isSelected
            ? 'border-white bg-white text-neutral-900 shadow-xs'
            : 'border-neutral-300 group-hover:border-neutral-400'
        )}
      >
        {isSelected ? (
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        ) : null}
      </div>
    </button>
  );
};
