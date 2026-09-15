import { InvalidStateTransitionException } from "../../exceptions/invalid-state-transition.exception";
import { IncidentStateType } from "../../value-objects/incident-state.vo";
import { IncidentStateBehavior } from "./incident-state-behavior.interface";
import { ResolvedState } from "./resolved.state";

export class ApprovedState implements IncidentStateBehavior {
    approve(): IncidentStateBehavior {
        throw new InvalidStateTransitionException();
    }
    reject(): IncidentStateBehavior {
        throw new InvalidStateTransitionException();
    }
    resolve(): IncidentStateBehavior {
        return new ResolvedState();
    }
    getState(): IncidentStateType {
        return 'APPROVED';
    }
}