/// <reference types="node" />
/// <reference types="jest" />

import { SeniorDiscountStrategy } from "../../src/domain/services/cost-calculation/senior-discount.strategy";
import { PrivateClubStrategy } from "../../src/domain/services/cost-calculation/private-club.strategy";
import { NeighborDefaultStrategy } from "../../src/domain/services/cost-calculation/neighbor-default.strategy";
import type { CostCalculationStrategy } from "../../src/domain/services/cost-calculation/cost-calculation-strategy.interface";
import { CostStrategyFactory } from "../../src/domain/services/cost-calculation/cost-strategy-factory";
import { Cost } from "../../src/domain/value-objects/cost.vo";
import type { UserRoleType } from "../../src/domain/value-objects/user-role.vo";

// Mirrors the composition root's registry composition (§5 / buildContainer):
// the factory only knows `register` + `Map.get` — never the concretes.
const buildComposedFactory = (): CostStrategyFactory => {
    const factory: CostStrategyFactory = new CostStrategyFactory();
    factory.register('NEIGHBOR', (): CostCalculationStrategy => new NeighborDefaultStrategy());
    factory.register('YOUTH', (): CostCalculationStrategy => new NeighborDefaultStrategy());
    factory.register('SENIOR', (): CostCalculationStrategy => new SeniorDiscountStrategy());
    factory.register('PRIVATE_CLUB', (): CostCalculationStrategy => new PrivateClubStrategy());
    return factory;
};

describe('Cost strategies through the registry factory (§5)', (): void => {
    it('NEIGHBOR keeps the base price (100 → 100)', (): void => {
        const factory: CostStrategyFactory = buildComposedFactory();
        const cost: Cost = factory.createForRole('NEIGHBOR').calculate(Cost.create(100, 'PEN'));
        expect(cost.amount).toBe(100);
        expect(cost.currency).toBe('PEN');
    });

    it('YOUTH shares the default multiplier (100 → 100)', (): void => {
        const factory: CostStrategyFactory = buildComposedFactory();
        const cost: Cost = factory.createForRole('YOUTH').calculate(Cost.create(100, 'PEN'));
        expect(cost.amount).toBe(100);
        expect(cost.currency).toBe('PEN');
    });

    it('SENIOR applies the 50% discount (100 → 50)', (): void => {
        const factory: CostStrategyFactory = buildComposedFactory();
        const cost: Cost = factory.createForRole('SENIOR').calculate(Cost.create(100, 'PEN'));
        expect(cost.amount).toBe(50);
        expect(cost.currency).toBe('PEN');
    });

    it('PRIVATE_CLUB keeps the currency through rounding (50.50 → 60.60 PEN)', (): void => {
        const factory: CostStrategyFactory = buildComposedFactory();
        const cost: Cost = factory.createForRole('PRIVATE_CLUB').calculate(Cost.create(50.5, 'PEN'));
        expect(cost.amount).toBe(60.6);
        expect(cost.currency).toBe('PEN');
    });

    it('PRIVATE_CLUB scales linearly on a round base (100 → 120)', (): void => {
        const factory: CostStrategyFactory = buildComposedFactory();
        expect(factory.createForRole('PRIVATE_CLUB').calculate(Cost.create(100, 'PEN')).amount).toBe(120);
    });

    it('registry miss throws with the role in the message', (): void => {
        const factory: CostStrategyFactory = new CostStrategyFactory();
        expect((): CostCalculationStrategy => factory.createForRole('SENIOR')).toThrow(
            'no cost strategy registered for role: SENIOR'
        );
    });

    it('strategies are stateless — two calls return equal results', (): void => {
        const senior: CostCalculationStrategy = new SeniorDiscountStrategy();
        const first: Cost = senior.calculate(Cost.create(73.33, 'PEN'));
        const second: Cost = senior.calculate(Cost.create(73.33, 'PEN'));
        expect(second.amount).toBe(first.amount);
        expect(second.currency).toBe(first.currency);
    });

    it('register extends the factory with an anonymous strategy — concretes are not wired into the factory', (): void => {
        // A strategy declared ONLY in this test: if the factory resolved
        // concretes by name (switch/if-chain) this registration would be
        // irrelevant or broken.
        const factory: CostStrategyFactory = new CostStrategyFactory();
        const halfPrice: CostCalculationStrategy = {
            calculate: (basePrice: Cost): Cost => Cost.fromCalculation(basePrice.amount * 0.5, basePrice.currency),
        };
        factory.register('YOUTH', (): CostCalculationStrategy => halfPrice);
        expect(factory.createForRole('YOUTH').calculate(Cost.create(100, 'PEN')).amount).toBe(50);
    });

    it('register overrides a previous role mapping', (): void => {
        const factory: CostStrategyFactory = buildComposedFactory();
        factory.register('YOUTH', (): CostCalculationStrategy => new SeniorDiscountStrategy());
        expect(factory.createForRole('YOUTH').calculate(Cost.create(100, 'PEN')).amount).toBe(50);
    });

    it('every composed role in §5 resolves without a miss', (): void => {
        const factory: CostStrategyFactory = buildComposedFactory();
        const roles: UserRoleType[] = ['NEIGHBOR', 'YOUTH', 'SENIOR', 'PRIVATE_CLUB'];
        for (const role of roles) {
            expect((): CostCalculationStrategy => factory.createForRole(role)).not.toThrow();
        }
    });
});
