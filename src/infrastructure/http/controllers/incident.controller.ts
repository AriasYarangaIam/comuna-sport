import type { Request, Response, NextFunction } from "express";
import type { CreateIncidentCommand } from "../../../application/commands/create-incident.command";
import type { IncidentResponseDto } from "../../../application/dtos/incident-response.dto";
import type { CommandBus } from "../../../application/ports/command-bus.interface";
import type { QueryBus } from "../../../application/ports/query-bus.interface";
import type { GetIncidentQuery } from "../../../application/queries/get-incident.query";
import type { ListSpaceIncidentsQuery } from "../../../application/queries/list-space-incidents.query";
import { z } from "zod";

// Validate at Boundaries (API principle #3). Zod is the ONLY runtime validation
// point; domain/application trust the types.
// S1/S3/S4: the space is addressed by its public slug and the ONLY citizen
// identifier is an 8-digit DNI — accepted as input, never echoed back.
const DNI_PATTERN = /^\d{8}$/;

const incidentBodySchema = z.object({
    spaceSlug: z.string().min(1),
    dni: z.string().regex(DNI_PATTERN),
    description: z.string().min(1).max(2000),
});

// Route params only prove presence: a malformed UUID is the domain VO's call,
// so it surfaces as a 400 BAD_REQUEST exactly like the POST path.
const incidentIdParamSchema = z.object({
    id: z.string().min(1),
});

const spaceSlugParamSchema = z.object({
    slug: z.string().min(1),
});

type IncidentBody = z.infer<typeof incidentBodySchema>;
type IncidentIdParam = z.infer<typeof incidentIdParamSchema>;
type SpaceSlugParam = z.infer<typeof spaceSlugParamSchema>;

export class IncidentController {
    private readonly commandBus: CommandBus;
    private readonly queryBus: QueryBus;

    public constructor(commandBus: CommandBus, queryBus: QueryBus) {
        this.commandBus = commandBus;
        this.queryBus = queryBus;
    }

    public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const body: IncidentBody = incidentBodySchema.parse(req.body);
            const command: CreateIncidentCommand = {
                type: 'CREATE_INCIDENT',
                spaceSlug: body.spaceSlug,
                dni: body.dni,
                description: body.description,
            };
            const dto: IncidentResponseDto = await this.commandBus.execute<IncidentResponseDto>(command);
            res.status(201).json(dto);
        } catch (error: unknown) {
            next(error); // Error mapping is the errorHandler's job — exceptions propagate.
        }
    };

    public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const params: IncidentIdParam = incidentIdParamSchema.parse(req.params);
            const query: GetIncidentQuery = {
                type: 'GET_INCIDENT',
                incidentId: params.id,
            };
            const dto: IncidentResponseDto = await this.queryBus.execute<IncidentResponseDto>(query);
            res.status(200).json(dto);
        } catch (error: unknown) {
            next(error);
        }
    };

    public listBySpace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const params: SpaceSlugParam = spaceSlugParamSchema.parse(req.params);
            const query: ListSpaceIncidentsQuery = {
                type: 'LIST_SPACE_INCIDENTS',
                spaceSlug: params.slug,
            };
            const dto: IncidentResponseDto[] = await this.queryBus.execute<IncidentResponseDto[]>(query);
            res.status(200).json(dto);
        } catch (error: unknown) {
            next(error);
        }
    };
}
