import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-sky-700 text-white hover:bg-sky-800 active:bg-sky-900 shadow-card',
  secondary:
    'border border-border-strong bg-surface text-sky-800 hover:bg-sky-50 active:bg-sky-100',
  ghost: 'text-sky-800 hover:bg-sky-50 active:bg-sky-100',
  danger: 'bg-danger-text text-white hover:bg-[#8f1b13] active:bg-[#7a1710]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-12 px-3 text-small',
  md: 'min-h-12 px-4 text-body',
  lg: 'min-h-14 px-6 text-body',
};

export const buttonStyles = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: ButtonStyleOptions = {}): string =>
  cn(
    'inline-flex select-none items-center justify-center gap-2 rounded-control font-medium transition-colors duration-150',
    'disabled:cursor-not-allowed disabled:opacity-50',
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && 'w-full',
    className,
  );

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      loadingLabel = 'Procesando…',
      className,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={buttonStyles({ variant, size, fullWidth, className })}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  ),
);

Button.displayName = 'Button';
