import { Command } from "./command.interface";

export interface CreateIncidentCommand extends Command {
    readonly type: 'CREATE_INCIDENT';
    readonly spaceId: string;
    readonly reporterId: string;
    readonly description: string;
}
