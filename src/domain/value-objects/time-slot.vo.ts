export const BUSINESS_TIME_ZONE = 'America/Lima';

const toBusinessDateKey = (date: Date): string =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone: BUSINESS_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);

export class TimeSlot {
    private constructor(
        public readonly start: Date,
        public readonly end: Date,

    ) {}

    static create(start: Date, end: Date): TimeSlot {
        if (end <= start) throw new Error('slot end must be after start');
        if (toBusinessDateKey(start) !== toBusinessDateKey(end)) throw new Error('slot must be within the same calendar');
        
        return Object.freeze(new TimeSlot(start, end));
    }

    overlaps(other: TimeSlot): boolean {
        return this.start < other.end && other.start < this.end;
    }
}
