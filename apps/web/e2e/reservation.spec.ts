import { expect, test } from '@playwright/test';
import { installApiMock } from './mock-api';

test.describe('Reserva de un espacio (S3 → S4)', () => {
  test('completa la reserva en 360 px sin desborde horizontal', async ({
    page,
  }) => {
    const api = await installApiMock(page);
    await page.goto('/reservar/space-futbol-1');

    await expect(
      page.getByRole('heading', { name: /Reservar · Cancha Central/ }),
    ).toBeVisible();

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);

    await page.getByLabel(/ID de usuario o DNI/).fill('user-vecino-4589');
    await page.getByRole('button', { name: /Continuar/ }).click();
    await expect(
      page.getByRole('heading', { name: 'Categoría comunitaria' }),
    ).toBeVisible();

    await page.getByText('Adulto mayor', { exact: true }).click();
    await expect(page.getByText('S/ 60.00 PEN').first()).toBeVisible();

    await page.getByRole('button', { name: /Continuar/ }).click();
    await expect(
      page.getByRole('heading', { name: 'Horario y tarifa' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Confirmar reserva' }).click();

    await expect(
      page.getByRole('heading', { name: 'Reserva confirmada' }),
    ).toBeVisible();
    await expect(page.getByText('reservation-e2e-1')).toBeVisible();
    expect(api.reservationPosts()).toBe(1);
  });

  test('permite operar el asistente solo con teclado', async ({ page }) => {
    await installApiMock(page);
    await page.goto('/reservar/space-futbol-1');

    const submit = page.getByRole('button', { name: /Continuar/ });
    await submit.focus();
    await page.keyboard.press('Enter');

    // El foco se mueve al primer campo inválido.
    const userId = page.getByLabel(/ID de usuario o DNI/);
    await expect(page.getByText('Ingresa tu identificador o DNI.')).toBeVisible();
    await expect(userId).toBeFocused();

    await userId.fill('user-teclado-1');
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('heading', { name: 'Categoría comunitaria' }),
    ).toBeVisible();

    await page.getByRole('button', { name: /Continuar/ }).focus();
    await page.keyboard.press('Space');
    await expect(
      page.getByRole('heading', { name: 'Horario y tarifa' }),
    ).toBeVisible();
  });

  test('un doble toque no duplica la reserva', async ({ page }) => {
    const api = await installApiMock(page);
    await page.goto('/reservar/space-futbol-1');

    await page.getByLabel(/ID de usuario o DNI/).fill('user-vecino-4589');
    await page.getByRole('button', { name: /Continuar/ }).click();
    await page.getByRole('button', { name: /Continuar/ }).click();

    const confirm = page.locator('form button[type="submit"]');
    await confirm.click();
    // Segundo toque inmediato mientras la petición está en curso.
    await confirm.click({ force: true, timeout: 1_000 }).catch(() => undefined);

    await expect(
      page.getByRole('heading', { name: 'Reserva confirmada' }),
    ).toBeVisible();
    expect(api.reservationPosts()).toBe(1);
  });

  test('muestra el estado de error traducido si el backend falla', async ({
    page,
  }) => {
    await installApiMock(page);
    await page.route('**/api/spaces/space-futbol-1', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'INTERNAL_ERROR', message: 'Internal failure' },
        }),
      }),
    );

    await page.goto('/reservar/space-futbol-1');

    await expect(page.getByText('Algo falló de nuestro lado')).toBeVisible();
    await expect(page.getByText('Internal failure')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /Reintentar/ }),
    ).toBeVisible();
  });
});
