import { Cost } from "../../value-objects/cost.vo";
import { CostCalculationStrategy } from "./cost-calculation-strategy.interface";

export class PrivateClubStrategy implements CostCalculationStrategy {
    calculate(basePrice: Cost): Cost {
        return Cost.fromCalculation(basePrice.amount * 1.2, basePrice.currency);
    }
}