import { Command } from "../commands/command.interface";
import { CommandBus, CommandHandler } from "../ports/command-bus.interface";

export class CommandBusService implements CommandBus {
    private readonly handlers = new Map<string, CommandHandler<Command, unknown>>();

    public register<TCommand extends Command, TResult>(handler: CommandHandler<TCommand, TResult>): void {
        // Permitted variance cast for the heterogeneous handler map — the ONLY `as` in this class.
        this.handlers.set(handler.commandType, handler as CommandHandler<Command, unknown>);
    }

    public async execute<TResult>(command: Command): Promise<TResult> {
        const handler = this.handlers.get(command.type);
        if (handler === undefined) {
            throw new Error(`No handler registered for command: ${command.type}`);
        }
        // Promise-level variance cast (DEVELOPMENT.md §10 CommandBus note) — no `any`, no payload casts.
        return handler.execute(command) as Promise<TResult>;
    }
}
