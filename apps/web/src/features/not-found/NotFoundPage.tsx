import { Link } from 'react-router-dom';
import { Compass, MapPinOff } from 'lucide-react';
import { buttonStyles } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-[680px] px-4 py-12 md:px-6">
      <h1 className="text-headline-lg text-ink">Página no encontrada</h1>
      <div className="mt-4">
        <EmptyState
          icon={MapPinOff}
          title="No encontramos esta página"
          description="El enlace puede estar incompleto o la página haber cambiado de dirección. Vuelve al explorador para continuar."
          action={
            <Link to="/" className={buttonStyles()}>
              <Compass className="h-4 w-4" aria-hidden="true" />
              Ir al explorador
            </Link>
          }
        />
      </div>
    </div>
  );
}
