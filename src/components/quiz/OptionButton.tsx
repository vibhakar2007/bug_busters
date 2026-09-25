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
        'w-full text-left p-4 sm:p-5 rounded-2xl border transition-all duration-150 flex items-start gap-4 min-h-[64px] select-none group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9db40c] cursor-pointer',
        isSelected
          ? 'bg-[#031c6c]/45 text-white border-2 border-[#9db40c] shadow-[0_0_16px_rgba(157,180,12,0.25)] ring-2 ring-[#9db40c]/30'
          : 'bg-[#0d1224] text-slate-200 border border-[#283f5f]/60 hover:border-[#283f5f] hover:bg-[#283f5f]/20 shadow-xs'
      )}
    >
      {/* Option Key Badge (A, B, C, D) */}
      <div
        className={cn(
          'w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-colors',
          isSelected
            ? 'bg-[#9db40c] text-[#070916] shadow-xs'
            : 'bg-[#283f5f]/40 text-slate-300 border border-[#283f5f]/60 group-hover:bg-[#283f5f] group-hover:text-white'
        )}
      >
        {label}
      </div>

      {/* Option Text */}
      <div
        className={cn(
          'flex-1 pt-1 text-sm sm:text-base leading-relaxed font-normal',
          isSelected ? 'text-white font-medium' : 'text-slate-200'
        )}
      >
        {text}
      </div>

      {/* Selected Indicator Pill */}
      <div
        className={cn(
          'w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all',
          isSelected
            ? 'border-[#9db40c] bg-[#9db40c] text-[#070916] shadow-xs'
            : 'border-[#283f5f] group-hover:border-slate-400'
        )}
      >
        {isSelected ? (
          <Check className="w-3.5 h-3.5 stroke-[3] text-[#070916]" />
        ) : null}
      </div>
    </button>
  );
};
