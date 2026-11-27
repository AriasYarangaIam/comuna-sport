import { Command } from "./command.interface";

// S4 (odd/tasks/demo-completion.md): the citizen frees a slot by cancelling the
// reservation whose UUID they hold — the reservation id is the credential.
export interface CancelReservationCommand extends Command {
    readonly type: 'CANCEL_RESERVATION';
    readonly reservationId: string;
}
