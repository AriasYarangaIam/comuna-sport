import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { makeSpace } from '../../test/fixtures';
import { SpaceCard } from './SpaceCard';

const renderCard = (space = makeSpace()) =>
  render(
    <MemoryRouter>
      <SpaceCard space={space} />
    </MemoryRouter>,
  );

describe('SpaceCard', () => {
  it('muestra nombre, tipo, aforo, tarifa y ventana horaria', () => {
    renderCard();
    expect(
      screen.getByRole('heading', { name: 'Cancha Central' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Fútbol')).toBeInTheDocument();
    expect(screen.getByText('22 personas')).toBeInTheDocument();
    expect(screen.getByText('S/ 120.00 PEN')).toBeInTheDocument();
    expect(screen.getByText(/Hoy \d{2}:\d{2}–\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('enlaza a disponibilidad y a reporte de incidentes', () => {
    renderCard();
    expect(
      screen.getByRole('link', { name: /Ver horarios y reservar/ }),
    ).toHaveAttribute('href', '/disponibilidad?spaceId=space-futbol-1');
    expect(
      screen.getByRole('link', { name: /Reportar un daño/ }),
    ).toHaveAttribute('href', '/incidentes?spaceId=space-futbol-1');
  });

  it('bloquea la reserva cuando el espacio está inactivo', () => {
    renderCard(makeSpace({ isActive: false }));
    expect(screen.getByText('No disponible')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(
      screen.queryByRole('link', { name: /Ver horarios y reservar/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Este espacio está fuera de servicio temporalmente.'),
    ).toBeInTheDocument();
  });
});
