export type IncidentStateType = 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESOLVED';

export class IncidentState {
    private constructor(
        public readonly value: IncidentStateType
    ) {}

    static create(value: string): IncidentState {
        const valid: IncidentStateType[] = ['UNDER_REVIEW' ,'APPROVED', 'REJECTED', 'RESOLVED'];
        if (!valid.includes(value as IncidentStateType)) {
            throw new Error('invalid incident state');
        }
        return Object.freeze(new IncidentState(value as IncidentStateType));
    }   
}