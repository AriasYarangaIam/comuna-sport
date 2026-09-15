import { IncidentStateType } from "../../value-objects/incident-state.vo";

export interface IncidentStateBehavior {
    approve(): IncidentStateBehavior;
    reject(): IncidentStateBehavior;
    resolve(): IncidentStateBehavior;
    getState(): IncidentStateType;
}