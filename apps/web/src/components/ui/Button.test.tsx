import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renderiza su contenido y respeta el tipo por defecto', () => {
    render(<Button>Continuar</Button>);
    const button = screen.getByRole('button', { name: 'Continuar' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toBeEnabled();
  });

  it('se deshabilita y anuncia el estado de carga', () => {
    render(
      <Button loading loadingLabel="Procesando…">
        Confirmar reserva
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Procesando…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Confirmar reserva')).not.toBeInTheDocument();
  });

  it('no dispara onClick mientras está cargando', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Guardar
      </Button>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('ejecuta onClick y expone la ref del elemento nativo', async () => {
    const onClick = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button ref={ref} onClick={onClick} variant="secondary">
        Reintentar
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(ref.current?.tagName).toBe('BUTTON');
  });
});
