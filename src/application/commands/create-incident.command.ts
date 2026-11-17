import { Command } from "./command.interface";

export interface CreateIncidentCommand extends Command {
    readonly type: 'CREATE_INCIDENT';
    readonly spaceSlug: string;
    readonly dni: string;
    readonly description: string;
}
