import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { makeReservation } from '../../test/fixtures';
import { renderWithProviders } from '../../test/render';
import { server } from '../../test/server';
import { MyReservationsPage } from './MyReservationsPage';

const renderPage = () => renderWithProviders(<MyReservationsPage />);

const runAxe = async (): Promise<axe.AxeResults> =>
  axe.run(document.body, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
      'landmark-one-main': { enabled: false },
    },
  });

describe('MyReservationsPage (S5)', () => {
  it('pide el identificador antes de buscar', () => {
    renderPage();
    expect(
      screen.getByText('Ingresa tu identificador'),
    ).toBeInTheDocument();
  });

  it('valida que el identificador no esté vacío', async () => {
    renderPage();
    await userEvent.click(
      screen.getByRole('button', { name: /Buscar reservas/ }),
    );
    expect(
      await screen.findByText('Ingresa tu identificador para buscar tus reservas.'),
    ).toBeInTheDocument();
  });

  it('lista las reservas del identificador y permite filtrarlas', async () => {
    server.use(
      http.get('*/api/users/:userId/reservations', () =>
        HttpResponse.json([
          makeReservation({ id: 'reservation-active' }),
          makeReservation({ id: 'reservation-old', isActive: false }),
        ]),
      ),
    );

    renderPage();
    await userEvent.type(
      screen.getByLabelText(/ID de usuario o DNI/),
      'user-vecino-4589',
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Buscar reservas/ }),
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Reservas de user-vecino-4589',
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText('2 reservas registradas')).toBeInTheDocument();
    expect(screen.getAllByText('Cancha Central')).toHaveLength(2);

    const filter = screen.getByRole('group', {
      name: 'Filtrar reservas por estado',
    });
    await userEvent.click(within(filter).getByRole('button', { name: /Activas/ }));
    expect(screen.getAllByText('Cancha Central')).toHaveLength(1);
    expect(screen.getByText('Activa')).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay reservas', async () => {
    renderPage();
    await userEvent.type(
      screen.getByLabelText(/ID de usuario o DNI/),
      'user-sin-reservas',
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Buscar reservas/ }),
    );

    expect(
      await screen.findByText('Aún no tienes reservas con este identificador'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Explorar espacios' }),
    ).toHaveAttribute('href', '/');
  });

  it('no tiene violaciones de accesibilidad detectables por axe', async () => {
    renderPage();
    await userEvent.type(
      screen.getByLabelText(/ID de usuario o DNI/),
      'user-vecino-4589',
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Buscar reservas/ }),
    );
    await screen.findByRole('heading', {
      name: 'Reservas de user-vecino-4589',
    });

    const results = await runAxe();
    expect(results.violations).toEqual([]);
  });
});
