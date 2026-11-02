import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { IncidentStateType } from '../../types/api';
import { Badge, type BadgeTone } from '../ui/Badge';

interface StatusMeta {
  label: string;
  tone: BadgeTone;
  icon: LucideIcon;
}

const incidentMeta: Record<IncidentStateType, StatusMeta> = {
  UNDER_REVIEW: { label: 'En revisión', tone: 'warning', icon: Clock },
  APPROVED: { label: 'Aprobado', tone: 'info', icon: ShieldCheck },
  REJECTED: { label: 'Rechazado (cerrado)', tone: 'danger', icon: XCircle },
  RESOLVED: { label: 'Resuelto', tone: 'success', icon: CheckCircle2 },
};

export function IncidentStatusBadge({ state }: { state: IncidentStateType }) {
  const meta = incidentMeta[state];
  return (
    <Badge tone={meta.tone} icon={meta.icon}>
      {meta.label}
    </Badge>
  );
}

export function SpaceStatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge tone="active" icon={CheckCircle2}>
      Activo
    </Badge>
  ) : (
    <Badge tone="inactive" icon={Wrench}>
      En mantenimiento
    </Badge>
  );
}

export function ReservationStatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge tone="active" icon={CheckCircle2}>
      Activa
    </Badge>
  ) : (
    <Badge tone="neutral" icon={XCircle}>
      Inactiva
    </Badge>
  );
}

export const incidentStateLabel = (state: IncidentStateType): string =>
  incidentMeta[state].label;
