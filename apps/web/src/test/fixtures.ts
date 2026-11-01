import {
  addDaysToDateKey,
  fromLimaWallClock,
  todayLimaDateKey,
} from '../lib/datetime';
import type { IncidentDto, ReservationDto, SpaceDto } from '../types/api';

/**
 * Ventanas de 09:00 a 21:00 (America/Lima) para hoy y los próximos 30 días.
 * Se generan en tiempo de ejecución para que las pruebas no dependan del día
 * en que se ejecuten.
 */
const dailyWindows = (days = 31): SpaceDto['availabilityWindows'] => {
  const today = todayLimaDateKey();
  return Array.from({ length: days }, (_, offset) => {
    const dateKey = addDaysToDateKey(today, offset);
    return {
      start: fromLimaWallClock(dateKey, '09:00').toISOString(),
      end: fromLimaWallClock(dateKey, '21:00').toISOString(),
    };
  });
};

export const makeSpace = (overrides: Partial<SpaceDto> = {}): SpaceDto => ({
  id: 'space-futbol-1',
  name: 'Cancha Central',
  type: 'CANCHA_FUTBOL',
  capacity: 22,
  basePrice: { amount: 120, currency: 'PEN' },
  isActive: true,
  availabilityWindows: dailyWindows(),
  ...overrides,
});

export const spacesFixture: SpaceDto[] = [
  makeSpace(),
  makeSpace({
    id: 'space-basquet-1',
    name: 'Losa Municipal',
    type: 'LOSA_BASQUET',
    capacity: 10,
    basePrice: { amount: 60, currency: 'PEN' },
  }),
  makeSpace({
    id: 'space-tenis-1',
    name: 'Pista Los Álamos',
    type: 'PISTA_TENIS',
    capacity: 4,
    basePrice: { amount: 80, currency: 'PEN' },
    isActive: false,
  }),
];

export const makeReservation = (
  overrides: Partial<ReservationDto> = {},
): ReservationDto => ({
  id: 'reservation-1',
  spaceId: 'space-futbol-1',
  userId: 'user-vecino-4589',
  role: 'NEIGHBOR',
  timeSlot: {
    start: fromLimaWallClock(todayLimaDateKey(), '10:00').toISOString(),
    end: fromLimaWallClock(todayLimaDateKey(), '12:00').toISOString(),
  },
  cost: { amount: 120, currency: 'PEN' },
  createdAt: fromLimaWallClock(todayLimaDateKey(), '08:00').toISOString(),
  isActive: true,
  ...overrides,
});

export const makeIncident = (
  overrides: Partial<IncidentDto> = {},
): IncidentDto => ({
  id: 'incident-1',
  spaceId: 'space-futbol-1',
  reporterId: 'user-vecino-4589',
  description: 'La malla del arco está rota.',
  state: 'UNDER_REVIEW',
  createdAt: fromLimaWallClock(todayLimaDateKey(), '08:30').toISOString(),
  resolvedAt: null,
  ...overrides,
});
