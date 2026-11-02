import { NavLink } from 'react-router-dom';
import { AlertTriangle, CalendarDays, Compass, HelpCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

const links = [
  { to: '/', label: 'Explorar', icon: Compass, end: true },
  { to: '/mis-reservas', label: 'Reservas', icon: CalendarDays, end: false },
  { to: '/incidentes', label: 'Incidentes', icon: AlertTriangle, end: false },
  { to: '/ayuda', label: 'Ayuda', icon: HelpCircle, end: false },
] as const;

export function BottomNav() {
  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface shadow-[0_-2px_8px_rgba(12,31,46,0.06)] pb-safe md:hidden"
    >
      <ul className="flex h-16 items-stretch justify-around px-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="min-w-0 flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex h-full min-h-14 flex-col items-center justify-center gap-0.5 rounded-control px-1 text-caption font-medium transition-colors',
                  isActive
                    ? 'text-sky-800'
                    : 'text-ink-soft hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-7 w-12 items-center justify-center rounded-pill transition-colors',
                      isActive ? 'bg-sky-100' : 'bg-transparent',
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
