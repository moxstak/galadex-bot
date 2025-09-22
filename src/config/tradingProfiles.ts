export interface StrategyWeights {
    arbitrage: number;
    momentum: number;
    volume: number;
    trend: number;
    bollingerBands: number;
    fibonacci: number;
    dca: number;
}

export interface TradingProfile {
    id: string;
    name: string;
    description: string;
    strategyWeights: StrategyWeights;
    riskSettings: {
        maxPositionSize: number;
        minConfidenceThreshold: number;
        maxDailyLoss: number;
        maxDrawdown: number;
        tradeCooldownMinutes: number;
    };
    tradingSettings: {
        scanIntervalMs: number;
        minProfitThreshold: number;
        maxSlippage: number;
        enableDryRun: boolean;
    };
    enabledStrategies: {
        arbitrage: boolean;
        momentum: boolean;
        volume: boolean;
        trend: boolean;
        bollingerBands: boolean;
        fibonacci: boolean;
        dca: boolean;
    };
}

export const DEFAULT_PROFILES: TradingProfile[] = [
    {
        id: 'conservative',
        name: 'Conservative',
        description: 'Low risk, steady gains with focus on arbitrage and trend following',
        strategyWeights: {
            arbitrage: 0.40,
            momentum: 0.15,
            volume: 0.10,
            trend: 0.20,
            bollingerBands: 0.10,
            fibonacci: 0.05,
            dca: 0.00
        },
        riskSettings: {
            maxPositionSize: 500,
            minConfidenceThreshold: 0.6,
            maxDailyLoss: 25,
            maxDrawdown: 50,
            tradeCooldownMinutes: 10
        },
        tradingSettings: {
            scanIntervalMs: 60000,
            minProfitThreshold: 0.02,
            maxSlippage: 0.03,
            enableDryRun: true
        },
        enabledStrategies: {
            arbitrage: true,
            momentum: true,
            volume: false,
            trend: true,
            bollingerBands: true,
            fibonacci: false,
            dca: false
        }
    },
    {
        id: 'balanced',
        name: 'Balanced',
        description: 'Moderate risk with diversified strategy approach',
        strategyWeights: {
            arbitrage: 0.25,
            momentum: 0.15,
            volume: 0.10,
            trend: 0.10,
            bollingerBands: 0.15,
            fibonacci: 0.15,
            dca: 0.10
        },
        riskSettings: {
            maxPositionSize: 1000,
            minConfidenceThreshold: 0.5,
            maxDailyLoss: 50,
            maxDrawdown: 100,
            tradeCooldownMinutes: 5
        },
        tradingSettings: {
            scanIntervalMs: 30000,
            minProfitThreshold: 0.01,
            maxSlippage: 0.05,
            enableDryRun: true
        },
        enabledStrategies: {
            arbitrage: true,
            momentum: true,
            volume: true,
            trend: true,
            bollingerBands: true,
            fibonacci: true,
            dca: true
        }
    },
    {
        id: 'aggressive',
        name: 'Aggressive',
        description: 'High risk, high reward with all strategies enabled',
        strategyWeights: {
            arbitrage: 0.20,
            momentum: 0.20,
            volume: 0.15,
            trend: 0.10,
            bollingerBands: 0.15,
            fibonacci: 0.15,
            dca: 0.05
        },
        riskSettings: {
            maxPositionSize: 2000,
            minConfidenceThreshold: 0.4,
            maxDailyLoss: 100,
            maxDrawdown: 200,
            tradeCooldownMinutes: 2
        },
        tradingSettings: {
            scanIntervalMs: 15000,
            minProfitThreshold: 0.005,
            maxSlippage: 0.08,
            enableDryRun: false
        },
        enabledStrategies: {
            arbitrage: true,
            momentum: true,
            volume: true,
            trend: true,
            bollingerBands: true,
            fibonacci: true,
            dca: true
        }
    },
    {
        id: 'arbitrage-focused',
        name: 'Arbitrage Focused',
        description: 'Specialized in arbitrage opportunities with minimal other strategies',
        strategyWeights: {
            arbitrage: 0.70,
            momentum: 0.10,
            volume: 0.10,
            trend: 0.05,
            bollingerBands: 0.03,
            fibonacci: 0.02,
            dca: 0.00
        },
        riskSettings: {
            maxPositionSize: 1500,
            minConfidenceThreshold: 0.7,
            maxDailyLoss: 75,
            maxDrawdown: 150,
            tradeCooldownMinutes: 3
        },
        tradingSettings: {
            scanIntervalMs: 10000,
            minProfitThreshold: 0.005,
            maxSlippage: 0.02,
            enableDryRun: true
        },
        enabledStrategies: {
            arbitrage: true,
            momentum: true,
            volume: true,
            trend: false,
            bollingerBands: false,
            fibonacci: false,
            dca: false
        }
    },
    {
        id: 'technical-analysis',
        name: 'Technical Analysis',
        description: 'Focus on technical indicators: Bollinger Bands, Fibonacci, and trend analysis',
        strategyWeights: {
            arbitrage: 0.10,
            momentum: 0.15,
            volume: 0.10,
            trend: 0.25,
            bollingerBands: 0.25,
            fibonacci: 0.15,
            dca: 0.00
        },
        riskSettings: {
            maxPositionSize: 800,
            minConfidenceThreshold: 0.55,
            maxDailyLoss: 40,
            maxDrawdown: 80,
            tradeCooldownMinutes: 7
        },
        tradingSettings: {
            scanIntervalMs: 45000,
            minProfitThreshold: 0.015,
            maxSlippage: 0.04,
            enableDryRun: true
        },
        enabledStrategies: {
            arbitrage: true,
            momentum: true,
            volume: true,
            trend: true,
            bollingerBands: true,
            fibonacci: true,
            dca: false
        }
    }
];

export function validateStrategyWeights(weights: StrategyWeights): boolean {
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    return Math.abs(total - 1.0) < 0.001; // Allow for small floating point errors
}

export function normalizeStrategyWeights(weights: StrategyWeights): StrategyWeights {
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    if (total === 0) return weights;
    
    return {
        arbitrage: weights.arbitrage / total,
        momentum: weights.momentum / total,
        volume: weights.volume / total,
        trend: weights.trend / total,
        bollingerBands: weights.bollingerBands / total,
        fibonacci: weights.fibonacci / total,
        dca: weights.dca / total
    };
}

export function createCustomProfile(
    id: string,
    name: string,
    description: string,
    strategyWeights: StrategyWeights,
    riskSettings: TradingProfile['riskSettings'],
    tradingSettings: TradingProfile['tradingSettings'],
    enabledStrategies: TradingProfile['enabledStrategies']
): TradingProfile {
    // Normalize weights to ensure they sum to 1.0
    const normalizedWeights = normalizeStrategyWeights(strategyWeights);
    
    return {
        id,
        name,
        description,
        strategyWeights: normalizedWeights,
        riskSettings,
        tradingSettings,
        enabledStrategies
    };
}
