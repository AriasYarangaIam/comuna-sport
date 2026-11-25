import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { makeIncident } from '../../test/fixtures';
import { renderWithProviders } from '../../test/render';
import { captured, server } from '../../test/server';
import { GestionPage } from './GestionPage';

const TOKEN_KEY = 'comunasport-admin-token';

const renderGestion = () =>
  renderWithProviders(<GestionPage />, { route: '/gestion' });

const enterCode = async (code: string): Promise<void> => {
  await userEvent.type(screen.getByLabelText(/Código de gestión/), code);
  await userEvent.click(screen.getByRole('button', { name: /Entrar/ }));
};

describe('GestionPage (S2)', () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('pide el código de gestión cuando no hay sesión y no expone reportes', async () => {
    renderGestion();
    expect(
      screen.getByRole('heading', { name: 'Gestión municipal' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Código de gestión/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Reportes del espacio' })).not.toBeInTheDocument();
  });

  it('valida que el código no esté vacío', async () => {
    renderGestion();
    await userEvent.click(screen.getByRole('button', { name: /Entrar/ }));
    expect(await screen.findByText('Ingresa el código de gestión.')).toBeInTheDocument();
  });

  it('con un código guarda la sesión y lista los reportes del espacio', async () => {
    renderGestion();
    await enterCode('codigo-de-prueba');

    expect(
      await screen.findByRole('heading', { name: 'Reportes del espacio' }),
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBe('codigo-de-prueba');
    expect(await screen.findByText(/La malla del arco está rota/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Aprobar/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rechazar/ })).toBeInTheDocument();
  });

  it('aprueba un reporte enviando el estado y el token en la cabecera', async () => {
    renderGestion();
    await enterCode('codigo-de-prueba');
    await screen.findByRole('button', { name: /Aprobar/ });

    await userEvent.click(screen.getByRole('button', { name: /Aprobar/ }));

    await waitFor(() => expect(captured.incidentPatches).toHaveLength(1));
    expect(captured.incidentPatches[0]?.state).toBe('APPROVED');
    expect(captured.incidentPatches[0]?.authorization).toBe('Bearer codigo-de-prueba');
    expect(await screen.findByText(/Reporte aprobado/)).toBeInTheDocument();
  });

  it('un código inválido se muestra como error de credencial y borra la sesión', async () => {
    server.use(
      http.patch('*/api/incidents/:incidentId', () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'The municipal management endpoint requires the configured bearer token.' } },
          { status: 401 },
        ),
      ),
    );
    renderGestion();
    await enterCode('codigo-equivocado');
    await screen.findByRole('button', { name: /Aprobar/ });

    await userEvent.click(screen.getByRole('button', { name: /Aprobar/ }));

    expect(
      await screen.findByText(/El código de gestión no es válido/),
    ).toBeInTheDocument();
    // La sesión se descarta: vuelve a pedir el código.
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(await screen.findByLabelText(/Código de gestión/)).toBeInTheDocument();
  });

  it('un reporte cerrado no ofrece acciones', async () => {
    server.use(
      http.get('*/api/spaces/:spaceSlug/incidents', () =>
        HttpResponse.json([makeIncident({ id: 'incident-cerrado', state: 'REJECTED' })]),
      ),
    );
    renderGestion();
    await enterCode('codigo-de-prueba');

    expect(await screen.findByText(/Ciclo cerrado/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprobar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Rechazar/ })).not.toBeInTheDocument();
  });
});
