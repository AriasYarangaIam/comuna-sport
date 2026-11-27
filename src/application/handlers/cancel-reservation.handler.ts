import { Reservation } from "../../domain/entities/reservation.entity";
import { EntityNotFoundException } from "../../domain/exceptions/entity-not-found.exception";
import { ReservationConflictException } from "../../domain/exceptions/reservation-conflict.exception";
import { ReservationReader, ReservationWriter } from "../../domain/repositories/reservation.repository";
import { SpaceReader } from "../../domain/repositories/space.repository";
import { slugify } from "../../domain/services/slugify";
import { ReservationId } from "../../domain/value-objects/reservation-id.vo";
import { CancelReservationCommand } from "../commands/cancel-reservation.command";
import { ReservationResponseDto, toReservationResponseDto } from "../dtos/reservation-response.dto";
import { CommandHandler } from "../ports/command-bus.interface";

// S4 (odd/tasks/demo-completion.md): cancelling is a soft delete — the aggregate
// flips isActive, so ReservationReader.findBySpaceAndSlot stops seeing it and the
// band becomes reservable again. A second cancel is a conflict, not a silent
// success: the citizen learns the reservation was already released.
export class CancelReservationHandler implements CommandHandler<CancelReservationCommand, ReservationResponseDto> {
    public readonly commandType: CancelReservationCommand['type'] = 'CANCEL_RESERVATION';

    public constructor(
        private readonly reservationReader: ReservationReader,
        private readonly reservationWriter: ReservationWriter,
        private readonly spaceReader: SpaceReader
    ) {}

    public async execute(command: CancelReservationCommand): Promise<ReservationResponseDto> {
        const reservationId: ReservationId = ReservationId.create(command.reservationId);

        const reservation: Reservation | null = await this.reservationReader.findById(reservationId);
        if (reservation === null) {
            throw new EntityNotFoundException(`reservation not found: ${command.reservationId}`, 'RESERVATION_NOT_FOUND');
        }

        try {
            reservation.cancel();
        } catch (error: unknown) {
            const message: string = error instanceof Error ? error.message : 'reservation already cancelled';
            throw new ReservationConflictException(`${message}: ${command.reservationId}`);
        }

        await this.reservationWriter.save(reservation);

        const space = await this.spaceReader.findById(reservation.spaceId);
        if (space === null) {
            throw new EntityNotFoundException(`space not found: ${reservation.spaceId.value}`, 'SPACE_NOT_FOUND');
        }

        return toReservationResponseDto(reservation, slugify(space.name));
    }
}
