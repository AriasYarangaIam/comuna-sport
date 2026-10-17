import { Incident } from "../entities/incident.entity";
import { SpaceId } from "../value-objects/space-id.vo";
import { IncidentId } from "../value-objects/incident-id.vo";

export interface IncidentReader {
    findById(id: IncidentId): Promise<Incident | null>;
    findBySpaceId(spaceId: SpaceId): Promise<Incident[]>;
}

export interface IncidentWriter {
    save(incident: Incident): Promise<void>;
}
