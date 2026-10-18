import { Incident } from "../../../domain/entities/incident.entity";
import { IncidentReader, IncidentWriter } from "../../../domain/repositories/incident.repository";
import { IncidentId } from "../../../domain/value-objects/incident-id.vo";
import { SpaceId } from "../../../domain/value-objects/space-id.vo";

export class InMemoryIncidentRepository implements IncidentReader, IncidentWriter {
    private readonly storage: Map<string, Incident> = new Map<string, Incident>();

    public async findById(id: IncidentId): Promise<Incident | null> {
        const found: Incident | undefined = this.storage.get(id.value);
        return found === undefined ? null : found;
    }

    public async findBySpaceId(spaceId: SpaceId): Promise<Incident[]> {
        return [...this.storage.values()].filter((incident: Incident): boolean => incident.spaceId.value === spaceId.value);
    }

    public async save(incident: Incident): Promise<void> {
        this.storage.set(incident.id.value, incident);
    }
}
