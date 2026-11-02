import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import type { ReservationBody } from '../../types/api';
import { makeReservation } from '../../test/fixtures';
import { renderWithProviders } from '../../test/render';
import { captured, server } from '../../test/server';
import { ReservationPage } from './ReservationPage';

const SPACE_ID = 'space-futbol-1';

const renderReservation = () =>
  renderWithProviders(
    <Routes>
      <Route path="/reservar/:spaceId" element={<ReservationPage />} />
      <Route path="/recibo/:reservationId" element={<h1>Recibo emitido</h1>} />
      <Route path="/" element={<h1>Explorador</h1>} />
    </Routes>,
    { route: `/reservar/${SPACE_ID}` },
  );

const recordRequest = async (
  request: Request,
  spaceId: string,
): Promise<ReservationBody> => {
  const body = (await request.json()) as ReservationBody;
  captured.reservationRequests.push({
    spaceId,
    idempotencyKey: request.headers.get('Idempotency-Key'),
    body,
  });
  return body;
};

const reservationHandler = (
  respond: (body: ReservationBody) => Response | Promise<Response>,
) =>
  http.post('*/api/spaces/:spaceId/reservations', async ({ params, request }) => {
    const body = await recordRequest(request, String(params.spaceId));
    return respond(body);
  });

const goToSummary = async (): Promise<void> => {
  await screen.findByRole('heading', { name: /Reservar · Cancha Central/ });
  await userEvent.type(
    screen.getByLabelText(/ID de usuario o DNI/),
    'user-vecino-4589',
  );
  await userEvent.click(screen.getByRole('button', { name: /Continuar/ }));
  await screen.findByRole('heading', { name: 'Categoría comunitaria' });
  await userEvent.click(screen.getByRole('button', { name: /Continuar/ }));
  await screen.findByRole('heading', { name: 'Horario y tarifa' });
};

const submit = async (): Promise<void> => {
  await userEvent.click(
    screen.getByRole('button', { name: 'Confirmar reserva' }),
  );
};

const runAxe = async (): Promise<axe.AxeResults> =>
  axe.run(document.body, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
      'landmark-one-main': { enabled: false },
    },
  });

describe('ReservationPage (S3)', () => {
  it('valida la identificación y avanza hasta el resumen', async () => {
    renderReservation();
    await screen.findByRole('heading', { name: /Reservar · Cancha Central/ });

    await userEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    expect(
      await screen.findByText('Ingresa tu identificador o DNI.'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/ID de usuario o DNI/),
    ).toHaveAttribute('aria-invalid', 'true');

    await userEvent.type(
      screen.getByLabelText(/ID de usuario o DNI/),
      'user-vecino-4589',
    );
    await userEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    expect(
      await screen.findByRole('heading', { name: 'Categoría comunitaria' }),
    ).toBeInTheDocument();

    // El adulto mayor paga la mitad.
    await userEvent.click(screen.getByRole('radio', { name: /Adulto mayor/ }));
    expect(screen.getAllByText('S/ 60.00 PEN').length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    expect(
      await screen.findByRole('heading', { name: 'Horario y tarifa' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Fecha/)).not.toHaveValue('');
    expect(screen.getByLabelText(/^Hora de inicio/)).not.toHaveValue('');
    expect(screen.getByLabelText(/^Hora de fin/)).not.toHaveValue('');
    expect(screen.getAllByText('Total a pagar').length).toBeGreaterThan(0);
  });

  it('envía la reserva con la hora de pared de Lima convertida a UTC', async () => {
    renderReservation();
    await goToSummary();
    await submit();

    await screen.findByRole('heading', { name: 'Recibo emitido' });
    expect(captured.reservationRequests).toHaveLength(1);
    const request = captured.reservationRequests[0];
    expect(request?.spaceId).toBe(SPACE_ID);
    expect(request?.body.userId).toBe('user-vecino-4589');
    expect(request?.body.role).toBe('NEIGHBOR');
    expect(request?.body.timeSlot.start).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/,
    );
    expect(
      new Date(request?.body.timeSlot.start ?? '').getTime(),
    ).toBeLessThan(new Date(request?.body.timeSlot.end ?? '').getTime());
  });

  it('reutiliza la Idempotency-Key al reintentar tras un fallo de red', async () => {
    // Solo el primer POST falla; el segundo usa el handler por defecto.
    server.use(
      http.post(
        '*/api/spaces/:spaceId/reservations',
        async ({ params, request }) => {
          await recordRequest(request, String(params.spaceId));
          return HttpResponse.error();
        },
        { once: true },
      ),
    );

    renderReservation();
    await goToSummary();
    await submit();

    expect(
      await screen.findByText('Sin conexión con el servidor'),
    ).toBeInTheDocument();

    await submit();
    await screen.findByRole('heading', { name: 'Recibo emitido' });

    expect(captured.reservationRequests).toHaveLength(2);
    expect(captured.reservationRequests[0]?.idempotencyKey).toBeTruthy();
    expect(captured.reservationRequests[0]?.idempotencyKey).toBe(
      captured.reservationRequests[1]?.idempotencyKey,
    );
  });

  it('rota la Idempotency-Key tras un payload_mismatch', async () => {
    server.use(
      http.post(
        '*/api/spaces/:spaceId/reservations',
        async ({ params, request }) => {
          await recordRequest(request, String(params.spaceId));
          return HttpResponse.json(
            {
              error: {
                code: 'IDEMPOTENCY_CONFLICT',
                message: 'Payload mismatch',
                details: { reason: 'payload_mismatch' },
              },
            },
            { status: 409 },
          );
        },
        { once: true },
      ),
    );

    renderReservation();
    await goToSummary();
    await submit();

    expect(
      await screen.findByText('Detectamos un cambio en los datos'),
    ).toBeInTheDocument();

    await submit();
    await screen.findByRole('heading', { name: 'Recibo emitido' });

    expect(captured.reservationRequests).toHaveLength(2);
    expect(captured.reservationRequests[0]?.idempotencyKey).not.toBe(
      captured.reservationRequests[1]?.idempotencyKey,
    );
  });

  it('no duplica la reserva ante un doble toque', async () => {
    server.use(
      reservationHandler(async () => {
        await delay(150);
        return HttpResponse.json(makeReservation(), { status: 201 });
      }),
    );

    renderReservation();
    await goToSummary();
    await submit();

    const pendingButton = await screen.findByRole('button', {
      name: /Procesando/,
    });
    await waitFor(() => expect(pendingButton).toBeDisabled());
    await userEvent.click(pendingButton);

    await screen.findByRole('heading', { name: 'Recibo emitido' });
    expect(captured.reservationRequests).toHaveLength(1);
  });

  it('ofrece alternativas cuando el horario ya fue tomado', async () => {
    server.use(
      http.post(
        '*/api/spaces/:spaceId/reservations',
        () =>
          HttpResponse.json(
            {
              error: {
                code: 'RESERVATION_CONFLICT',
                message: 'Slot already taken',
              },
            },
            { status: 409 },
          ),
        { once: true },
      ),
    );

    renderReservation();
    await goToSummary();
    await submit();

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('heading', { name: 'Ese horario ya fue tomado' }),
    ).toBeInTheDocument();
    expect(
      await within(dialog).findByText('Losa Municipal'),
    ).toBeInTheDocument();
  });

  it('no tiene violaciones de accesibilidad detectables por axe en el paso 1', async () => {
    renderReservation();
    await screen.findByRole('heading', { name: /Reservar · Cancha Central/ });

    const results = await runAxe();
    expect(results.violations).toEqual([]);
  });
});
