import { IncidentStateType } from "../../value-objects/incident-state.vo";
import { IncidentStateBehavior } from "./incident-state-behavior.interface";
import { ApprovedState } from "./approved.state";
import { RejectedState } from "./rejected.state";
import { ResolvedState } from "./resolved.state";
import { UnderReviewState } from "./under-review.state";

export const createIncidentStateBehavior = (state: IncidentStateType): IncidentStateBehavior => {
    switch (state) {
        case 'UNDER_REVIEW':
            return new UnderReviewState();
        case 'APPROVED':
            return new ApprovedState();
        case 'REJECTED':
            return new RejectedState();
        case 'RESOLVED':
            return new ResolvedState();
        default:
            throw new Error('invalid incident state');
    }
};
