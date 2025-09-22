import { Logger } from '../utils/logger';
import { GalaDexService, GalaToken } from '../services/galaDexService';
import { Config } from '../config';

export interface TradingSignal {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number; // 0-1
    reason: string;
    targetPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
}

export interface MarketData {
    symbol: string;
    price: number;
    volume24h: number;
    priceChange24h: number;
    priceChangePercent24h: number;
    timestamp: number;
}

export class TradingStrategy {
    private logger = new Logger('TradingStrategy');
    private galaDexService: GalaDexService;
    private priceHistory: Map<string, number[]> = new Map();
    private volumeHistory: Map<string, number[]> = new Map();
    private lastSignals: Map<string, TradingSignal> = new Map();

    constructor(galaDexService: GalaDexService) {
        this.galaDexService = galaDexService;
    }

    async analyzeMarket(): Promise<Map<string, TradingSignal>> {
        const signals = new Map<string, TradingSignal>();
        const tokens = this.galaDexService.getSupportedTokens();

        this.logger.info('🔍 Analyzing market conditions...');

        for (const token of tokens) {
            try {
                const signal = await this.analyzeToken(token);
                if (signal.action !== 'HOLD') {
                    signals.set(token.symbol, signal);
                    this.lastSignals.set(token.symbol, signal);
                }
            } catch (error) {
                this.logger.error(`Failed to analyze ${token.symbol}:`, error);
            }
        }

        return signals;
    }

    private async analyzeToken(token: GalaToken): Promise<TradingSignal> {
        const symbol = token.symbol;
        
        // Get current price data
        const currentPrice = await this.getCurrentPrice(token);
        if (!currentPrice) {
            return { action: 'HOLD', confidence: 0, reason: 'No price data available' };
        }

        // Update price history
        this.updatePriceHistory(symbol, currentPrice);

        // Get price history for analysis
        const prices = this.priceHistory.get(symbol) || [];
        if (prices.length < 10) {
            return { action: 'HOLD', confidence: 0, reason: 'Insufficient price history' };
        }

        // Multiple strategy analysis
        const arbitrageSignal = await this.analyzeArbitrage(token, currentPrice);
        const momentumSignal = this.analyzeMomentum(symbol, prices);
        const volumeSignal = this.analyzeVolume(symbol, currentPrice);
        const trendSignal = this.analyzeTrend(symbol, prices);

        // Combine signals with weighted scoring
        const signals = [arbitrageSignal, momentumSignal, volumeSignal, trendSignal];
        const weights = [0.4, 0.25, 0.2, 0.15]; // Arbitrage gets highest weight

        const combinedSignal = this.combineSignals(signals, weights);
        
        this.logger.debug(`📊 ${symbol} Analysis:`, {
            arbitrage: arbitrageSignal.confidence,
            momentum: momentumSignal.confidence,
            volume: volumeSignal.confidence,
            trend: trendSignal.confidence,
            combined: combinedSignal.confidence
        });

        return combinedSignal;
    }

    private async analyzeArbitrage(token: GalaToken, currentPrice: number): Promise<TradingSignal> {
        try {
            // Check for arbitrage opportunities across different fee tiers
            const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
            const quotes = [];

            for (const fee of feeTiers) {
                try {
                    const quote = await this.galaDexService.gswap.quoting.quoteExactInput(
                        token.classKey as any,
                        'GUSDC|Unit|none|none',
                        '100',
                        fee
                    );
                    const price = parseFloat((quote as any).outTokenAmount || '0');
                    quotes.push({ fee, price });
                } catch (error) {
                    // Pool might not exist for this fee tier
                }
            }

            if (quotes.length < 2) {
                return { action: 'HOLD', confidence: 0, reason: 'Insufficient arbitrage data' };
            }

            // Find best and worst prices
            const sortedQuotes = quotes.sort((a, b) => b.price - a.price);
            const bestPrice = sortedQuotes[0].price;
            const worstPrice = sortedQuotes[sortedQuotes.length - 1].price;
            const priceDifference = bestPrice - worstPrice;
            const priceDifferencePercent = (priceDifference / worstPrice) * 100;

            if (priceDifferencePercent > 0.5) { // 0.5% difference threshold
                const bestQuote = sortedQuotes[0];
                return {
                    action: 'BUY',
                    confidence: Math.min(priceDifferencePercent / 2, 1), // Cap at 1
                    reason: `Arbitrage opportunity: ${priceDifferencePercent.toFixed(2)}% price difference between fee tiers`,
                    targetPrice: bestPrice
                };
            }

            return { action: 'HOLD', confidence: 0, reason: 'No significant arbitrage opportunity' };
        } catch (error) {
            this.logger.error(`Arbitrage analysis failed for ${token.symbol}:`, error);
            return { action: 'HOLD', confidence: 0, reason: 'Arbitrage analysis failed' };
        }
    }

    private analyzeMomentum(symbol: string, prices: number[]): TradingSignal {
        if (prices.length < 20) {
            return { action: 'HOLD', confidence: 0, reason: 'Insufficient data for momentum analysis' };
        }

        const recent = prices.slice(-10);
        const older = prices.slice(-20, -10);
        
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        
        const momentum = (recentAvg - olderAvg) / olderAvg;
        const momentumPercent = momentum * 100;

        if (momentumPercent > 2) {
            return {
                action: 'BUY',
                confidence: Math.min(Math.abs(momentumPercent) / 10, 0.8),
                reason: `Strong upward momentum: ${momentumPercent.toFixed(2)}%`
            };
        } else if (momentumPercent < -2) {
            return {
                action: 'SELL',
                confidence: Math.min(Math.abs(momentumPercent) / 10, 0.8),
                reason: `Strong downward momentum: ${momentumPercent.toFixed(2)}%`
            };
        }

        return { action: 'HOLD', confidence: 0, reason: 'No significant momentum' };
    }

    private analyzeVolume(symbol: string, currentPrice: number): TradingSignal {
        // For now, we'll use a simple volume analysis
        // In a real implementation, you'd track actual volume data
        const volume = this.volumeHistory.get(symbol) || [];
        
        if (volume.length < 5) {
            return { action: 'HOLD', confidence: 0, reason: 'Insufficient volume data' };
        }

        const recentVolume = volume.slice(-3);
        const avgVolume = recentVolume.reduce((a, b) => a + b, 0) / recentVolume.length;
        const currentVolume = recentVolume[recentVolume.length - 1];

        const volumeRatio = currentVolume / avgVolume;

        if (volumeRatio > 1.5) {
            return {
                action: 'BUY',
                confidence: Math.min((volumeRatio - 1) * 0.3, 0.6),
                reason: `High volume spike: ${(volumeRatio * 100).toFixed(0)}% of average`
            };
        }

        return { action: 'HOLD', confidence: 0, reason: 'Normal volume levels' };
    }

    private analyzeTrend(symbol: string, prices: number[]): TradingSignal {
        if (prices.length < 15) {
            return { action: 'HOLD', confidence: 0, reason: 'Insufficient data for trend analysis' };
        }

        // Simple moving average crossover
        const shortMA = this.calculateMA(prices.slice(-5));
        const longMA = this.calculateMA(prices.slice(-15));
        
        const trendStrength = (shortMA - longMA) / longMA;
        const trendPercent = trendStrength * 100;

        if (trendPercent > 1) {
            return {
                action: 'BUY',
                confidence: Math.min(Math.abs(trendPercent) / 5, 0.7),
                reason: `Uptrend detected: ${trendPercent.toFixed(2)}%`
            };
        } else if (trendPercent < -1) {
            return {
                action: 'SELL',
                confidence: Math.min(Math.abs(trendPercent) / 5, 0.7),
                reason: `Downtrend detected: ${trendPercent.toFixed(2)}%`
            };
        }

        return { action: 'HOLD', confidence: 0, reason: 'No clear trend' };
    }

    private combineSignals(signals: TradingSignal[], weights: number[]): TradingSignal {
        let buyScore = 0;
        let sellScore = 0;
        let totalWeight = 0;
        let reasons: string[] = [];

        for (let i = 0; i < signals.length; i++) {
            const signal = signals[i];
            const weight = weights[i];
            
            if (signal.action === 'BUY') {
                buyScore += signal.confidence * weight;
                reasons.push(signal.reason);
            } else if (signal.action === 'SELL') {
                sellScore += signal.confidence * weight;
                reasons.push(signal.reason);
            }
            
            totalWeight += weight;
        }

        const netScore = buyScore - sellScore;
        const confidence = Math.abs(netScore);

        if (confidence < 0.3) {
            return { action: 'HOLD', confidence: 0, reason: 'Weak signal strength' };
        }

        return {
            action: netScore > 0 ? 'BUY' : 'SELL',
            confidence: Math.min(confidence, 1),
            reason: reasons.join('; ')
        };
    }

    private async getCurrentPrice(token: GalaToken): Promise<number | null> {
        try {
            const quote = await this.galaDexService.gswap.quoting.quoteExactInput(
                token.classKey as any,
                'GUSDC|Unit|none|none',
                '1',
                500
            );
            return parseFloat((quote as any).outTokenAmount || '0');
        } catch (error) {
            return null;
        }
    }

    private updatePriceHistory(symbol: string, price: number): void {
        const prices = this.priceHistory.get(symbol) || [];
        prices.push(price);
        
        // Keep only last 100 prices
        if (prices.length > 100) {
            prices.shift();
        }
        
        this.priceHistory.set(symbol, prices);
    }

    private calculateMA(prices: number[]): number {
        return prices.reduce((a, b) => a + b, 0) / prices.length;
    }

    // Risk management methods
    shouldExecuteTrade(signal: TradingSignal, currentBalance: number): boolean {
        // Don't trade if confidence is too low
        if (signal.confidence < 0.4) {
            return false;
        }

        // Don't trade if we don't have enough balance
        if (currentBalance < 100) {
            this.logger.warn('Insufficient balance for trading');
            return false;
        }

        // Check if we've already traded this token recently
        const lastSignal = this.lastSignals.get(signal.reason.split(' ')[0]);
        if (lastSignal && Date.now() - (lastSignal as any).timestamp < 300000) { // 5 minutes
            this.logger.debug('Skipping trade - too recent');
            return false;
        }

        return true;
    }

    calculatePositionSize(signal: TradingSignal, availableBalance: number): number {
        // Kelly Criterion for position sizing
        const winRate = 0.6; // Assume 60% win rate
        const avgWin = 0.02; // 2% average win
        const avgLoss = 0.01; // 1% average loss
        
        const kellyFraction = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
        const positionSize = Math.min(kellyFraction * availableBalance, availableBalance * 0.1); // Max 10% of balance
        
        // Adjust based on signal confidence
        return positionSize * signal.confidence;
    }
}
