import { Accessibility } from 'lucide-react';
import { useUiStore } from '../../stores/ui';
import { cn } from '../../lib/cn';

export function ReadingModeToggle({ className }: { className?: string }) {
  const readingMode = useUiStore((state) => state.readingMode);
  const toggleReadingMode = useUiStore((state) => state.toggleReadingMode);

  return (
    <button
      type="button"
      onClick={toggleReadingMode}
      aria-pressed={readingMode}
      aria-label={
        readingMode
          ? 'Desactivar modo Lectura fácil'
          : 'Activar modo Lectura fácil'
      }
      className={cn(
        'inline-flex min-h-12 items-center gap-2 rounded-pill border px-3 text-small font-medium transition-colors',
        readingMode
          ? 'border-sky-700 bg-sky-700 text-white'
          : 'border-border bg-sky-50 text-sky-800 hover:bg-sky-100',
        className,
      )}
    >
      <Accessibility className="h-5 w-5" aria-hidden="true" />
      <span className="hidden sm:inline">Lectura fácil</span>
    </button>
  );
}
