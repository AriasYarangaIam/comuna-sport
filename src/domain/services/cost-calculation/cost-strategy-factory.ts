import { UserRoleType } from "../../value-objects/user-role.vo";
import { CostCalculationStrategy } from "./cost-calculation-strategy.interface";

export class CostStrategyFactory {
    private readonly registry = new Map<UserRoleType, () => CostCalculationStrategy>();

    register(role: UserRoleType, builder: () => CostCalculationStrategy): void {
        this.registry.set(role, builder);
    }

    createForRole(role: UserRoleType): CostCalculationStrategy {
        const builder = this.registry.get(role);
        if (!builder) throw new Error(`no cost strategy registered for role: ${role}`);
        return builder();
    }
}
