import { InvalidStateTransitionException } from "../../exceptions/invalid-state-transition.exception";
import { IncidentStateType } from "../../value-objects/incident-state.vo";
import { ApprovedState } from "./approved.state";
import { IncidentStateBehavior } from "./incident-state-behavior.interface";
import { RejectedState } from "./rejected.state";

export class UnderReviewState implements IncidentStateBehavior {
    approve(): IncidentStateBehavior {
        return new ApprovedState();
    }
    reject(): IncidentStateBehavior {
        return new RejectedState();
    }
    resolve(): IncidentStateBehavior {
        throw new InvalidStateTransitionException();
    }
    getState(): IncidentStateType {
        return 'UNDER_REVIEW';
    }
}