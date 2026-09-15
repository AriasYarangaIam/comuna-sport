import { InvalidStateTransitionException } from "../../exceptions/invalid-state-transition.exception";
import { IncidentStateType } from "../../value-objects/incident-state.vo";
import { IncidentStateBehavior } from "./incident-state-behavior.interface";

export class ResolvedState implements IncidentStateBehavior {
    approve(): IncidentStateBehavior {
        throw new InvalidStateTransitionException();
    }
    reject(): IncidentStateBehavior {
        throw new InvalidStateTransitionException();
    }
    resolve(): IncidentStateBehavior {
        throw new InvalidStateTransitionException();
    }
    getState(): IncidentStateType {
        return 'RESOLVED'
    }
}