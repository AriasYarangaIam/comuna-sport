import { Command } from "../commands/command.interface";

export interface CommandHandler<TCommand extends Command, TResult> {
    readonly commandType: TCommand['type'];
    execute(command: TCommand): Promise<TResult>;
}

export interface CommandBus {
    register<TCommand extends Command, TResult>(handler: CommandHandler<TCommand, TResult>): void;
    execute<TResult>(command: Command): Promise<TResult>;
}
