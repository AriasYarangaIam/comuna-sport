import { Reservation } from "../../domain/entities/reservation.entity";
import { DomainEventBus } from "../../domain/events/domain-event-bus.interface";
import { ReservationConfirmedEvent } from "../../domain/events/reservation-confirmed.event";
import { EntityNotFoundException } from "../../domain/exceptions/entity-not-found.exception";
import { ReservationConflictException } from "../../domain/exceptions/reservation-conflict.exception";
import { ReservationReader, ReservationWriter } from "../../domain/repositories/reservation.repository";
import { SpaceReader } from "../../domain/repositories/space.repository";
import { CostStrategyFactory } from "../../domain/services/cost-calculation/cost-strategy-factory";
import { SpaceId } from "../../domain/value-objects/space-id.vo";
import { TimeSlot } from "../../domain/value-objects/time-slot.vo";
import { UserRole } from "../../domain/value-objects/user-role.vo";
import { CreateReservationCommand } from "../commands/create-reservation.command";
import { ReservationResponseDto } from "../dtos/reservation-response.dto";
import { CommandHandler } from "../ports/command-bus.interface";

export class CreateReservationHandler implements CommandHandler<CreateReservationCommand, ReservationResponseDto> {
    public readonly commandType: CreateReservationCommand['type'] = 'CREATE_RESERVATION';

    public constructor(
        private readonly spaceReader: SpaceReader,
        private readonly reservationReader: ReservationReader,
        private readonly reservationWriter: ReservationWriter,
        private readonly costStrategyFactory: CostStrategyFactory,
        private readonly eventBus: DomainEventBus
    ) {}

    public async execute(command: CreateReservationCommand): Promise<ReservationResponseDto> {
        const spaceId: SpaceId = SpaceId.create(command.spaceId);
        const timeSlot: TimeSlot = TimeSlot.create(new Date(command.timeSlot.start), new Date(command.timeSlot.end));
        const role: UserRole = UserRole.create(command.role);

        const space = await this.spaceReader.findById(spaceId);
        if (space === null) {
            throw new EntityNotFoundException(`space not found: ${command.spaceId}`);
        }
        if (!space.isActive) {
            throw new EntityNotFoundException(`space is inactive: ${command.spaceId}`);
        }
        if (!space.isSlotWithinAvailability(timeSlot)) {
            throw new Error('time slot is outside the space availability windows');
        }

        const conflictingReservation = await this.reservationReader.findBySpaceAndSlot(spaceId, timeSlot);
        if (conflictingReservation !== null) {
            throw new ReservationConflictException(`time slot already reserved for space: ${command.spaceId}`);
        }

        const costStrategy = this.costStrategyFactory.createForRole(role.value);
        const cost = costStrategy.calculate(space.basePrice);

        const reservation = Reservation.create({
            spaceId: spaceId,
            userId: command.userId,
            timeSlot: timeSlot,
            cost: cost,
            role: role
        });

        await this.reservationWriter.save(reservation);

        await this.eventBus.publish(new ReservationConfirmedEvent({
            reservationId: reservation.id,
            spaceId: reservation.spaceId,
            userId: reservation.userId,
            cost: reservation.cost,
            timeSlot: reservation.timeSlot
        }));

        return toReservationResponseDto(reservation);
    }
}

function toReservationResponseDto(reservation: Reservation): ReservationResponseDto {
    return {
        id: reservation.id.value,
        spaceId: reservation.spaceId.value,
        userId: reservation.userId,
        role: reservation.role.value,
        timeSlot: {
            start: reservation.timeSlot.start.toISOString(),
            end: reservation.timeSlot.end.toISOString()
        },
        cost: {
            amount: reservation.cost.amount,
            currency: reservation.cost.currency
        },
        createdAt: reservation.createdAt.toISOString(),
        isActive: reservation.isActive
    };
}
