export class TimeSlot {
    private constructor(
        public readonly start: Date,
        public readonly end: Date,

    ) {}

    static create(start: Date, end: Date): TimeSlot {
        if (end <= start) throw new Error('slot end must be after start');
        if (start.toDateString() !== end.toDateString()) throw new Error('slot must be within the same calendar');
        
        return Object.freeze(new TimeSlot(start, end));
    }

    overlaps(other: TimeSlot): boolean {
        return this.start < other.end && other.start < this.end;
    }
}