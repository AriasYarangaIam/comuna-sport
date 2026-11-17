import type { NextFunction, Request, Response } from "express";
import type { SpaceResponseDto } from "../../../application/dtos/space-response.dto";
import type { QueryBus } from "../../../application/ports/query-bus.interface";
import type { FindAvailableSpacesQuery } from "../../../application/queries/find-available-spaces.query";
import type { GetSpaceQuery } from "../../../application/queries/get-space.query";
import type { ListSpacesQuery } from "../../../application/queries/list-spaces.query";
import { z } from "zod";

// Validate at Boundaries (API principle #3). Zod is the ONLY runtime validation
// point; domain/application trust the types.
// S1 (odd/tasks/privacy-identifiers-and-copy.md): the path parameter is the
// public slug; presence is all that is proven here, an unknown slug is the
// handlers' 404 SPACE_NOT_FOUND.
const spaceSlugParamSchema = z.object({
    slug: z.string().min(1),
});

// Z-suffixed ISO 8601 — the SAME shape the POST body uses for timeSlot bounds.
const availabilityQuerySchema = z.object({
    start: z.iso.datetime(),
    end: z.iso.datetime(),
});

type SpaceSlugParam = z.infer<typeof spaceSlugParamSchema>;
type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

// Query strings arrive as `string | string[] | ParsedQs | ... | undefined`:
// the first element of a repeated key is authoritative, and anything that is not
// a string becomes '' so Zod rejects it with a 400 instead of the boundary
// silently widening the band.
const readQueryParam = (raw: unknown): string => {
    if (typeof raw === 'string') {
        return raw;
    }
    if (Array.isArray(raw)) {
        const first: unknown = raw[0];
        return typeof first === 'string' ? first : '';
    }
    return '';
};

export class SpaceController {
    private readonly queryBus: QueryBus;

    public constructor(queryBus: QueryBus) {
        this.queryBus = queryBus;
    }

    public listAll = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const query: ListSpacesQuery = { type: 'LIST_SPACES' };
            const dto: SpaceResponseDto[] = await this.queryBus.execute<SpaceResponseDto[]>(query);
            res.status(200).json(dto);
        } catch (error: unknown) {
            next(error);
        }
    };

    public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const params: SpaceSlugParam = spaceSlugParamSchema.parse(req.params);
            const query: GetSpaceQuery = {
                type: 'GET_SPACE',
                spaceSlug: params.slug,
            };
            const dto: SpaceResponseDto = await this.queryBus.execute<SpaceResponseDto>(query);
            res.status(200).json(dto);
        } catch (error: unknown) {
            next(error);
        }
    };

    public findAvailable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const availability: AvailabilityQuery = availabilityQuerySchema.parse({
                start: readQueryParam(req.query['start']),
                end: readQueryParam(req.query['end']),
            });
            const query: FindAvailableSpacesQuery = {
                type: 'FIND_AVAILABLE_SPACES',
                start: availability.start,
                end: availability.end,
            };
            const dto: SpaceResponseDto[] = await this.queryBus.execute<SpaceResponseDto[]>(query);
            res.status(200).json(dto);
        } catch (error: unknown) {
            next(error);
        }
    };
}
