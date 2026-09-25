'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/cn';
import { animateModalEntrance } from '@/animations/gsap';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      animateModalEntrance(contentRef.current);
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#070916]/85 backdrop-blur-md transition-opacity duration-200"
      />

      {/* Modal Dialog */}
      <div
        ref={contentRef}
        className={cn(
          'relative w-full max-w-lg bg-[#0d1224] rounded-2xl border border-[#283f5f] text-white shadow-2xl p-6 sm:p-8 z-10',
          className
        )}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white hover:bg-[#283f5f]/40 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {title && <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>}
        {description && <p className="text-sm text-slate-400 mt-1 mb-5">{description}</p>}

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};
