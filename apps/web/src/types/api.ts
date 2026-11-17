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

export interface IncidentBody {
  spaceSlug: string;
  dni: string;
  description: string;
}
