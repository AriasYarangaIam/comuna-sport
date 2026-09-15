import { Cost } from "../../value-objects/cost.vo";
import { CostCalculationStrategy } from "./cost-calculation-strategy.interface";

export class SeniorDiscountStrategy implements CostCalculationStrategy {
    calculate(basePrice: Cost): Cost {
        return Cost.fromCalculation(basePrice.amount * 0.5, basePrice.currency);
    }
}