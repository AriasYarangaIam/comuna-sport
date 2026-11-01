import { describe, expect, it } from 'vitest';
import { calculateCost, getRoleOption, ROLE_OPTIONS } from './pricing';

describe('pricing', () => {
  it('replica los factores del dominio', () => {
    expect(getRoleOption('NEIGHBOR').factor).toBe(1);
    expect(getRoleOption('YOUTH').factor).toBe(1);
    expect(getRoleOption('SENIOR').factor).toBe(0.5);
    expect(getRoleOption('PRIVATE_CLUB').factor).toBe(1.2);
    expect(ROLE_OPTIONS).toHaveLength(4);
  });

  it('aplica el beneficio y el recargo redondeando a dos decimales', () => {
    expect(calculateCost(120, 0.5)).toBe(60);
    expect(calculateCost(120, 1.2)).toBe(144);
    expect(calculateCost(33.33, 1.2)).toBe(40);
    expect(calculateCost(0, 0.5)).toBe(0);
  });

  it('lanza un error si el rol no existe', () => {
    // @ts-expect-error: validamos un valor fuera del contrato.
    expect(() => getRoleOption('UNKNOWN')).toThrow('Unknown role');
  });
});
