import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PriceSummary } from './PriceSummary';

describe('PriceSummary', () => {
  it('muestra la tarifa general sin ajustes', () => {
    render(<PriceSummary baseAmount={120} currency="PEN" role="NEIGHBOR" />);
    expect(screen.getByText('Resumen de tarifa')).toBeInTheDocument();
    expect(screen.getByText('Total a pagar')).toBeInTheDocument();
    expect(screen.getAllByText('S/ 120.00 PEN')).toHaveLength(2);
    expect(screen.queryByText(/Beneficio Adulto Mayor/)).not.toBeInTheDocument();
  });

  it('aplica el beneficio del adulto mayor', () => {
    render(<PriceSummary baseAmount={120} currency="PEN" role="SENIOR" />);
    expect(screen.getByText('Beneficio Adulto Mayor (−50 %)')).toBeInTheDocument();
    expect(screen.getByText('S/ 60.00 PEN')).toBeInTheDocument();
  });

  it('aplica el recargo del club privado', () => {
    render(<PriceSummary baseAmount={120} currency="PEN" role="PRIVATE_CLUB" />);
    expect(screen.getByText('Recargo solidario (+20 %)')).toBeInTheDocument();
    expect(screen.getByText('S/ 144.00 PEN')).toBeInTheDocument();
  });

  it('prioriza el total confirmado por el servidor', () => {
    render(
      <PriceSummary
        baseAmount={120}
        currency="PEN"
        role="SENIOR"
        totalAmount={65}
      />,
    );
    expect(screen.getByText('S/ 65.00 PEN')).toBeInTheDocument();
  });

  it('muestra el estado de cálculo y el error de tarifa', () => {
    const { rerender } = render(
      <PriceSummary baseAmount={120} currency="PEN" role="NEIGHBOR" status="calculating" />,
    );
    expect(screen.getByLabelText('Calculando tarifa')).toHaveAttribute(
      'aria-busy',
      'true',
    );

    rerender(
      <PriceSummary
        baseAmount={120}
        currency="PEN"
        role="NEIGHBOR"
        status="error"
        errorMessage="La tarifa no está disponible."
      />,
    );
    expect(screen.getByText('Error al calcular la tarifa')).toBeInTheDocument();
    expect(screen.getByText('La tarifa no está disponible.')).toBeInTheDocument();
  });
});
