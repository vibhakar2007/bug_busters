import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-[#0d1224] border border-[#283f5f]/60 rounded-2xl shadow-xl p-6 text-white transition-all duration-150',
          hover && 'hover:border-[#283f5f] hover:shadow-[0_8px_24px_rgba(0,0,0,0.6)]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
