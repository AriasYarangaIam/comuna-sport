export interface DomainEvent {
    readonly type: string,
    readonly occurredOn: Date
}

export interface EventListener<TEvent extends DomainEvent> {
    handle(event: TEvent): Promise<void>;
}