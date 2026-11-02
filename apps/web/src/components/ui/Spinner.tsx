import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Spinner({
  className,
  label = 'Cargando',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <Loader2
        className={cn('h-5 w-5 animate-spin text-sky-700', className)}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
