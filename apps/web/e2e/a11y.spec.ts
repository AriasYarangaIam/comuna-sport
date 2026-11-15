import { expect, test, type Page } from '@playwright/test';
import { createRequire } from 'node:module';
import { installApiMock } from './mock-api';

// jsdom no calcula colores, así que el contraste solo es evaluable en un
// navegador real: esta es la única prueba que puede detectar la regresión.
const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve('axe-core/axe.min.js');

interface AxeViolation {
  id: string;
  nodes: Array<{ target: string; message: string }>;
}

const contrastViolations = async (page: Page): Promise<AxeViolation[]> => {
  await page.addScriptTag({ path: AXE_PATH });

  return page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            context: Document,
            options: unknown,
          ) => Promise<{
            violations: Array<{
              id: string;
              nodes: Array<{
                target: string[];
                any: Array<{ message: string }>;
              }>;
            }>;
          }>;
        };
      }
    ).axe;

    const results = await axe.run(document, {
      runOnly: { type: 'rule', values: ['color-contrast'] },
    });

    return results.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => ({
        target: node.target.join(' '),
        message: node.any.map((check) => check.message).join(' '),
      })),
    }));
  });
};

test.describe('Accesibilidad: contraste de texto (S1)', () => {
  test('la página de inicio no tiene texto con contraste insuficiente', async ({
    page,
  }) => {
    await installApiMock(page);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Espacios deportivos de tu comuna' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Cancha Central' }),
    ).toBeVisible();

    expect(await contrastViolations(page)).toEqual([]);
  });
});
