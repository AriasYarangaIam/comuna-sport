import type { Request, Response, NextFunction } from "express";
import type { CreateIncidentCommand } from "../../../application/commands/create-incident.command";
import type { IncidentResponseDto } from "../../../application/dtos/incident-response.dto";
import type { CommandBus } from "../../../application/ports/command-bus.interface";
import { z } from "zod";

// Validate at Boundaries (API principle #3). Zod is the ONLY runtime validation
// point; domain/application trust the types.
const incidentBodySchema = z.object({
    spaceId: z.string().min(1),
    reporterId: z.string().min(1),
    description: z.string().min(1).max(2000),
});

type IncidentBody = z.infer<typeof incidentBodySchema>;

export class IncidentController {
    private readonly commandBus: CommandBus;

    public constructor(commandBus: CommandBus) {
        this.commandBus = commandBus;
    }

    public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const body: IncidentBody = incidentBodySchema.parse(req.body);
            const command: CreateIncidentCommand = {
                type: 'CREATE_INCIDENT',
                spaceId: body.spaceId,
                reporterId: body.reporterId,
                description: body.description,
            };
            const dto: IncidentResponseDto = await this.commandBus.execute<IncidentResponseDto>(command);
            res.status(201).json(dto);
        } catch (error: unknown) {
            next(error); // Error mapping is the errorHandler's job — exceptions propagate.
        }
    };
}
