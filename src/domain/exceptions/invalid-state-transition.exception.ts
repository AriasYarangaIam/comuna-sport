export class InvalidStateTransitionException extends Error {
    public constructor(
        message: string = 'invalid state transition',
        public readonly code: string = 'STATE_TRANSITION_INVALID',
    ) {
        super(message);
        this.name = 'InvalidStateTransitionException';
    }
}