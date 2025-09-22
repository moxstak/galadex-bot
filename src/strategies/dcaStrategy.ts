import { Logger } from '../utils/logger';

export interface DCASignal {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reason: string;
    dcaAmount: number;
    averagePrice: number;
    currentPrice: number;
    dcaCount: number;
}

interface DCAPosition {
    symbol: string;
    totalAmount: number;
    totalCost: number;
    averagePrice: number;
    dcaCount: number;
    lastDCATime: number;
    targetPrice: number;
}

export class DCAStrategy {
    private logger = new Logger('DCAStrategy');
    private dcaPositions: Map<string, DCAPosition> = new Map();
    private readonly baseDCAAmount = 100; // Base DCA amount in tokens
    private readonly maxDCACount = 10; // Maximum DCA positions
    private readonly dcaInterval = 300000; // 5 minutes between DCA attempts

    analyzeDCA(symbol: string, currentPrice: number): DCASignal {
        const position = this.dcaPositions.get(symbol);
        const now = Date.now();

        // Check if we should start a new DCA position
        if (!position) {
            return {
                action: 'BUY',
                confidence: 0.6,
                reason: `Starting new DCA position for ${symbol} at ${currentPrice.toFixed(4)}`,
                dcaAmount: this.baseDCAAmount,
                averagePrice: currentPrice,
                currentPrice,
                dcaCount: 0
            };
        }

        // Check if enough time has passed since last DCA
        if (now - position.lastDCATime < this.dcaInterval) {
            return {
                action: 'HOLD',
                confidence: 0,
                reason: `DCA cooldown active for ${symbol} - ${Math.ceil((this.dcaInterval - (now - position.lastDCATime)) / 1000)}s remaining`,
                dcaAmount: 0,
                averagePrice: position.averagePrice,
                currentPrice,
                dcaCount: position.dcaCount
            };
        }

        // Check if we've reached max DCA count
        if (position.dcaCount >= this.maxDCACount) {
            // Consider selling if we have a good profit
            const profitPercent = (currentPrice - position.averagePrice) / position.averagePrice;
            if (profitPercent >= 0.05) { // 5% profit
                return {
                    action: 'SELL',
                    confidence: 0.8,
                    reason: `DCA complete for ${symbol} - ${(profitPercent * 100).toFixed(1)}% profit achieved`,
                    dcaAmount: position.totalAmount,
                    averagePrice: position.averagePrice,
                    currentPrice,
                    dcaCount: position.dcaCount
                };
            } else {
                return {
                    action: 'HOLD',
                    confidence: 0,
                    reason: `DCA complete for ${symbol} - waiting for better exit price`,
                    dcaAmount: 0,
                    averagePrice: position.averagePrice,
                    currentPrice,
                    dcaCount: position.dcaCount
                };
            }
        }

        // Calculate DCA amount based on current price vs average
        const priceDiff = (currentPrice - position.averagePrice) / position.averagePrice;
        let dcaAmount = this.baseDCAAmount;
        let confidence = 0.5;

        if (priceDiff < -0.05) { // Price is 5% below average - increase DCA
            dcaAmount = this.baseDCAAmount * 1.5;
            confidence = 0.8;
        } else if (priceDiff < -0.02) { // Price is 2% below average - normal DCA
            dcaAmount = this.baseDCAAmount;
            confidence = 0.7;
        } else if (priceDiff < 0.02) { // Price is close to average - smaller DCA
            dcaAmount = this.baseDCAAmount * 0.5;
            confidence = 0.4;
        } else { // Price is above average - skip this DCA
            return {
                action: 'HOLD',
                confidence: 0,
                reason: `Price ${currentPrice.toFixed(4)} above DCA average ${position.averagePrice.toFixed(4)} - skipping DCA`,
                dcaAmount: 0,
                averagePrice: position.averagePrice,
                currentPrice,
                dcaCount: position.dcaCount
            };
        }

        this.logger.debug(`📊 DCA Analysis for ${symbol}:`, {
            currentPrice,
            averagePrice: position.averagePrice,
            dcaCount: position.dcaCount,
            priceDiff: (priceDiff * 100).toFixed(2) + '%',
            dcaAmount,
            confidence: Math.round(confidence * 100) + '%'
        });

        return {
            action: 'BUY',
            confidence,
            reason: `DCA ${position.dcaCount + 1}/${this.maxDCACount} for ${symbol} - price ${(priceDiff * 100).toFixed(1)}% below average`,
            dcaAmount,
            averagePrice: position.averagePrice,
            currentPrice,
            dcaCount: position.dcaCount
        };
    }

    executeDCA(symbol: string, amount: number, price: number): void {
        const position = this.dcaPositions.get(symbol);
        const now = Date.now();

        if (!position) {
            // Create new DCA position
            this.dcaPositions.set(symbol, {
                symbol,
                totalAmount: amount,
                totalCost: amount * price,
                averagePrice: price,
                dcaCount: 1,
                lastDCATime: now,
                targetPrice: price * 1.1 // 10% target
            });
        } else {
            // Update existing DCA position
            const newTotalAmount = position.totalAmount + amount;
            const newTotalCost = position.totalCost + (amount * price);
            const newAveragePrice = newTotalCost / newTotalAmount;

            this.dcaPositions.set(symbol, {
                ...position,
                totalAmount: newTotalAmount,
                totalCost: newTotalCost,
                averagePrice: newAveragePrice,
                dcaCount: position.dcaCount + 1,
                lastDCATime: now
            });
        }

        this.logger.info(`💰 DCA executed for ${symbol}: ${amount} tokens at ${price.toFixed(4)} (Average: ${this.dcaPositions.get(symbol)!.averagePrice.toFixed(4)})`);
    }

    getDCAPosition(symbol: string): DCAPosition | undefined {
        return this.dcaPositions.get(symbol);
    }

    getAllDCAPositions(): DCAPosition[] {
        return Array.from(this.dcaPositions.values());
    }

    clearDCAPosition(symbol: string): void {
        this.dcaPositions.delete(symbol);
        this.logger.info(`🗑️ DCA position cleared for ${symbol}`);
    }
}
