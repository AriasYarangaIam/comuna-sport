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
  space: (spaceSlug: string) => ['spaces', spaceSlug] as const,
  availability: (start: string, end: string) =>
    ['spaces', 'availability', start, end] as const,
  reservation: (reservationId: string) =>
    ['reservations', reservationId] as const,
  userReservations: (dni: string) =>
    ['users', dni, 'reservations'] as const,
  incidents: (spaceSlug: string) => ['spaces', spaceSlug, 'incidents'] as const,
};

export const useSpaces = () =>
  useQuery<SpaceDto[]>({
    queryKey: queryKeys.spaces,
    queryFn: ({ signal }) => api.getSpaces(signal),
    staleTime: 5 * 60_000,
  });

export const useSpace = (spaceSlug: string | undefined) =>
  useQuery<SpaceDto>({
    queryKey: queryKeys.space(spaceSlug ?? ''),
    queryFn: ({ signal }) => api.getSpace(spaceSlug ?? '', signal),
    enabled: spaceSlug !== undefined && spaceSlug !== '',
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

export const useUserReservations = (dni: string) =>
  useQuery<ReservationDto[]>({
    queryKey: queryKeys.userReservations(dni),
    queryFn: ({ signal }) => api.getUserReservations(dni, signal),
    enabled: dni.trim() !== '',
    staleTime: 30_000,
  });

export const useSpaceIncidents = (spaceSlug: string | undefined) =>
  useQuery<IncidentDto[]>({
    queryKey: queryKeys.incidents(spaceSlug ?? ''),
    queryFn: ({ signal }) => api.getSpaceIncidents(spaceSlug ?? '', signal),
    enabled: spaceSlug !== undefined && spaceSlug !== '',
    staleTime: 30_000,
  });

export interface CreateReservationVariables {
  spaceSlug: string;
  body: ReservationBody;
  idempotencyKey: string;
}

export const useCreateReservation = () => {
  const queryClient = useQueryClient();
  return useMutation<ReservationDto, unknown, CreateReservationVariables>({
    mutationFn: ({ spaceSlug, body, idempotencyKey }) =>
      api.createReservation(spaceSlug, body, idempotencyKey),
    onSuccess: (_reservation, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['spaces', 'availability'] });
      // S4: the response carries no citizen identifier — the DNI comes from
      // the request that was just accepted.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.userReservations(variables.body.dni),
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
        queryKeys.incidents(incident.spaceSlug),
        (current) => [incident, ...(current ?? [])],
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.incidents(incident.spaceSlug),
      });
    },
  });
};
