import { Command } from "./command.interface";
import type { IncidentStateType } from "../../domain/value-objects/incident-state.vo";

// The target states an operator may move an incident to. UNDER_REVIEW is the
// initial state and can never be set through the API.
export type AssignableIncidentState = Extract<IncidentStateType, 'APPROVED' | 'REJECTED' | 'RESOLVED'>;

export interface ChangeIncidentStateCommand extends Command {
    readonly type: 'CHANGE_INCIDENT_STATE';
    readonly incidentId: string;
    readonly state: AssignableIncidentState;
}
