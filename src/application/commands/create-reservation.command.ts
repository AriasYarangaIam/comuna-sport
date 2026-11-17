import { UserRoleType } from "../../domain/value-objects/user-role.vo";
import { Command } from "./command.interface";

export interface CreateReservationCommand extends Command {
    readonly type: 'CREATE_RESERVATION';
    readonly spaceSlug: string;
    readonly dni: string;
    readonly timeSlot: { start: string; end: string };
    readonly role: UserRoleType;
}
