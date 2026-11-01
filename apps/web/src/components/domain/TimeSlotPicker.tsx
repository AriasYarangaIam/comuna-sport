import type { SpaceDto } from '../../types/api';
import {
  addDaysToDateKey,
  formatTimeRange,
  minutesToTimeKey,
  timeKeyToMinutes,
  todayLimaDateKey,
} from '../../lib/datetime';
import { getWindowForDate, getWindowsForDate } from '../../lib/spaces';
import { Select, TextInput } from '../ui/Input';

export interface SlotErrors {
  date?: string;
  start?: string;
  end?: string;
}

export interface TimeSlotPickerProps {
  space: SpaceDto;
  dateKey: string;
  startTime: string;
  endTime: string;
  errors: SlotErrors;
  onChange: (patch: {
    dateKey?: string;
    startTime?: string;
    endTime?: string;
  }) => void;
}

export function TimeSlotPicker({
  space,
  dateKey,
  startTime,
  endTime,
  errors,
  onChange,
}: TimeSlotPickerProps) {
  const windows = getWindowsForDate(space, dateKey);
  const window = getWindowForDate(space, dateKey);
  const today = todayLimaDateKey();
  const maxDate = addDaysToDateKey(today, 30);

  const startOptions = windows.flatMap((candidate) => {
    const options: string[] = [];
    const start = timeKeyToMinutes(candidate.startTime);
    const end = timeKeyToMinutes(candidate.endTime);
    for (let minute = start; minute < end; minute += 60) {
      options.push(minutesToTimeKey(minute));
    }
    return options;
  });

  const endOptions = window === null
    ? []
    : startOptions
        .filter((option) => timeKeyToMinutes(option) > timeKeyToMinutes(startTime))
        .filter((option) => timeKeyToMinutes(option) <= timeKeyToMinutes(window.endTime));

  const handleDateChange = (nextDate: string): void => {
    const nextWindow = getWindowForDate(space, nextDate);
    if (nextWindow === null) {
      onChange({ dateKey: nextDate, startTime: '', endTime: '' });
      return;
    }
    const start = nextWindow.startTime;
    const endMinute = Math.min(
      timeKeyToMinutes(start) + 120,
      timeKeyToMinutes(nextWindow.endTime),
    );
    onChange({
      dateKey: nextDate,
      startTime: start,
      endTime: minutesToTimeKey(endMinute),
    });
  };

  return (
    <div className="space-y-4">
      <TextInput
        label="Fecha"
        type="date"
        value={dateKey}
        min={today}
        max={maxDate}
        onChange={(event) => handleDateChange(event.target.value)}
        error={errors.date}
        required
      />

      {window === null ? (
        <p className="rounded-control border border-warning-bg bg-warning-bg px-3 py-2 text-small text-warning-text">
          Este espacio no tiene horario de atención para esa fecha. Elige otro
          día.
        </p>
      ) : (
        <>
          <p className="text-small text-ink-soft">
            Horario del espacio:{' '}
            <span className="font-medium tabular-nums text-ink">
              {formatTimeRange(window.startIso, window.endIso)}
            </span>{' '}
            (America/Lima).
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Hora de inicio"
              value={startTime}
              onChange={(event) => {
                const nextStart = event.target.value;
                const minimumEnd = timeKeyToMinutes(nextStart) + 60;
                const nextEnd =
                  timeKeyToMinutes(endTime) > timeKeyToMinutes(nextStart)
                    ? endTime
                    : minutesToTimeKey(
                        Math.min(minimumEnd, timeKeyToMinutes(window.endTime)),
                      );
                onChange({ startTime: nextStart, endTime: nextEnd });
              }}
              error={errors.start}
              required
            >
              <option value="">Selecciona una hora</option>
              {startOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>

            <Select
              label="Hora de fin"
              value={endTime}
              onChange={(event) => onChange({ endTime: event.target.value })}
              error={errors.end}
              required
            >
              <option value="">Selecciona una hora</option>
              {endOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        </>
      )}
    </div>
  );
}
