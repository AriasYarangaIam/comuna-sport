export class Cost {
    private constructor(
        public readonly amount: number,
        public readonly currency: string
    ) {}

    static create(amount: number, currency: string): Cost {
        if (amount < 0) throw new Error('base price must be non-negative');
        if (!currency || currency.trim() === '') throw new Error('currency is required');
        return Object.freeze(new Cost(amount, currency));
    }

    static fromCalculation(rawAmount: number, currency: string = 'PEN'): Cost {
        const rounded: number = Math.round((rawAmount + Number.EPSILON) * 100) / 100;
        return Cost.create(rounded, currency);
    }
}