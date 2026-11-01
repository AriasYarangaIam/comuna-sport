import { Suspense, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Compass, HelpCircle } from 'lucide-react';
import { useUiStore } from '../../stores/ui';
import { PageSkeleton } from '../ui/Skeleton';
import { BottomNav } from './BottomNav';
import { Footer } from './Footer';
import { ReadingModeToggle } from './ReadingModeToggle';
import { TopNav } from './TopNav';

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash !== '') {
      const target = document.getElementById(hash.slice(1));
      if (target !== null) {
        target.scrollIntoView({ block: 'start' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

export function AppShell() {
  const readingMode = useUiStore((state) => state.readingMode);

  useEffect(() => {
    if (readingMode) {
      document.documentElement.dataset['reading'] = 'large';
    } else {
      delete document.documentElement.dataset['reading'];
    }
  }, [readingMode]);

  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-3 focus:text-small focus:font-semibold focus:text-sky-800 focus:shadow-raised"
      >
        Saltar al contenido principal
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2 lg:gap-4">
            <Link
              to="/"
              className="flex min-h-12 min-w-0 items-center gap-2.5 rounded-control pr-1"
              aria-label="ComunaSport, ir al inicio"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-700 text-white">
                <Compass className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="truncate text-headline-sm font-semibold tracking-tight text-ink">
                ComunaSport
              </span>
              <span className="hidden rounded-pill border border-sky-200 bg-info-bg px-2 py-0.5 text-caption font-semibold uppercase tracking-wider text-info-text sm:inline">
                Municipal
              </span>
            </Link>
            <TopNav />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ReadingModeToggle />
            <Link
              to="/ayuda"
              className="flex h-12 w-12 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-sky-50 hover:text-ink md:hidden"
              aria-label="Ayuda"
            >
              <HelpCircle className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main id="contenido" tabIndex={-1} className="flex-1 pb-24 outline-none md:pb-0">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>

      <div className="pb-16 md:pb-0">
        <Footer />
      </div>

      <BottomNav />
    </div>
  );
}
