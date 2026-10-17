import type { NextFunction, Request, Response } from "express";
import type { CreateReservationCommand } from "../../../application/commands/create-reservation.command";
import type { ReservationResponseDto } from "../../../application/dtos/reservation-response.dto";
import type { CommandBus } from "../../../application/ports/command-bus.interface";
import { z } from "zod";

// Validate at Boundaries (API principle #3). Zod is the ONLY runtime validation
// point; domain/application trust the types.
const reservationBodySchema = z.object({
    userId: z.string().min(1),
    role: z.enum(['NEIGHBOR', 'YOUTH', 'SENIOR', 'PRIVATE_CLUB']),
    timeSlot: z.object({
        start: z.iso.datetime(),
        end: z.iso.datetime(),
    }),
});

type ReservationBody = z.infer<typeof reservationBodySchema>;

const readSpaceIdParam = (req: Request): string => {
    const raw: string | string[] | undefined = req.params['id'];
    if (Array.isArray(raw)) {
        return raw[0] === undefined ? '' : raw[0];
    }
    return raw === undefined ? '' : raw;
};

export class ReservationController {
    private readonly commandBus: CommandBus;

    public constructor(commandBus: CommandBus) {
        this.commandBus = commandBus;
    }

    public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const body: ReservationBody = reservationBodySchema.parse(req.body);
            const command: CreateReservationCommand = {
                type: 'CREATE_RESERVATION',
                spaceId: readSpaceIdParam(req),
                userId: body.userId,
                role: body.role,
                timeSlot: { start: body.timeSlot.start, end: body.timeSlot.end },
            };
            const dto: ReservationResponseDto = await this.commandBus.execute<ReservationResponseDto>(command);
            res.status(201).json(dto);
        } catch (error: unknown) {
            next(error); // Error mapping is the errorHandler's job — exceptions propagate.
        }
    };
}
