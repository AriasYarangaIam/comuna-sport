import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  IncidentBody,
  IncidentDto,
  ReservationBody,
  ReservationDto,
  SpaceDto,
} from '../types/api';

export const queryKeys = {
  spaces: ['spaces'] as const,
  space: (spaceId: string) => ['spaces', spaceId] as const,
  availability: (start: string, end: string) =>
    ['spaces', 'availability', start, end] as const,
  reservation: (reservationId: string) =>
    ['reservations', reservationId] as const,
  userReservations: (userId: string) =>
    ['users', userId, 'reservations'] as const,
  incidents: (spaceId: string) => ['spaces', spaceId, 'incidents'] as const,
};

export const useSpaces = () =>
  useQuery<SpaceDto[]>({
    queryKey: queryKeys.spaces,
    queryFn: ({ signal }) => api.getSpaces(signal),
    staleTime: 5 * 60_000,
  });

export const useSpace = (spaceId: string | undefined) =>
  useQuery<SpaceDto>({
    queryKey: queryKeys.space(spaceId ?? ''),
    queryFn: ({ signal }) => api.getSpace(spaceId ?? '', signal),
    enabled: spaceId !== undefined && spaceId !== '',
    staleTime: 5 * 60_000,
  });

export const useAvailability = (
  start: string | undefined,
  end: string | undefined,
) =>
  useQuery<SpaceDto[]>({
    queryKey: queryKeys.availability(start ?? '', end ?? ''),
    queryFn: ({ signal }) => api.getAvailability(start ?? '', end ?? '', signal),
    enabled:
      start !== undefined &&
      start !== '' &&
      end !== undefined &&
      end !== '',
    staleTime: 60_000,
    retry: 0,
  });

export const useReservation = (reservationId: string | undefined) =>
  useQuery<ReservationDto>({
    queryKey: queryKeys.reservation(reservationId ?? ''),
    queryFn: ({ signal }) => api.getReservation(reservationId ?? '', signal),
    enabled: reservationId !== undefined && reservationId !== '',
    staleTime: 30_000,
  });

export const useUserReservations = (userId: string) =>
  useQuery<ReservationDto[]>({
    queryKey: queryKeys.userReservations(userId),
    queryFn: ({ signal }) => api.getUserReservations(userId, signal),
    enabled: userId.trim() !== '',
    staleTime: 30_000,
  });

export const useSpaceIncidents = (spaceId: string | undefined) =>
  useQuery<IncidentDto[]>({
    queryKey: queryKeys.incidents(spaceId ?? ''),
    queryFn: ({ signal }) => api.getSpaceIncidents(spaceId ?? '', signal),
    enabled: spaceId !== undefined && spaceId !== '',
    staleTime: 30_000,
  });

export interface CreateReservationVariables {
  spaceId: string;
  body: ReservationBody;
  idempotencyKey: string;
}

export const useCreateReservation = () => {
  const queryClient = useQueryClient();
  return useMutation<ReservationDto, unknown, CreateReservationVariables>({
    mutationFn: ({ spaceId, body, idempotencyKey }) =>
      api.createReservation(spaceId, body, idempotencyKey),
    onSuccess: (reservation) => {
      void queryClient.invalidateQueries({ queryKey: ['spaces', 'availability'] });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.userReservations(reservation.userId),
      });
    },
  });
};

export const useCreateIncident = () => {
  const queryClient = useQueryClient();
  return useMutation<IncidentDto, unknown, IncidentBody>({
    mutationFn: (body) => api.createIncident(body),
    onSuccess: (incident) => {
      queryClient.setQueryData<IncidentDto[]>(
        queryKeys.incidents(incident.spaceId),
        (current) => [incident, ...(current ?? [])],
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.incidents(incident.spaceId),
      });
    },
  });
};
