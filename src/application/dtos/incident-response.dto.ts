export interface IncidentResponseDto {
    id: string;
    spaceId: string;
    reporterId: string;
    description: string;
    state: string;
    createdAt: string;
    resolvedAt: string | null;
}
