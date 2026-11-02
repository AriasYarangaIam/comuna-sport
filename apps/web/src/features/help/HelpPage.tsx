import { Link } from 'react-router-dom';
import {
  Accessibility,
  CalendarCheck,
  HeartHandshake,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { buttonStyles } from '../../components/ui/Button';

export function HelpPage() {
  return (
    <div className="mx-auto max-w-[840px] px-4 py-6 md:px-6 md:py-8">
      <header>
        <h1 className="text-headline-lg text-ink md:text-display">Ayuda</h1>
        <p className="mt-2 max-w-2xl text-pretty text-body text-ink-soft">
          Todo lo necesario para reservar un espacio deportivo municipal o
          reportar un daño, sin crear una cuenta.
        </p>
      </header>

      <div className="mt-6 space-y-4">
        <section
          aria-labelledby="como-reservar"
          className="rounded-card border border-border bg-surface p-5 shadow-card"
        >
          <h2 id="como-reservar" className="flex items-center gap-2 text-headline-sm text-ink">
            <CalendarCheck className="h-5 w-5 text-sky-700" aria-hidden="true" />
            Cómo reservar en 3 pasos
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-body text-ink-soft">
            <li>
              Elige un espacio en <Link to="/" className="text-sky-800 underline">Explorar</Link> y
              consulta sus horarios.
            </li>
            <li>
              Selecciona una fecha y una franja. La disponibilidad se consulta
              al servidor municipal; no es un cálculo local.
            </li>
            <li>
              Identifícate, elige tu categoría comunitaria y confirma. Recibirás
              un comprobante con un código copiable.
            </li>
          </ol>
        </section>

        <section
          aria-labelledby="tarifas"
          className="rounded-card border border-border bg-surface p-5 shadow-card"
        >
          <h2 id="tarifas" className="flex items-center gap-2 text-headline-sm text-ink">
            <HeartHandshake className="h-5 w-5 text-sky-700" aria-hidden="true" />
            Tarifas y beneficios
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-body text-ink-soft">
            <li>Vecino general y joven / estudiante: tarifa base del espacio.</li>
            <li>Adulto mayor: Beneficio Adulto Mayor (−50 %).</li>
            <li>Club privado: Recargo solidario (+20 %).</li>
          </ul>
          <p className="mt-3 text-small text-ink-soft">
            El total se recalcula al cambiar de categoría y el servidor confirma
            el monto definitivo al registrar la reserva.
          </p>
        </section>

        <section
          aria-labelledby="reportes"
          className="rounded-card border border-border bg-surface p-5 shadow-card"
        >
          <h2 id="reportes" className="flex items-center gap-2 text-headline-sm text-ink">
            <ShieldCheck className="h-5 w-5 text-sky-700" aria-hidden="true" />
            Reportes de daño
          </h2>
          <p className="mt-3 text-body text-ink-soft">
            Puedes reportar un daño desde la tarjeta de cada espacio o desde{' '}
            <Link to="/incidentes" className="text-sky-800 underline">Incidentes</Link>.
            El municipio revisa el reporte y actualiza su estado; la web solo
            muestra el seguimiento, no permite aprobarlo ni resolverlo.
          </p>
        </section>

        <section
          aria-labelledby="accesibilidad"
          className="rounded-card border border-border bg-surface p-5 shadow-card"
        >
          <h2 id="accesibilidad" className="flex items-center gap-2 text-headline-sm text-ink">
            <Accessibility className="h-5 w-5 text-sky-700" aria-hidden="true" />
            Accesibilidad
          </h2>
          <p className="mt-3 text-body text-ink-soft">
            La barra superior incluye el interruptor “Lectura fácil”, que aumenta
            el tamaño del texto y los objetivos táctiles. La navegación funciona
            con teclado, los estados se anuncian a lectores de pantalla y se
            respeta la preferencia de movimiento reducido del sistema.
          </p>
        </section>

        <section
          id="terminos"
          aria-labelledby="terminos-titulo"
          className="scroll-mt-24 rounded-card border border-border bg-surface p-5 shadow-card"
        >
          <h2 id="terminos-titulo" className="flex items-center gap-2 text-headline-sm text-ink">
            <HelpCircle className="h-5 w-5 text-sky-700" aria-hidden="true" />
            Términos y condiciones
          </h2>
          <p className="mt-3 text-body text-ink-soft">
            El uso de la plataforma implica aceptar las ordenanzas municipales
            sobre uso de espacios deportivos. La reserva es personal y está
            sujeta a validación del municipio. Esta versión no procesa pagos en
            línea.
          </p>
        </section>

        <section
          id="privacidad"
          aria-labelledby="privacidad-titulo"
          className="scroll-mt-24 rounded-card border border-border bg-surface p-5 shadow-card"
        >
          <h2 id="privacidad-titulo" className="text-headline-sm text-ink">
            Política de privacidad
          </h2>
          <p className="mt-3 text-body text-ink-soft">
            Solo usamos el identificador que ingresas para vincular la reserva o
            el reporte. No creamos cuentas ni solicitamos contraseñas. El
            identificador queda visible en el comprobante y en el seguimiento del
            reporte.
          </p>
        </section>

        <section
          id="transparencia"
          aria-labelledby="transparencia-titulo"
          className="scroll-mt-24 rounded-card border border-border bg-surface p-5 shadow-card"
        >
          <h2 id="transparencia-titulo" className="text-headline-sm text-ink">
            Portal de transparencia
          </h2>
          <p className="mt-3 text-body text-ink-soft">
            Las tarifas, horarios y estados de los espacios provienen del
            catálogo municipal. Si detectas una inconsistencia, repórtala en la
            mesa de partes de la Municipalidad Metropolitana de Lima.
          </p>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/" className={buttonStyles()}>
          Explorar espacios
        </Link>
        <Link to="/mis-reservas" className={buttonStyles({ variant: 'secondary' })}>
          Consultar mis reservas
        </Link>
      </div>
    </div>
  );
}
