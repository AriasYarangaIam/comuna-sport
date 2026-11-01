import { forwardRef, useId } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from '../../lib/cn';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  children: ReactNode;
  className?: string | undefined;
}

function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: FieldShellProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className="block text-small font-medium text-ink">
        {label}
        {required === true ? (
          <span className="ml-1 text-danger-text" aria-hidden="true">
            *
          </span>
        ) : null}
        {required === true ? <span className="sr-only"> (obligatorio)</span> : null}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint !== undefined && error === undefined ? (
        <p id={`${id}-hint`} className="mt-1.5 text-small text-ink-soft">
          {hint}
        </p>
      ) : null}
      {error !== undefined ? (
        <p id={`${id}-error`} className="mt-1.5 text-small font-medium text-danger-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const controlClasses = (hasError: boolean): string =>
  cn(
    'w-full min-h-12 rounded-control border bg-surface px-3 py-2 text-body text-ink',
    'placeholder:text-ink-muted transition-colors duration-150',
    'focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/25',
    'disabled:cursor-not-allowed disabled:bg-tint disabled:text-ink-muted',
    hasError
      ? 'border-danger-text focus:border-danger-text focus:ring-danger-text/20'
      : 'border-border-strong',
  );

const describedBy = (
  id: string,
  hint?: string,
  error?: string,
): string | undefined => {
  const ids: string[] = [];
  if (hint !== undefined && error === undefined) ids.push(`${id}-hint`);
  if (error !== undefined) ids.push(`${id}-error`);
  return ids.length === 0 ? undefined : ids.join(' ');
};

export interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ id, label, hint, error, required, className, containerClassName, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    return (
      <FieldShell
        id={fieldId}
        label={label}
        hint={hint}
        error={error}
        required={required}
        className={containerClassName}
      >
        <input
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={describedBy(fieldId, hint, error)}
          className={cn(controlClasses(error !== undefined), className)}
          {...props}
        />
      </FieldShell>
    );
  },
);

TextInput.displayName = 'TextInput';

export interface TextAreaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
  showCount?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      id,
      label,
      hint,
      error,
      required,
      className,
      containerClassName,
      showCount = false,
      maxLength,
      value,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const count =
      typeof value === 'string' ? value.length : undefined;
    return (
      <FieldShell
        id={fieldId}
        label={label}
        hint={hint}
        error={error}
        required={required}
        className={containerClassName}
      >
        <textarea
          ref={ref}
          id={fieldId}
          required={required}
          maxLength={maxLength}
          value={value}
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={describedBy(fieldId, hint, error)}
          className={cn(controlClasses(error !== undefined), 'min-h-32 resize-y', className)}
          {...props}
        />
        {showCount && maxLength !== undefined ? (
          <p
            className="mt-1.5 text-right text-caption text-ink-soft"
            aria-live="polite"
            data-reading-hide
          >
            {count ?? 0} / {maxLength} caracteres
          </p>
        ) : null}
      </FieldShell>
    );
  },
);

TextArea.displayName = 'TextArea';

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { id, label, hint, error, required, className, containerClassName, children, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    return (
      <FieldShell
        id={fieldId}
        label={label}
        hint={hint}
        error={error}
        required={required}
        className={containerClassName}
      >
        <select
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={describedBy(fieldId, hint, error)}
          className={cn(controlClasses(error !== undefined), 'pr-8', className)}
          {...props}
        >
          {children}
        </select>
      </FieldShell>
    );
  },
);

Select.displayName = 'Select';
