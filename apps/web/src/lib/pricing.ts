import type { UserRoleType } from '../types/api';

export interface RoleOption {
  value: UserRoleType;
  label: string;
  shortLabel: string;
  description: string;
  factor: number;
  adjustmentLabel: string | null;
}

/**
 * Factores idénticos a las estrategias del dominio
 * (`senior-discount.strategy.ts`, `private-club.strategy.ts`).
 */
export const ROLE_OPTIONS: readonly RoleOption[] = [
  {
    value: 'NEIGHBOR',
    label: 'Vecino general',
    shortLabel: 'Vecino',
    description: 'Tarifa general para vecinos de la comuna.',
    factor: 1,
    adjustmentLabel: null,
  },
  {
    value: 'YOUTH',
    label: 'Joven / estudiante',
    shortLabel: 'Joven',
    description: 'Misma tarifa general, con atención preferente.',
    factor: 1,
    adjustmentLabel: null,
  },
  {
    value: 'SENIOR',
    label: 'Adulto mayor',
    shortLabel: 'Adulto mayor',
    description: 'Beneficio municipal del 50 % sobre la tarifa base.',
    factor: 0.5,
    adjustmentLabel: 'Beneficio Adulto Mayor (−50 %)',
  },
  {
    value: 'PRIVATE_CLUB',
    label: 'Club privado',
    shortLabel: 'Club privado',
    description: 'Recargo solidario del 20 % sobre la tarifa base.',
    factor: 1.2,
    adjustmentLabel: 'Recargo solidario (+20 %)',
  },
];

export const getRoleOption = (role: UserRoleType): RoleOption => {
  const option = ROLE_OPTIONS.find((candidate) => candidate.value === role);
  if (option === undefined) {
    throw new Error(`Unknown role: ${role}`);
  }
  return option;
};

/** Redondeo a 2 decimales idéntico a `Cost.fromCalculation`. */
export const calculateCost = (baseAmount: number, factor: number): number =>
  Math.round((baseAmount * factor + Number.EPSILON) * 100) / 100;
