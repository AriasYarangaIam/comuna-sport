import { z } from 'zod';

export const spaceTypeSchema = z.enum([
  'CANCHA_FUTBOL',
  'LOSA_BASQUET',
  'PISTA_TENIS',
  'MULTIPROPOSITO',
]);

export const userRoleSchema = z.enum([
  'NEIGHBOR',
  'YOUTH',
  'SENIOR',
  'PRIVATE_CLUB',
]);

export const incidentStateSchema = z.enum([
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'RESOLVED',
]);

export const costSchema = z.object({
  amount: z.number(),
  currency: z.string(),
});

export const timeSlotSchema = z.object({
  start: z.string(),
  end: z.string(),
});

export const spaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: spaceTypeSchema,
  capacity: z.number(),
  basePrice: costSchema,
  isActive: z.boolean(),
  availabilityWindows: z.array(timeSlotSchema),
});

export const reservationSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  userId: z.string(),
  role: userRoleSchema,
  timeSlot: timeSlotSchema,
  cost: costSchema,
  createdAt: z.string(),
  isActive: z.boolean(),
});

export const incidentSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  reporterId: z.string(),
  description: z.string(),
  state: incidentStateSchema,
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export const spaceListSchema = z.array(spaceSchema);
export const reservationListSchema = z.array(reservationSchema);
export const incidentListSchema = z.array(incidentSchema);

export type SpaceDto = z.infer<typeof spaceSchema>;
export type ReservationDto = z.infer<typeof reservationSchema>;
export type IncidentDto = z.infer<typeof incidentSchema>;
export type SpaceType = z.infer<typeof spaceTypeSchema>;
export type UserRoleType = z.infer<typeof userRoleSchema>;
export type IncidentStateType = z.infer<typeof incidentStateSchema>;
export type CostDto = z.infer<typeof costSchema>;
export type TimeSlotDto = z.infer<typeof timeSlotSchema>;
