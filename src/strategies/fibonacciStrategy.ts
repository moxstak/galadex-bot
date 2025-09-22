import { Logger } from '../utils/logger';

export interface FibonacciSignal {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reason: string;
    fibonacciLevel: number;
    targetPrice: number;
    currentPrice: number;
}

export class FibonacciStrategy {
    private logger = new Logger('FibonacciStrategy');
    private priceHistory: Map<string, number[]> = new Map();
    private readonly minGainTarget = 0.10; // 10% minimum gain target

    analyzeFibonacci(symbol: string, prices: number[]): FibonacciSignal {
        if (prices.length < 10) {
            return {
                action: 'HOLD',
                confidence: 0,
                reason: 'Insufficient data for Fibonacci analysis',
                fibonacciLevel: 0,
                targetPrice: 0,
                currentPrice: prices[prices.length - 1] || 0
            };
        }

        const recentPrices = prices.slice(-10);
        const currentPrice = recentPrices[recentPrices.length - 1];
        
        // Find swing high and low for Fibonacci retracement
        const swingHigh = Math.max(...recentPrices);
        const swingLow = Math.min(...recentPrices);
        const range = swingHigh - swingLow;
        
        // Fibonacci retracement levels
        const fibLevels = {
            0.236: swingHigh - (range * 0.236),
            0.382: swingHigh - (range * 0.382),
            0.500: swingHigh - (range * 0.500),
            0.618: swingHigh - (range * 0.618),
            0.786: swingHigh - (range * 0.786)
        };
        
        // Fibonacci extension levels for profit targets
        const fibExtensions = {
            1.272: swingLow + (range * 1.272),
            1.414: swingLow + (range * 1.414),
            1.618: swingLow + (range * 1.618),
            2.000: swingLow + (range * 2.000)
        };

        let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let confidence = 0;
        let reason = '';
        let fibonacciLevel = 0;
        let targetPrice = 0;

        // Check for Fibonacci retracement buy signals
        if (currentPrice <= fibLevels[0.618] && currentPrice >= fibLevels[0.786]) {
            action = 'BUY';
            confidence = 0.8;
            fibonacciLevel = 0.618;
            targetPrice = fibExtensions[1.618]; // Target 1.618 extension
            reason = `Price ${currentPrice.toFixed(4)} at 61.8% Fibonacci retracement - strong buy signal`;
        } else if (currentPrice <= fibLevels[0.500] && currentPrice >= fibLevels[0.618]) {
            action = 'BUY';
            confidence = 0.6;
            fibonacciLevel = 0.500;
            targetPrice = fibExtensions[1.414];
            reason = `Price ${currentPrice.toFixed(4)} at 50% Fibonacci retracement - buy signal`;
        } else if (currentPrice <= fibLevels[0.382] && currentPrice >= fibLevels[0.500]) {
            action = 'BUY';
            confidence = 0.4;
            fibonacciLevel = 0.382;
            targetPrice = fibExtensions[1.272];
            reason = `Price ${currentPrice.toFixed(4)} at 38.2% Fibonacci retracement - weak buy signal`;
        }
        // Check for Fibonacci extension sell signals
        else if (currentPrice >= fibExtensions[1.618]) {
            action = 'SELL';
            confidence = 0.9;
            fibonacciLevel = 1.618;
            targetPrice = fibLevels[0.618];
            reason = `Price ${currentPrice.toFixed(4)} at 161.8% Fibonacci extension - strong sell signal`;
        } else if (currentPrice >= fibExtensions[1.414]) {
            action = 'SELL';
            confidence = 0.7;
            fibonacciLevel = 1.414;
            targetPrice = fibLevels[0.500];
            reason = `Price ${currentPrice.toFixed(4)} at 141.4% Fibonacci extension - sell signal`;
        } else if (currentPrice >= fibExtensions[1.272]) {
            action = 'SELL';
            confidence = 0.5;
            fibonacciLevel = 1.272;
            targetPrice = fibLevels[0.382];
            reason = `Price ${currentPrice.toFixed(4)} at 127.2% Fibonacci extension - weak sell signal`;
        }

        // Calculate potential gain
        if (action === 'BUY' && targetPrice > 0) {
            const potentialGain = (targetPrice - currentPrice) / currentPrice;
            if (potentialGain >= this.minGainTarget) {
                confidence = Math.min(0.95, confidence + 0.2); // Boost confidence for 10%+ gains
                reason += ` (Target: ${targetPrice.toFixed(4)}, Potential gain: ${(potentialGain * 100).toFixed(1)}%)`;
            }
        }

        this.logger.debug(`📊 Fibonacci Analysis for ${symbol}:`, {
            price: currentPrice,
            swingHigh,
            swingLow,
            fibonacciLevel,
            targetPrice,
            action,
            confidence: Math.round(confidence * 100) + '%'
        });

        return {
            action,
            confidence,
            reason,
            fibonacciLevel,
            targetPrice,
            currentPrice
        };
    }

    updatePriceHistory(symbol: string, price: number): void {
        if (!this.priceHistory.has(symbol)) {
            this.priceHistory.set(symbol, []);
        }
        
        const history = this.priceHistory.get(symbol)!;
        history.push(price);
        
        // Keep only last 50 prices for memory efficiency
        if (history.length > 50) {
            history.shift();
        }
    }

    getPriceHistory(symbol: string): number[] {
        return this.priceHistory.get(symbol) || [];
    }
}
