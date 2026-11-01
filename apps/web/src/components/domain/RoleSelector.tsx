import {
  Crown,
  GraduationCap,
  HeartHandshake,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { UserRoleType } from '../../types/api';
import { calculateCost, ROLE_OPTIONS } from '../../lib/pricing';
import { formatAmount } from '../../lib/format';
import { cn } from '../../lib/cn';

const roleIcons: Record<UserRoleType, LucideIcon> = {
  NEIGHBOR: UserRound,
  YOUTH: GraduationCap,
  SENIOR: HeartHandshake,
  PRIVATE_CLUB: Crown,
};

export interface RoleSelectorProps {
  value: UserRoleType;
  baseAmount: number;
  currency: string;
  onChange: (role: UserRoleType) => void;
  error?: string;
  legendHidden?: boolean;
}

export function RoleSelector({
  value,
  baseAmount,
  currency,
  onChange,
  error,
  legendHidden = false,
}: RoleSelectorProps) {
  return (
    <fieldset>
      <legend className={legendHidden ? 'sr-only' : 'text-headline-sm text-ink'}>
        Categoría comunitaria
      </legend>
      {!legendHidden ? (
        <p className="mt-1 text-small text-ink-soft">
          Elige la tarifa que corresponde. El beneficio se aplica al total.
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {ROLE_OPTIONS.map((option) => {
          const Icon = roleIcons[option.value];
          const selected = option.value === value;
          const price = calculateCost(baseAmount, option.factor);
          const descriptionId = `role-${option.value}-description`;
          return (
            <label
              key={option.value}
              className={cn(
                'relative flex cursor-pointer gap-3 rounded-card border p-4 transition-colors',
                selected
                  ? 'border-sky-700 bg-sky-50'
                  : 'border-border bg-surface hover:border-sky-300 hover:bg-sky-50/60',
              )}
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                aria-describedby={descriptionId}
                className="peer sr-only"
              />
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                  selected ? 'bg-sky-700 text-white' : 'bg-sky-100 text-sky-700',
                )}
                aria-hidden="true"
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-1">
                  <span className="font-semibold text-ink">{option.label}</span>
                  <span className="text-small font-semibold tabular-nums text-sky-800">
                    {formatAmount(price)} {currency}
                  </span>
                </span>
                <span
                  id={descriptionId}
                  className="mt-1 block text-small text-ink-soft"
                >
                  {option.adjustmentLabel ?? option.description}
                </span>
                <span className="mt-1 block text-caption text-ink-muted">
                  Factor ×{option.factor.toFixed(1)}
                </span>
              </span>
              <span
                className={cn(
                  'pointer-events-none absolute inset-0 rounded-card ring-2 ring-transparent ring-offset-2 peer-focus-visible:ring-sky-700',
                  selected && 'ring-sky-700',
                )}
                aria-hidden="true"
              />
            </label>
          );
        })}
      </div>
      {error !== undefined ? (
        <p className="mt-2 text-small font-medium text-danger-text" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
