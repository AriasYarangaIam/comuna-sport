import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/cn';

const links = [
  { to: '/', label: 'Explorar', end: true },
  { to: '/disponibilidad', label: 'Disponibilidad', end: false },
  { to: '/mis-reservas', label: 'Mis reservas', end: false },
  { to: '/incidentes', label: 'Incidentes', end: false },
  { to: '/ayuda', label: 'Ayuda', end: false },
] as const;

export function TopNav() {
  return (
    <nav aria-label="Navegación principal" className="hidden md:block">
      <ul className="flex h-16 items-stretch">
        {links.map(({ to, label, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex h-full items-center border-b-[3px] px-3 text-small font-medium transition-colors lg:px-4',
                  isActive
                    ? 'border-sky-700 text-sky-800'
                    : 'border-transparent text-ink-soft hover:text-ink',
                )
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
