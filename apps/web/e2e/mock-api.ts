import type { Page, Route } from '@playwright/test';

const LIMA_OFFSET = '-05:00';

const limaDateKey = (date: Date): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 86_400_000);

const dailyWindows = (days = 31): Array<{ start: string; end: string }> => {
  const today = new Date();
  return Array.from({ length: days }, (_, offset) => {
    const dateKey = limaDateKey(addDays(today, offset));
    return {
      start: `${dateKey}T09:00:00${LIMA_OFFSET}`,
      end: `${dateKey}T21:00:00${LIMA_OFFSET}`,
    };
  });
};

const spaces = [
  {
    id: 'space-futbol-1',
    name: 'Cancha Central',
    type: 'CANCHA_FUTBOL',
    capacity: 22,
    basePrice: { amount: 120, currency: 'PEN' },
    isActive: true,
    availabilityWindows: dailyWindows(),
  },
  {
    id: 'space-basquet-1',
    name: 'Losa Municipal',
    type: 'LOSA_BASQUET',
    capacity: 10,
    basePrice: { amount: 60, currency: 'PEN' },
    isActive: true,
    availabilityWindows: dailyWindows(),
  },
  {
    id: 'space-tenis-1',
    name: 'Pista Los Álamos',
    type: 'PISTA_TENIS',
    capacity: 4,
    basePrice: { amount: 80, currency: 'PEN' },
    isActive: false,
    availabilityWindows: dailyWindows(),
  },
];

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

export interface ApiMock {
  /** Cantidad de POST de reservas recibidos. */
  reservationPosts: () => number;
}

/**
 * Intercepta `/api/**` en el navegador. El E2E no necesita el backend real
 * (que además no forma parte de este entregable) y valida el contrato DTO.
 */
export const installApiMock = async (page: Page): Promise<ApiMock> => {
  let posts = 0;

  await page.route('**/api/spaces/availability**', (route) =>
    json(
      route,
      spaces.filter((space) => space.isActive),
    ),
  );

  await page.route('**/api/spaces/*/reservations', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    posts += 1;
    const body = route.request().postDataJSON() as {
      userId: string;
      role: 'NEIGHBOR' | 'YOUTH' | 'SENIOR' | 'PRIVATE_CLUB';
      timeSlot: { start: string; end: string };
    };
    // Simula latencia de red para que el doble toque ocurra en vuelo.
    await new Promise((resolve) => setTimeout(resolve, 300));
    const amount =
      body.role === 'SENIOR' ? 60 : body.role === 'PRIVATE_CLUB' ? 144 : 120;
    await json(
      route,
      {
        id: 'reservation-e2e-1',
        spaceId: 'space-futbol-1',
        userId: body.userId,
        role: body.role,
        timeSlot: body.timeSlot,
        cost: { amount, currency: 'PEN' },
        createdAt: new Date().toISOString(),
        isActive: true,
      },
      201,
    );
  });

  await page.route(/\/api\/reservations\/[^/?]+$/, (route) =>
    json(route, {
      id: 'reservation-e2e-1',
      spaceId: 'space-futbol-1',
      userId: 'user-vecino-4589',
      role: 'SENIOR',
      timeSlot: {
        start: `${limaDateKey(new Date())}T10:00:00${LIMA_OFFSET}`,
        end: `${limaDateKey(new Date())}T12:00:00${LIMA_OFFSET}`,
      },
      cost: { amount: 60, currency: 'PEN' },
      createdAt: new Date().toISOString(),
      isActive: true,
    }),
  );

  await page.route(/\/api\/spaces\/(?!availability)[^/?]+$/, (route) => {
    const id = new URL(route.request().url()).pathname.split('/').pop();
    const space = spaces.find((candidate) => candidate.id === id);
    return space === undefined
      ? json(
          route,
          {
            error: {
              code: 'SPACE_NOT_FOUND',
              message: 'Space not found',
            },
          },
          404,
        )
      : json(route, space);
  });

  await page.route('**/api/spaces', (route) => json(route, spaces));

  await page.route('**/api/users/*/reservations', (route) => json(route, []));

  await page.route('**/api/spaces/*/incidents', (route) => json(route, []));

  return { reservationPosts: () => posts };
};
