import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
  className?: string;
}

/**
 * Hoja a pantalla completa en móvil y diálogo centrado en escritorio.
 * Trampa de foco, cierre con Esc, retorno de foco al disparador y bloqueo
 * del scroll de fondo.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  closeLabel = 'Cerrar',
  className,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    previouslyFocused.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const panel = panelRef.current;
      if (panel === null) {
        return;
      }
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.offsetParent !== null || element === closeRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (first === undefined || last === undefined) {
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0 cursor-default bg-sky-900/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        data-testid="dialog-backdrop"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description === undefined ? undefined : descriptionId}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-sheet bg-surface shadow-raised',
          'animate-[dialog-in_240ms_var(--ease-emphasis)_both] sm:max-w-[640px] sm:rounded-sheet',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-headline-sm text-ink">
              {title}
            </h2>
            {description !== undefined ? (
              <p id={descriptionId} className="mt-1 text-small text-ink-soft">
                {description}
              </p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-sky-50 hover:text-ink"
            aria-label={closeLabel}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer !== undefined ? (
          <div className="border-t border-border bg-canvas px-5 py-4 pb-safe">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
