class EntityNotFoundException extends Error {
    public constructor(
        public readonly code: string = 'SPACE_NOT_FOUND',
        message: string
    ) {
        super(message);
        this.name = 'EntityNotFoundException';
    }
}