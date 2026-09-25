import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9db40c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070916] cursor-pointer';

    const variants = {
      primary: 'bg-[#9db40c] text-[#070916] hover:bg-[#b0c90e] hover:shadow-[0_0_16px_rgba(157,180,12,0.45)] shadow-md border border-[#9db40c]',
      secondary: 'bg-[#031c6c] text-white hover:bg-[#052899] border border-[#283f5f] shadow-sm',
      outline: 'bg-[#0d1224] text-white border border-[#283f5f] hover:bg-[#283f5f]/35 hover:border-slate-300 hover:text-white shadow-sm',
      ghost: 'bg-transparent text-slate-300 hover:bg-[#283f5f]/30 hover:text-white',
      danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm border border-rose-500',
      success: 'bg-[#9db40c] text-[#070916] hover:bg-[#b0c90e] shadow-sm border border-[#9db40c]',
    };

    const sizes = {
      sm: 'text-xs h-9 px-3.5 gap-1.5',
      md: 'text-sm h-11 px-5 gap-2',
      lg: 'text-base h-13 px-6 gap-2.5 font-bold',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>{children}</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
