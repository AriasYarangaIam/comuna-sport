import { Cost } from "../../value-objects/cost.vo";

export interface CostCalculationStrategy {
    calculate(basePrice: Cost): Cost;
}

