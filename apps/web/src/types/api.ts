import type {
  CostDto,
  IncidentDto,
  IncidentStateType,
  ReservationDto,
  SpaceDto,
  SpaceType,
  TimeSlotDto,
  UserRoleType,
} from '../lib/schemas';

export type {
  CostDto,
  IncidentDto,
  IncidentStateType,
  ReservationDto,
  SpaceDto,
  SpaceType,
  TimeSlotDto,
  UserRoleType,
};

export interface ReservationBody {
  dni: string;
  role: UserRoleType;
  timeSlot: {
    start: string;
    end: string;
  };
}

// S1 (odd/tasks/demo-completion.md): the municipal operator may move an incident
// to one of these three states; UNDER_REVIEW is only the initial one.
export type AssignableIncidentState = 'APPROVED' | 'REJECTED' | 'RESOLVED';

export interface IncidentBody {
  spaceSlug: string;
  dni: string;
  description: string;
}
