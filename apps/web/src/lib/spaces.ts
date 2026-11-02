import {
  CircleDot,
  Dumbbell,
  Goal,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';
import type { SpaceDto, SpaceType, TimeSlotDto } from '../types/api';
import {
  addDaysToDateKey,
  addMinutes,
  formatTimeRange,
  fromLimaWallClock,
  getLimaParts,
  hourOptions,
  minutesToTimeKey,
  timeKeyToMinutes,
  toLimaDateKey,
  todayLimaDateKey,
} from './datetime';

export interface SpaceTypeMeta {
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

export const SPACE_TYPE_META: Record<SpaceType, SpaceTypeMeta> = {
  CANCHA_FUTBOL: {
    label: 'Cancha de fútbol',
    shortLabel: 'Fútbol',
    icon: Goal,
  },
  LOSA_BASQUET: {
    label: 'Losa de básquet',
    shortLabel: 'Básquet',
    icon: CircleDot,
  },
  PISTA_TENIS: {
    label: 'Pista de tenis',
    shortLabel: 'Tenis',
    icon: Dumbbell,
  },
  MULTIPROPOSITO: {
    label: 'Multipropósito',
    shortLabel: 'Multipropósito',
    icon: LayoutGrid,
  },
};

export const SPACE_TYPE_OPTIONS: readonly {
  value: SpaceType | 'ALL';
  label: string;
  icon: LucideIcon;
}[] = [
  { value: 'ALL', label: 'Todos', icon: LayoutGrid },
  { value: 'CANCHA_FUTBOL', label: 'Fútbol', icon: Goal },
  { value: 'LOSA_BASQUET', label: 'Básquet', icon: CircleDot },
  { value: 'PISTA_TENIS', label: 'Tenis', icon: Dumbbell },
  { value: 'MULTIPROPOSITO', label: 'Multipropósito', icon: LayoutGrid },
];

export interface SpaceWindow {
  dateKey: string;
  startTime: string;
  endTime: string;
  startIso: string;
  endIso: string;
}

const windowForDate = (
  window: TimeSlotDto,
  dateKey: string,
): SpaceWindow | null => {
  const start = new Date(window.start);
  const end = new Date(window.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  if (toLimaDateKey(start) !== dateKey || toLimaDateKey(end) !== dateKey) {
    return null;
  }
  const startParts = getLimaParts(start);
  const endParts = getLimaParts(end);
  return {
    dateKey,
    startTime: minutesToTimeKey(startParts.hour * 60 + startParts.minute),
    endTime: minutesToTimeKey(endParts.hour * 60 + endParts.minute),
    startIso: window.start,
    endIso: window.end,
  };
};

export const getWindowsForDate = (
  space: SpaceDto,
  dateKey: string,
): SpaceWindow[] =>
  space.availabilityWindows
    .map((window) => windowForDate(window, dateKey))
    .filter((window): window is SpaceWindow => window !== null)
    .sort((a, b) => timeKeyToMinutes(a.startTime) - timeKeyToMinutes(b.startTime));

export const getWindowForDate = (
  space: SpaceDto,
  dateKey: string,
): SpaceWindow | null => getWindowsForDate(space, dateKey)[0] ?? null;

export const getSpaceHourOptions = (
  space: SpaceDto,
  dateKey: string,
): string[] => {
  const options = new Set<string>();
  for (const window of getWindowsForDate(space, dateKey)) {
    for (const hour of hourOptions(window.startTime, window.endTime)) {
      options.add(hour);
    }
  }
  return [...options].sort(
    (a, b) => timeKeyToMinutes(a) - timeKeyToMinutes(b),
  );
};

/** Ventana de hoy (America/Lima) o la próxima ventana disponible. */
export const getDisplayWindow = (space: SpaceDto): SpaceWindow | null => {
  const today = todayLimaDateKey();
  const todayWindow = getWindowForDate(space, today);
  if (todayWindow !== null) {
    return todayWindow;
  }
  for (let offset = 1; offset <= 30; offset += 1) {
    const window = getWindowForDate(space, addDaysToDateKey(today, offset));
    if (window !== null) {
      return window;
    }
  }
  return null;
};

export const describeWindow = (space: SpaceDto): string => {
  const window = getDisplayWindow(space);
  if (window === null) {
    return 'Sin ventana horaria';
  }
  const prefix =
    window.dateKey === todayLimaDateKey() ? 'Hoy' : 'Próxima fecha';
  return `${prefix} ${formatTimeRange(window.startIso, window.endIso)}`;
};

export interface SuggestedSlot {
  dateKey: string;
  startTime: string;
  endTime: string;
  startIso: string;
  endIso: string;
}

/**
 * Sugerencia "hoy + 1 hora" redondeada a la hora siguiente, dentro de la
 * ventana del espacio. Si hoy ya cerró, avanza al siguiente día con ventana.
 */
export const suggestSlot = (
  space: SpaceDto | undefined,
  durationHours = 2,
): SuggestedSlot => {
  const today = todayLimaDateKey();
  for (let offset = 0; offset <= 30; offset += 1) {
    const dateKey = addDaysToDateKey(today, offset);
    if (space !== undefined) {
      const window = getWindowForDate(space, dateKey);
      if (window === null) {
        continue;
      }
      const now = new Date();
      const nowMinutes = getLimaParts(now).hour * 60 + getLimaParts(now).minute;
      const earliest =
        offset === 0
          ? Math.max(
              timeKeyToMinutes(window.startTime),
              Math.ceil((nowMinutes + 60) / 60) * 60,
            )
          : timeKeyToMinutes(window.startTime);
      const latestStart =
        timeKeyToMinutes(window.endTime) - durationHours * 60;
      if (earliest <= latestStart) {
        const startTime = minutesToTimeKey(earliest);
        return buildSlot(dateKey, startTime, durationHours);
      }
      continue;
    }

    // Sin espacio seleccionado: 09:00 de hoy (o 08:00 si ya pasó la hora).
    const fallbackStart = offset === 0 ? 9 : 8;
    return buildSlot(
      dateKey,
      minutesToTimeKey(fallbackStart * 60),
      durationHours,
    );
  }

  return buildSlot(addDaysToDateKey(today, 1), '08:00', durationHours);
};

const buildSlot = (
  dateKey: string,
  startTime: string,
  durationHours: number,
): SuggestedSlot => {
  const start = fromLimaWallClock(dateKey, startTime);
  const end = addMinutes(start, durationHours * 60);
  const endParts = getLimaParts(end);
  return {
    dateKey,
    startTime,
    endTime: minutesToTimeKey(endParts.hour * 60 + endParts.minute),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
};
