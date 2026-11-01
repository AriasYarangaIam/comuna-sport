import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../../test/render';
import { server } from '../../test/server';
import { ExplorePage } from './ExplorePage';

const renderPage = () => renderWithProviders(<ExplorePage />);

const runAxe = async (): Promise<axe.AxeResults> =>
  axe.run(document.body, {
    rules: {
      // jsdom no calcula layout ni colores: la regla no es evaluable aquí.
      'color-contrast': { enabled: false },
      // La página se prueba sin el AppShell que aporta los landmarks.
      region: { enabled: false },
      'landmark-one-main': { enabled: false },
    },
  });

describe('ExplorePage (S1)', () => {
  it('muestra el estado de carga y luego el catálogo', async () => {
    renderPage();
    expect(screen.getByLabelText('Cargando espacios deportivos')).toBeInTheDocument();

    expect(
      await screen.findByRole('heading', { name: 'Cancha Central' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Losa Municipal' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Pista Los Álamos' }),
    ).toBeInTheDocument();
    expect(screen.getByText('3 espacios para ti')).toBeInTheDocument();
  });

  it('filtra por tipo y permite volver a todos', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Cancha Central' });

    await userEvent.click(screen.getByRole('button', { name: 'Tenis' }));
    expect(screen.getByRole('button', { name: 'Tenis' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('1 espacio para ti')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Cancha Central' }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(screen.getByText('3 espacios para ti')).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando el filtro no tiene resultados', async () => {
    server.use(
      http.get('*/api/spaces', () =>
        HttpResponse.json([
          {
            id: 'space-futbol-1',
            name: 'Cancha Central',
            type: 'CANCHA_FUTBOL',
            capacity: 22,
            basePrice: { amount: 120, currency: 'PEN' },
            isActive: true,
            availabilityWindows: [],
          },
        ]),
      ),
    );
    renderPage();
    await screen.findByRole('heading', { name: 'Cancha Central' });

    await userEvent.click(screen.getByRole('button', { name: 'Básquet' }));
    expect(
      screen.getByText('No hay espacios de este tipo en tu comuna'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ver todos' }));
    expect(screen.getByText('1 espacio para ti')).toBeInTheDocument();
  });

  it('traduce el error del backend y permite reintentar', async () => {
    server.use(
      http.get(
        '*/api/spaces',
        () =>
          HttpResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Internal failure' } },
            { status: 500 },
          ),
        { once: true },
      ),
    );

    renderPage();
    expect(
      await screen.findByText('Algo falló de nuestro lado'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Internal failure')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Reintentar/ }));;
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Cancha Central' }),
      ).toBeInTheDocument(),
    );
  });

  it('muestra el estado vacío del catálogo completo', async () => {
    server.use(http.get('*/api/spaces', () => HttpResponse.json([])));
    renderPage();
    expect(
      await screen.findByText('No hay espacios registrados'),
    ).toBeInTheDocument();
  });

  it('no tiene violaciones de accesibilidad detectables por axe', async () => {
    const { container } = renderPage();
    await screen.findByRole('heading', { name: 'Cancha Central' });

    const results = await runAxe();
    expect(results.violations).toEqual([]);
    expect(
      within(container).getByRole('heading', {
        level: 1,
        name: 'Espacios deportivos de tu comuna',
      }),
    ).toBeInTheDocument();
  });
});
