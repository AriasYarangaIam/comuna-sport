import type { Incident } from "../../domain/entities/incident.entity";

// S1/S3/S4 (odd/tasks/privacy-identifiers-and-copy.md): the space is addressed
// by its public slug; the reporter's DNI and the space UUID never leave the API.
export interface IncidentResponseDto {
    id: string;
    spaceSlug: string;
    description: string;
    state: string;
    createdAt: string;
    resolvedAt: string | null;
}

// Single mapping point for the incident read model — shared by the command
// handler (create) and the read handlers (get/list), so the HTTP shape can
// never drift between writes and reads. `spaceSlug` is resolved by the caller.
export const toIncidentResponseDto = (incident: Incident, spaceSlug: string): IncidentResponseDto => {
    return {
        id: incident.id.value,
        spaceSlug: spaceSlug,
        description: incident.description,
        state: incident.getState(),
        createdAt: incident.createdAt.toISOString(),
        resolvedAt: incident.resolvedAt === null ? null : incident.resolvedAt.toISOString()
    };
};
