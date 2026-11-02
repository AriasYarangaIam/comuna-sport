import type { NextFunction, Request, Response } from "express";
import type { CreateReservationCommand } from "../../../application/commands/create-reservation.command";
import type { ReservationResponseDto } from "../../../application/dtos/reservation-response.dto";
import type { CommandBus } from "../../../application/ports/command-bus.interface";
import type { QueryBus } from "../../../application/ports/query-bus.interface";
import type { GetReservationQuery } from "../../../application/queries/get-reservation.query";
import type { ListUserReservationsQuery } from "../../../application/queries/list-user-reservations.query";
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

// Route params only prove presence: a malformed UUID is the domain VO's call,
// so it surfaces as a 400 BAD_REQUEST exactly like the POST path.
const reservationIdParamSchema = z.object({
    id: z.string().min(1),
});

const userIdParamSchema = z.object({
    userId: z.string().min(1),
});

type ReservationBody = z.infer<typeof reservationBodySchema>;
type ReservationIdParam = z.infer<typeof reservationIdParamSchema>;
type UserIdParam = z.infer<typeof userIdParamSchema>;

const readSpaceIdParam = (req: Request): string => {
    const raw: string | string[] | undefined = req.params['id'];
    if (Array.isArray(raw)) {
        return raw[0] === undefined ? '' : raw[0];
    }
    return raw === undefined ? '' : raw;
};

export class ReservationController {
    private readonly commandBus: CommandBus;
    private readonly queryBus: QueryBus;

    public constructor(commandBus: CommandBus, queryBus: QueryBus) {
        this.commandBus = commandBus;
        this.queryBus = queryBus;
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

    public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const params: ReservationIdParam = reservationIdParamSchema.parse(req.params);
            const query: GetReservationQuery = {
                type: 'GET_RESERVATION',
                reservationId: params.id,
            };
            const dto: ReservationResponseDto = await this.queryBus.execute<ReservationResponseDto>(query);
            res.status(200).json(dto);
        } catch (error: unknown) {
            next(error);
        }
    };

    public listByUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const params: UserIdParam = userIdParamSchema.parse(req.params);
            const query: ListUserReservationsQuery = {
                type: 'LIST_USER_RESERVATIONS',
                userId: params.userId,
            };
            const dto: ReservationResponseDto[] = await this.queryBus.execute<ReservationResponseDto[]>(query);
            res.status(200).json(dto);
        } catch (error: unknown) {
            next(error);
        }
    };
}
