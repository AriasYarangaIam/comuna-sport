export class EntityNotFoundException extends Error {
    public constructor(
        message: string,
        public readonly code: string = 'SPACE_NOT_FOUND'
    ) {
        super(message);
        this.name = 'EntityNotFoundException';
    }
}
