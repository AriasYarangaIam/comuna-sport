/// <reference types="node" />
/// <reference types="jest" />

import { ApprovedState } from "../../src/domain/services/incident-state-machine/approved.state";
import { RejectedState } from "../../src/domain/services/incident-state-machine/rejected.state";
import { ResolvedState } from "../../src/domain/services/incident-state-machine/resolved.state";
import { UnderReviewState } from "../../src/domain/services/incident-state-machine/under-review.state";
import type { IncidentStateBehavior } from "../../src/domain/services/incident-state-machine/incident-state-behavior.interface";
import { InvalidStateTransitionException } from "../../src/domain/exceptions/invalid-state-transition.exception";
import { Incident } from "../../src/domain/entities/incident.entity";
import type { IncidentStateType } from "../../src/domain/value-objects/incident-state.vo";
import { SpaceId } from "../../src/domain/value-objects/space-id.vo";
import { randomUUID } from "crypto";

// §9 transition matrix (Appendix A): UnderReview → {approve, reject};
// Approved → {resolve}; Rejected and Resolved are terminal.
const matrixCases: Array<{
    readonly from: string;
    readonly state: IncidentStateBehavior;
    readonly via: 'approve' | 'reject' | 'resolve';
    readonly outcome: { readonly to: IncidentStateType } | { readonly throws: true };
}> = [
    { from: 'UNDER_REVIEW', state: new UnderReviewState(), via: 'approve', outcome: { to: 'APPROVED' } },
    { from: 'UNDER_REVIEW', state: new UnderReviewState(), via: 'reject', outcome: { to: 'REJECTED' } },
    { from: 'UNDER_REVIEW', state: new UnderReviewState(), via: 'resolve', outcome: { throws: true } },
    { from: 'APPROVED', state: new ApprovedState(), via: 'approve', outcome: { throws: true } },
    { from: 'APPROVED', state: new ApprovedState(), via: 'reject', outcome: { throws: true } },
    { from: 'APPROVED', state: new ApprovedState(), via: 'resolve', outcome: { to: 'RESOLVED' } },
    { from: 'REJECTED', state: new RejectedState(), via: 'approve', outcome: { throws: true } },
    { from: 'REJECTED', state: new RejectedState(), via: 'reject', outcome: { throws: true } },
    { from: 'REJECTED', state: new RejectedState(), via: 'resolve', outcome: { throws: true } },
    { from: 'RESOLVED', state: new ResolvedState(), via: 'approve', outcome: { throws: true } },
    { from: 'RESOLVED', state: new ResolvedState(), via: 'reject', outcome: { throws: true } },
    { from: 'RESOLVED', state: new ResolvedState(), via: 'resolve', outcome: { throws: true } },
];

const transition = (state: IncidentStateBehavior, via: 'approve' | 'reject' | 'resolve'): IncidentStateBehavior => {
    switch (via) {
        case 'approve':
            return state.approve();
        case 'reject':
            return state.reject();
        case 'resolve':
            return state.resolve();
    }
};

describe('Incident state machine — full §9 transition matrix', (): void => {
    it.each(matrixCases.filter((c) => 'throws' in c.outcome))(
        'invalid transition: $from --$via--> throws %s',
        (c): void => {
            const expectedState: IncidentStateType = c.state.getState();
            expect((): IncidentStateBehavior => transition(c.state, c.via)).toThrow(InvalidStateTransitionException);
            expect(c.state.getState()).toBe(expectedState);
        }
    );

    it.each(matrixCases.filter((c) => 'to' in c.outcome))(
        'valid transition: $from --$via--> $outcome.to',
        (c): void => {
            if (!('to' in c.outcome)) {
                throw new Error('unreachable');
            }
            const nextState: IncidentStateBehavior = transition(c.state, c.via);
            expect(nextState.getState()).toBe(c.outcome.to);
        }
    );

    it('every invalid transition carries code STATE_TRANSITION_INVALID', (): void => {
        for (const c of matrixCases.filter((c): boolean => 'throws' in c.outcome)) {
            try {
                transition(c.state, c.via);
                throw new Error(`expected invalid transition to throw: ${c.from} --${c.via}-->`);
            } catch (error: unknown) {
                if (!(error instanceof InvalidStateTransitionException)) {
                    throw error;
                }
                expect(error.code).toBe('STATE_TRANSITION_INVALID');
            }
        }
    });

    it('invalid transition attempts leave the state object untouched (stateless behaviors)', (): void => {
        const underReview: UnderReviewState = new UnderReviewState();
        expect((): IncidentStateBehavior => underReview.resolve()).toThrow(InvalidStateTransitionException);
        expect(underReview.getState()).toBe('UNDER_REVIEW');
    });
});

describe('Incident entity delegating through the state machine', (): void => {
    const makeIncident = (): Incident => Incident.create({
        spaceId: SpaceId.create(randomUUID()),
        reporterId: 'user-1',
        description: 'Broken hoop',
    });

    it('starts UNDER_REVIEW', (): void => {
        expect(makeIncident().getState()).toBe('UNDER_REVIEW');
    });

    it('approve delegates: UNDER_REVIEW → APPROVED', (): void => {
        const incident: Incident = makeIncident();
        incident.approve();
        expect(incident.getState()).toBe('APPROVED');
        expect(incident.resolvedAt).toBeNull();
    });

    it('reject delegates: UNDER_REVIEW → REJECTED', (): void => {
        const incident: Incident = makeIncident();
        incident.reject();
        expect(incident.getState()).toBe('REJECTED');
        expect(incident.resolvedAt).toBeNull();
    });

    it('resolve delegates: APPROVED → RESOLVED and sets resolvedAt ONLY on resolve', (): void => {
        const incident: Incident = makeIncident();
        expect(incident.resolvedAt).toBeNull();
        incident.approve();
        expect(incident.resolvedAt).toBeNull(); // approved but not resolved yet
        incident.resolve('agente-x');
        expect(incident.getState()).toBe('RESOLVED');
        expect(incident.resolvedAt).toBeInstanceOf(Date);
    });

    it('RESOLVED is terminal — further transitions throw', (): void => {
        const incident: Incident = makeIncident();
        incident.approve();
        incident.resolve();
        expect((): void => incident.approve()).toThrow(InvalidStateTransitionException);
        expect((): void => incident.reject()).toThrow(InvalidStateTransitionException);
        expect((): void => incident.resolve()).toThrow(); // already resolved
        expect(incident.getState()).toBe('RESOLVED');
    });
});
