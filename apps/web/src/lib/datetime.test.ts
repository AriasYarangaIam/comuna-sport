import { describe, expect, it } from 'vitest';
import {
  addDaysToDateKey,
  durationLabel,
  formatDateKeyLong,
  formatDateLong,
  formatDateTime,
  formatTimeRange,
  fromLimaWallClock,
  getLimaParts,
  hourOptions,
  isSameLimaDay,
  minutesToTimeKey,
  timeKeyToMinutes,
  toLimaDateKey,
  toLimaIso,
  toLimaTimeKey,
} from './datetime';

describe('datetime (America/Lima)', () => {
  it('convierte la hora de pared de Lima al instante UTC canónico', () => {
    expect(toLimaIso('2026-10-24', '10:00')).toBe('2026-10-24T15:00:00.000Z');
    expect(toLimaIso('2026-10-24', '12:00')).toBe('2026-10-24T17:00:00.000Z');
  });

  it('no aplica horario de verano en ningún mes', () => {
    expect(fromLimaWallClock('2026-01-15', '09:00').toISOString()).toBe(
      '2026-01-15T14:00:00.000Z',
    );
    expect(fromLimaWallClock('2026-07-15', '09:00').toISOString()).toBe(
      '2026-07-15T14:00:00.000Z',
    );
  });

  it('interpreta el día calendario en Lima, no en la zona del dispositivo', () => {
    // 02:00 UTC del 25 de octubre todavía es 24 de octubre en Lima.
    const instant = '2026-10-25T02:00:00.000Z';
    expect(toLimaDateKey(instant)).toBe('2026-10-24');
    expect(toLimaTimeKey(instant)).toBe('21:00');
    expect(getLimaParts(instant)).toEqual({
      year: 2026,
      month: 10,
      day: 24,
      hour: 21,
      minute: 0,
    });
  });

  it('compara días usando el calendario de Lima', () => {
    expect(
      isSameLimaDay('2026-10-24T15:00:00.000Z', '2026-10-25T02:00:00.000Z'),
    ).toBe(true);
    expect(
      isSameLimaDay('2026-10-24T15:00:00.000Z', '2026-10-25T15:00:00.000Z'),
    ).toBe(false);
  });

  it('formatea fechas y rangos en español', () => {
    expect(formatDateLong('2026-10-24T15:00:00.000Z')).toBe(
      'Sábado 24 de octubre de 2026',
    );
    expect(formatDateTime('2026-10-24T15:00:00.000Z')).toBe('24 oct 2026 · 10:00');
    expect(
      formatTimeRange('2026-10-24T15:00:00.000Z', '2026-10-24T17:00:00.000Z'),
    ).toBe('10:00–12:00');
    expect(formatDateKeyLong('2026-10-24')).toBe('Sábado 24 de octubre de 2026');
  });

  it('valida el formato de las claves de fecha y hora', () => {
    expect(() => fromLimaWallClock('24/10/2026', '10:00')).toThrow();
    expect(() => fromLimaWallClock('2026-10-24', '10')).toThrow();
  });

  it('suma días sin desbordar el mes', () => {
    expect(addDaysToDateKey('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDaysToDateKey('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('convierte horas a minutos y de vuelta', () => {
    expect(timeKeyToMinutes('09:30')).toBe(570);
    expect(minutesToTimeKey(570)).toBe('09:30');
    expect(minutesToTimeKey(1440)).toBe('00:00');
    expect(hourOptions('09:00', '12:00')).toEqual(['09:00', '10:00', '11:00']);
    expect(durationLabel(1)).toBe('1 hora');
    expect(durationLabel(2)).toBe('2 horas');
  });
});
