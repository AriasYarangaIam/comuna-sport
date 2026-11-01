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
  userId: string;
  role: UserRoleType;
  timeSlot: {
    start: string;
    end: string;
  };
}

export interface IncidentBody {
  spaceId: string;
  reporterId: string;
  description: string;
}
