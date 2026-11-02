import type { Incident } from "../../domain/entities/incident.entity";

export interface IncidentResponseDto {
    id: string;
    spaceId: string;
    reporterId: string;
    description: string;
    state: string;
    createdAt: string;
    resolvedAt: string | null;
}

// Single mapping point for the incident read model — shared by the command
// handler (create) and the read handlers (get/list), so the HTTP shape can
// never drift between writes and reads.
export const toIncidentResponseDto = (incident: Incident): IncidentResponseDto => {
    return {
        id: incident.id.value,
        spaceId: incident.spaceId.value,
        reporterId: incident.reporterId,
        description: incident.description,
        state: incident.getState(),
        createdAt: incident.createdAt.toISOString(),
        resolvedAt: incident.resolvedAt === null ? null : incident.resolvedAt.toISOString()
    };
};
