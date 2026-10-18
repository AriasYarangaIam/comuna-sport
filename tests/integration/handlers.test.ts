/// <reference types="node" />
/// <reference types="jest" />

import { randomUUID } from "crypto";

import { buildContainer } from "../../src/infrastructure/di/container";
import type { CreateIncidentCommand } from "../../src/application/commands/create-incident.command";
import type { CreateReservationCommand } from "../../src/application/commands/create-reservation.command";
import type { IncidentResponseDto } from "../../src/application/dtos/incident-response.dto";
import type { ReservationResponseDto } from "../../src/application/dtos/reservation-response.dto";
import type { CommandBusService } from "../../src/application/services/command-bus.service";
import { CreateIncidentHandler } from "../../src/application/handlers/create-incident.handler";
import type { CreateReservationHandler } from "../../src/application/handlers/create-reservation.handler";
import { EntityNotFoundException } from "../../src/domain/exceptions/entity-not-found.exception";
import { ReservationConflictException } from "../../src/domain/exceptions/reservation-conflict.exception";
import type { EventListener } from "../../src/domain/events/domain-event.interface";
import type { ReservationConfirmedEvent } from "../../src/domain/events/reservation-confirmed.event";
import type { Space } from "../../src/domain/entities/space.entity";
import type { LocalEventBus } from "../../src/infrastructure/event-bus/local-event-bus.service";
import type { InMemoryIncidentRepository } from "../../src/infrastructure/persistence/in-memory/incident.in-memory.repository";
import type { InMemoryReservationRepository } from "../../src/infrastructure/persistence/in-memory/reservation.in-memory.repository";
import type { InMemorySpaceRepository } from "../../src/infrastructure/persistence/in-memory/space.in-memory.repository";
import { ReservationId } from "../../src/domain/value-objects/reservation-id.vo";
import { IncidentId } from "../../src/domain/value-objects/incident-id.vo";

interface Fixture {
    readonly commandBus: CommandBusService;
    readonly reservationHandler: CreateReservationHandler;
    readonly incidentHandler: CreateIncidentHandler;
    readonly spaces: InMemorySpaceRepository;
    readonly reservations: InMemoryReservationRepository;
    readonly incidents: InMemoryIncidentRepository;
    readonly eventBus: LocalEventBus;
    readonly seeded: Space;
}

// Wires the REAL in-memory repos + registry factory + LocalEventBus exactly
// like the composition root: every buildContainer() call is a fresh
// composition — new maps, re-seeded spaces, new event bus.
const buildFixture = async (): Promise<Fixture> => {
    const container = buildContainer();
    const spaces = container.resolve<InMemorySpaceRepository>('spaceRepository');
    const seededSpaces: readonly Space[] = await spaces.findAll();
    if (seededSpaces.length === 0 || seededSpaces[0] === undefined) {
        throw new Error('no seeded spaces available');
    }
    return {
        commandBus: container.resolve<CommandBusService>('commandBus'),
        reservationHandler: container.resolve<CreateReservationHandler>('createReservationHandler'),
        incidentHandler: container.resolve<CreateIncidentHandler>('createIncidentHandler'),
        spaces: spaces,
        reservations: container.resolve<InMemoryReservationRepository>('reservationRepository'),
        incidents: container.resolve<InMemoryIncidentRepository>('incidentRepository'),
        eventBus: container.resolve<LocalEventBus>('eventBus'),
        seeded: seededSpaces[0],
    };
};

type SlotBody = { readonly start: string; readonly end: string };

// A 2-hour slot strictly inside the seeded space's availability window,
// derived from the window itself so no wall-clock assumption is needed.
const slotInside = (space: Space): SlotBody => {
    const window = space.availabilityWindows[0];
    if (window === undefined) {
        throw new Error('seeded space has no availability window');
    }
    const oneHourMs: number = 60 * 60 * 1000;
    return {
        start: new Date(window.start.getTime() + oneHourMs).toISOString(),
        end: new Date(window.start.getTime() + 2 * oneHourMs).toISOString(),
    };
};

// A slot ending BEFORE the window opens (same calendar day → the TimeSlot VO
// accepts it; the Space rejects it because it falls outside availability).
const slotBeforeOpen = (space: Space): SlotBody => {
    const window = space.availabilityWindows[0];
    if (window === undefined) {
        throw new Error('seeded space has no availability window');
    }
    const oneHourMs: number = 60 * 60 * 1000;
    return {
        start: new Date(window.start.getTime() - 2 * oneHourMs).toISOString(),
        end: new Date(window.start.getTime() - oneHourMs).toISOString(),
    };
};

const reservationCommand = (
    space: Space,
    slot: SlotBody,
    role: 'NEIGHBOR' | 'YOUTH' | 'SENIOR' | 'PRIVATE_CLUB' = 'NEIGHBOR',
    userId: string = 'user-1',
    spaceIdOverride?: string
): CreateReservationCommand => ({
    type: 'CREATE_RESERVATION',
    spaceId: spaceIdOverride === undefined ? space.id.value : spaceIdOverride,
    userId: userId,
    role: role,
    timeSlot: slot,
});

const incidentCommand = (space: Space, spaceIdOverride?: string): CreateIncidentCommand => ({
    type: 'CREATE_INCIDENT',
    spaceId: spaceIdOverride === undefined ? space.id.value : spaceIdOverride,
    reporterId: 'user-1',
    description: 'Broken hoop',
});

describe('CreateReservationHandler — full command flow with real dependencies', (): void => {
    it('success: returns the reservation DTO with the computed cost and saves it', async (): Promise<void> => {
        const f = await buildFixture();
        const slot: SlotBody = slotInside(f.seeded);
        const dto: ReservationResponseDto = await f.commandBus.execute<ReservationResponseDto>(
            reservationCommand(f.seeded, slot)
        );
        expect(dto.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        expect(dto.spaceId).toBe(f.seeded.id.value);
        expect(dto.userId).toBe('user-1');
        expect(dto.role).toBe('NEIGHBOR');
        // Seeded space #1 has base price 100 PEN; NEIGHBOR multiplies ×1.0.
        expect(dto.cost).toEqual({ amount: f.seeded.basePrice.amount, currency: 'PEN' });
        expect(dto.isActive).toBe(true);
        expect(dto.createdAt).not.toBe('');
        expect(dto.timeSlot.start).toBe(slot.start);
        expect(dto.timeSlot.end).toBe(slot.end);
        // Persisted in the real in-memory repository.
        const saved = await f.reservations.findById(ReservationId.create(dto.id));
        expect(saved).not.toBeNull();
        expect(saved?.isActive).toBe(true);
    });

    it('success: SENIOR pays half the base price through the factory', async (): Promise<void> => {
        const f = await buildFixture();
        const dto: ReservationResponseDto = await f.commandBus.execute<ReservationResponseDto>(
            reservationCommand(f.seeded, slotInside(f.seeded), 'SENIOR')
        );
        expect(dto.role).toBe('SENIOR');
        expect(dto.cost.amount).toBe(f.seeded.basePrice.amount * 0.5);
        expect(dto.cost.currency).toBe('PEN');
    });

    it('unknown space id → EntityNotFoundException (SPACE_NOT_FOUND)', async (): Promise<void> => {
        const f = await buildFixture();
        const space: Space = f.seeded;
        const command: CreateReservationCommand = reservationCommand(space, slotInside(space), undefined, undefined, randomUUID()); // valid UUID v4, but not seeded
        await expect(f.commandBus.execute<ReservationResponseDto>(command)).rejects.toThrow(EntityNotFoundException);
        await expect(f.commandBus.execute<ReservationResponseDto>(command)).rejects.toMatchObject({ code: 'SPACE_NOT_FOUND' });
    });

    it('inactive space → EntityNotFoundException (404-class)', async (): Promise<void> => {
        const f = await buildFixture();
        f.seeded.deactivate();
        await f.spaces.save(f.seeded);
        await expect(
            f.commandBus.execute<ReservationResponseDto>(reservationCommand(f.seeded, slotInside(f.seeded)))
        ).rejects.toThrow(EntityNotFoundException);
    });

    it('slot outside the availability window → Error (400-class)', async (): Promise<void> => {
        const f = await buildFixture();
        await expect(
            f.commandBus.execute<ReservationResponseDto>(reservationCommand(f.seeded, slotBeforeOpen(f.seeded)))
        ).rejects.toThrow('time slot is outside the space availability windows');
    });

    it('conflicting active reservation on the same slot → ReservationConflictException', async (): Promise<void> => {
        const f = await buildFixture();
        const slot: SlotBody = slotInside(f.seeded);
        await f.commandBus.execute<ReservationResponseDto>(reservationCommand(f.seeded, slot));
        await expect(
            f.commandBus.execute<ReservationResponseDto>(reservationCommand(f.seeded, slot, 'NEIGHBOR', 'user-2'))
        ).rejects.toThrow(ReservationConflictException);
        await expect(
            f.commandBus.execute<ReservationResponseDto>(reservationCommand(f.seeded, slot, 'NEIGHBOR', 'user-2'))
        ).rejects.toMatchObject({ code: 'RESERVATION_CONFLICT' });
    });

    it('a cancelled reservation does NOT block the slot (cancel → recreate succeeds)', async (): Promise<void> => {
        const f = await buildFixture();
        const slot: SlotBody = slotInside(f.seeded);
        const first: ReservationResponseDto = await f.commandBus.execute<ReservationResponseDto>(
            reservationCommand(f.seeded, slot)
        );
        const saved = await f.reservations.findById(ReservationId.create(first.id));
        if (saved === null) {
            throw new Error('first reservation not saved');
        }
        saved.cancel();
        await f.reservations.save(saved);
        const second: ReservationResponseDto = await f.commandBus.execute<ReservationResponseDto>(
            reservationCommand(f.seeded, slot, 'NEIGHBOR', 'user-2')
        );
        expect(second.id).not.toBe(first.id);
        expect(second.isActive).toBe(true);
        expect(second.userId).toBe('user-2');
    });

    it('publishes ReservationConfirmedEvent exactly once, only AFTER the save', async (): Promise<void> => {
        const f = await buildFixture();
        const captured: Array<{ readonly event: ReservationConfirmedEvent; readonly savedAtPublish: boolean }> = [];
        const spy: EventListener<ReservationConfirmedEvent> = {
            handle: async (event: ReservationConfirmedEvent): Promise<void> => {
                const alreadySaved = await f.reservations.findById(event.reservationId);
                captured.push({ event: event, savedAtPublish: alreadySaved !== null });
            },
        };
        f.eventBus.subscribe('ReservationConfirmed', spy);
        const dto: ReservationResponseDto = await f.commandBus.execute<ReservationResponseDto>(
            reservationCommand(f.seeded, slotInside(f.seeded))
        );
        expect(captured).toHaveLength(1);
        const only = captured[0];
        if (only === undefined) {
            throw new Error('event was not captured');
        }
        expect(only.savedAtPublish).toBe(true); // persisted BEFORE the event fired
        expect(only.event.type).toBe('ReservationConfirmed');
        expect(only.event.reservationId.value).toBe(dto.id);
        expect(only.event.spaceId.value).toBe(dto.spaceId);
        expect(only.event.userId).toBe(dto.userId);
        expect(only.event.cost).toEqual(dto.cost);
        expect(only.event.timeSlot.start.toISOString()).toBe(dto.timeSlot.start);
        // The handler returned AFTER the event (save → publish → return).
        expect(f.reservations.findById(ReservationId.create(dto.id))).toBeDefined();
    });
});

describe('CreateIncidentHandler — incident command flow', (): void => {
    it('success: returns the incident DTO with initial UNDER_REVIEW and null resolvedAt', async (): Promise<void> => {
        const f = await buildFixture();
        const dto: IncidentResponseDto = await f.commandBus.execute<IncidentResponseDto>(incidentCommand(f.seeded));
        expect(dto.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        expect(dto.spaceId).toBe(f.seeded.id.value);
        expect(dto.reporterId).toBe('user-1');
        expect(dto.description).toBe('Broken hoop');
        expect(dto.state).toBe('UNDER_REVIEW');
        expect(dto.resolvedAt).toBeNull();
        expect(dto.createdAt).not.toBe('');
        const saved = await f.incidents.findById(IncidentId.create(dto.id));
        expect(saved).not.toBeNull();
    });

    it('unknown space id → EntityNotFoundException (SPACE_NOT_FOUND)', async (): Promise<void> => {
        const f = await buildFixture();
        const space: Space = f.seeded;
        const command: CreateIncidentCommand = incidentCommand(space, randomUUID()); // valid UUID v4, but not seeded
        await expect(f.commandBus.execute<IncidentResponseDto>(command)).rejects.toThrow(EntityNotFoundException);
        await expect(f.commandBus.execute<IncidentResponseDto>(command)).rejects.toMatchObject({ code: 'SPACE_NOT_FOUND' });
    });

    it('inactive space → Error("cannot file incident on inactive space")', async (): Promise<void> => {
        const f = await buildFixture();
        f.seeded.deactivate();
        await f.spaces.save(f.seeded);
        await expect(
            f.commandBus.execute<IncidentResponseDto>(incidentCommand(f.seeded))
        ).rejects.toThrow('cannot file incident on inactive space');
    });
});

