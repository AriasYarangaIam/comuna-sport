import { cn } from '../../lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-control bg-sky-100',
        className,
      )}
    />
  );
}

export function SpaceCardSkeleton() {
  return (
    <div
      className="rounded-card border border-border bg-surface p-5 shadow-card"
      aria-hidden="true"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-20 rounded-pill" />
      </div>
      <Skeleton className="mt-4 h-6 w-4/5" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-3/5" />
      </div>
      <Skeleton className="mt-5 h-12 w-full" />
    </div>
  );
}

export function SpaceGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-busy="true"
      aria-label="Cargando espacios deportivos"
    >
      {Array.from({ length: count }, (_, index) => (
        <SpaceCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando resultados">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="rounded-card border border-border bg-surface p-5 shadow-card"
          aria-hidden="true"
        >
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="mt-3 h-4 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div
      className="mx-auto max-w-[1200px] px-4 py-10 md:px-6"
      aria-busy="true"
      aria-label="Cargando página"
    >
      <Skeleton className="h-9 w-2/3 max-w-md" />
      <Skeleton className="mt-3 h-5 w-1/2 max-w-sm" />
      <div className="mt-8">
        <SpaceGridSkeleton />
      </div>
    </div>
  );
}
