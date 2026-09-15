export interface IncidentReader {
    findById(id: IncidentId): Promise<Incident | null>;
    findBySpaceId(spaceId: SpaceId): Promise<Incident[]>;
}

export interface IncidentWriter {
    save(incident: Incident): Promise<void>;
}