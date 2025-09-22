import { Logger } from '../utils/logger';

export interface BollingerBandsSignal {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reason: string;
    upperBand: number;
    middleBand: number;
    lowerBand: number;
    price: number;
}

export class BollingerBandsStrategy {
    private logger = new Logger('BollingerBandsStrategy');
    private priceHistory: Map<string, number[]> = new Map();
    private readonly period = 20; // Standard period
    private readonly stdDev = 2; // Standard deviation multiplier

    analyzeBollingerBands(symbol: string, prices: number[]): BollingerBandsSignal {
        if (prices.length < this.period) {
            return {
                action: 'HOLD',
                confidence: 0,
                reason: 'Insufficient data for Bollinger Bands',
                upperBand: 0,
                middleBand: 0,
                lowerBand: 0,
                price: prices[prices.length - 1] || 0
            };
        }

        const recentPrices = prices.slice(-this.period);
        const currentPrice = recentPrices[recentPrices.length - 1];
        
        // Calculate Simple Moving Average (middle band)
        const sma = recentPrices.reduce((sum, price) => sum + price, 0) / this.period;
        
        // Calculate standard deviation
        const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / this.period;
        const stdDeviation = Math.sqrt(variance);
        
        // Calculate bands
        const upperBand = sma + (this.stdDev * stdDeviation);
        const lowerBand = sma - (this.stdDev * stdDeviation);
        
        // Determine signal
        let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let confidence = 0;
        let reason = '';

        if (currentPrice <= lowerBand) {
            // Price at or below lower band - potential buy signal
            action = 'BUY';
            confidence = Math.min(0.9, (lowerBand - currentPrice) / lowerBand * 2);
            reason = `Price ${currentPrice.toFixed(4)} at lower Bollinger Band ${lowerBand.toFixed(4)} - oversold signal`;
        } else if (currentPrice >= upperBand) {
            // Price at or above upper band - potential sell signal
            action = 'SELL';
            confidence = Math.min(0.9, (currentPrice - upperBand) / upperBand * 2);
            reason = `Price ${currentPrice.toFixed(4)} at upper Bollinger Band ${upperBand.toFixed(4)} - overbought signal`;
        } else if (currentPrice > sma && currentPrice < upperBand) {
            // Price above middle band but below upper - bullish trend
            action = 'BUY';
            confidence = 0.3;
            reason = `Price ${currentPrice.toFixed(4)} above middle band ${sma.toFixed(4)} - bullish trend`;
        } else if (currentPrice < sma && currentPrice > lowerBand) {
            // Price below middle band but above lower - bearish trend
            action = 'SELL';
            confidence = 0.3;
            reason = `Price ${currentPrice.toFixed(4)} below middle band ${sma.toFixed(4)} - bearish trend`;
        } else {
            reason = `Price ${currentPrice.toFixed(4)} within normal range`;
        }

        this.logger.debug(`📊 Bollinger Bands Analysis for ${symbol}:`, {
            price: currentPrice,
            upperBand,
            middleBand: sma,
            lowerBand,
            action,
            confidence: Math.round(confidence * 100) + '%'
        });

        return {
            action,
            confidence,
            reason,
            upperBand,
            middleBand: sma,
            lowerBand,
            price: currentPrice
        };
    }

    updatePriceHistory(symbol: string, price: number): void {
        if (!this.priceHistory.has(symbol)) {
            this.priceHistory.set(symbol, []);
        }
        
        const history = this.priceHistory.get(symbol)!;
        history.push(price);
        
        // Keep only last 100 prices for memory efficiency
        if (history.length > 100) {
            history.shift();
        }
    }

    getPriceHistory(symbol: string): number[] {
        return this.priceHistory.get(symbol) || [];
    }
}
