import { Link } from 'react-router-dom';
import { Landmark } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-8 md:flex-row md:items-start md:justify-between md:px-6">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            <Landmark className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-small font-semibold text-ink">
              Municipalidad Metropolitana de Lima
            </p>
            <p className="mt-1 max-w-md text-small text-ink-soft">
              Plataforma de gestión deportiva y atención al vecino. Los
              espacios y tarifas son administrados por la comuna.
            </p>
          </div>
        </div>
        <nav aria-label="Enlaces institucionales">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-small text-ink-soft">
            <li>
              <Link to="/ayuda#terminos" className="hover:text-ink hover:underline">
                Términos y condiciones
              </Link>
            </li>
            <li>
              <Link to="/ayuda#privacidad" className="hover:text-ink hover:underline">
                Política de privacidad
              </Link>
            </li>
            <li>
              <Link to="/ayuda#transparencia" className="hover:text-ink hover:underline">
                Portal de transparencia
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
