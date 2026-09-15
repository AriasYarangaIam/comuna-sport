import { CostCalculationStrategy } from "./cost-calculation-strategy.interface";
import { Cost } from "../../value-objects/cost.vo";

export class NeighborDefaultStrategy implements CostCalculationStrategy {
    calculate(basePrice: Cost): Cost {
        return Cost.fromCalculation(basePrice.amount, basePrice.currency);
    }
}