/**
 * Utilidades de fecha y hora para el negocio de ComunaSport.
 *
 * Regla crítica (DESIGN.md §6.4): el dominio valida el día calendario en
 * America/Lima. El cliente construye los instantes como hora de pared de Lima
 * y los serializa a ISO UTC; nunca interpreta una fecha con la zona del
 * dispositivo. Lima es UTC−5 todo el año (sin horario de verano).
 */
export const LIMA_TIME_ZONE = 'America/Lima';

const LIMA_UTC_OFFSET = '-05:00';

const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

const MONTHS_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

const WEEKDAYS_LONG = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const;

export interface LimaDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const pad = (value: number): string => String(value).padStart(2, '0');

const asDate = (value: Date | string): Date => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${String(value)}`);
  }
  return date;
};

const limaPartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: LIMA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export const getLimaParts = (value: Date | string): LimaDateParts => {
  const date = asDate(value);
  const parts = limaPartsFormatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((candidate) => candidate.type === type);
    return part === undefined ? 0 : Number(part.value);
  };
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
  };
};

/** `YYYY-MM-DD` en el calendario de America/Lima. */
export const toLimaDateKey = (value: Date | string): string => {
  const parts = getLimaParts(value);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
};

/** `HH:mm` en America/Lima. */
export const toLimaTimeKey = (value: Date | string): string => {
  const parts = getLimaParts(value);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
};

export const todayLimaDateKey = (): string => toLimaDateKey(new Date());

/**
 * Construye el instante UTC a partir de una hora de pared de Lima.
 * `fromLimaWallClock('2026-10-24', '10:00')` → 2026-10-24T15:00:00.000Z.
 */
export const fromLimaWallClock = (dateKey: string, timeKey: string): Date => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  if (!/^\d{2}:\d{2}$/.test(timeKey)) {
    throw new Error(`Invalid time key: ${timeKey}`);
  }
  const date = new Date(`${dateKey}T${timeKey}:00${LIMA_UTC_OFFSET}`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid Lima wall clock: ${dateKey} ${timeKey}`);
  }
  return date;
};

export const toLimaIso = (dateKey: string, timeKey: string): string =>
  fromLimaWallClock(dateKey, timeKey).toISOString();

export const addMinutes = (value: Date | string, minutes: number): Date => {
  const date = asDate(value);
  return new Date(date.getTime() + minutes * 60_000);
};

export const addDaysToDateKey = (dateKey: string, days: number): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const base = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  base.setUTCDate(base.getUTCDate() + days);
  return `${base.getUTCFullYear()}-${pad(base.getUTCMonth() + 1)}-${pad(base.getUTCDate())}`;
};

export const dateKeyWeekday = (dateKey: string): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  return WEEKDAYS_LONG[date.getUTCDay()] ?? '';
};

export const formatDateLong = (value: Date | string): string => {
  const parts = getLimaParts(value);
  const weekday = dateKeyWeekday(
    `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
  );
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalized} ${parts.day} de ${MONTHS_LONG[parts.month - 1]} de ${parts.year}`;
};

export const formatDateCompact = (value: Date | string): string => {
  const parts = getLimaParts(value);
  return `${parts.day} ${MONTHS_SHORT[parts.month - 1]} ${parts.year}`;
};

export const formatTime = (value: Date | string): string => toLimaTimeKey(value);

export const formatTimeRange = (
  start: Date | string,
  end: Date | string,
): string => `${formatTime(start)}–${formatTime(end)}`;

export const formatDateTime = (value: Date | string): string =>
  `${formatDateCompact(value)} · ${formatTime(value)}`;

export const formatDateKeyCompact = (dateKey: string): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return `${day ?? 1} ${MONTHS_SHORT[(month ?? 1) - 1]} ${year ?? 0}`;
};

export const formatDateKeyLong = (dateKey: string): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const weekday = dateKeyWeekday(dateKey);
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalized} ${day ?? 1} de ${MONTHS_LONG[(month ?? 1) - 1]} de ${year ?? 0}`;
};

export const isSameLimaDay = (
  first: Date | string,
  second: Date | string,
): boolean => toLimaDateKey(first) === toLimaDateKey(second);

export const timeKeyToMinutes = (timeKey: string): number => {
  const [hours, minutes] = timeKey.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
};

export const minutesToTimeKey = (minutes: number): string => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
};

/** Lista de horas enteras entre dos horas de pared, inclusive el inicio. */
export const hourOptions = (startTime: string, endTime: string): string[] => {
  const start = timeKeyToMinutes(startTime);
  const end = timeKeyToMinutes(endTime);
  const options: string[] = [];
  for (let current = start; current < end; current += 60) {
    options.push(minutesToTimeKey(current));
  }
  return options;
};

export const durationLabel = (hours: number): string =>
  hours === 1 ? '1 hora' : `${hours} horas`;
