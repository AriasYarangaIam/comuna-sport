import { randomUUID } from "crypto";

import { IncidentStateBehavior } from "../services/incident-state-machine/incident-state-behavior.interface";
import { UnderReviewState } from "../services/incident-state-machine/under-review.state";
import { IncidentId } from "../value-objects/incident-id.vo";
import { IncidentStateType } from "../value-objects/incident-state.vo";
import { SpaceId } from "../value-objects/space-id.vo";

export class Incident {
    private constructor(
        public readonly id: IncidentId,
        public readonly spaceId: SpaceId,
        public readonly reporterId: string,
        public readonly description: string,

        public readonly createdAt: Date,
        private stateBehavior: IncidentStateBehavior,
        private _resolvedAt: Date | null = null
    ) {}

    get resolvedAt(): Date | null {
        return this._resolvedAt;
    }

    static create(params: {
        spaceId: SpaceId;
        reporterId: string;
        description: string;
    }): Incident {

        if (params.reporterId.length < 1) throw new Error('The reporter id does not accept empty value');
        if (params.description.length < 1 || params.description.length > 2000) throw new Error('The description must contain between 1 and 2000 characters');

        const id: IncidentId = IncidentId.create(randomUUID());
        const stateBehavior: IncidentStateBehavior = new UnderReviewState();
        const createdAt: Date = new Date();
        return new Incident(
            id,
            params.spaceId,
            params.reporterId,
            params.description,
            createdAt,
            stateBehavior
        );
    }

    approve(): void {
        this.stateBehavior = this.stateBehavior.approve();
    }

    reject(): void {
        this.stateBehavior = this.stateBehavior.reject();
    }

    resolve(_resolvedBy?: string): void {
        if (this._resolvedAt !== null) throw new Error('The incident has alredy been resolved');
        this.stateBehavior = this.stateBehavior.resolve();
        this._resolvedAt = new Date();
    }

    getState(): IncidentStateType {
        return this.stateBehavior.getState();
    }
}