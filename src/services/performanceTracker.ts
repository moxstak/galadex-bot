import { Logger } from '../utils/logger';

export interface PerformanceMetrics {
    totalTrades: number;
    profitableTrades: number;
    totalVolume: number;
    totalProfit: number;
    winRate: number;
    averageWin: number;
    averageLoss: number;
    maxDrawdown: number;
    sharpeRatio: number;
    startTime: number;
    lastUpdate: number;
}

export interface TradeRecord {
    id: string;
    symbol: string;
    action: 'BUY' | 'SELL';
    amount: number;
    price: number;
    timestamp: number;
    profit?: number;
    isProfitable?: boolean;
}

export class PerformanceTracker {
    private logger = new Logger('PerformanceTracker');
    private metrics: PerformanceMetrics;
    private trades: TradeRecord[] = [];
    private dailyPnL: Map<string, number> = new Map(); // Date -> PnL
    private peakBalance = 0;

    constructor() {
        this.metrics = {
            totalTrades: 0,
            profitableTrades: 0,
            totalVolume: 0,
            totalProfit: 0,
            winRate: 0,
            averageWin: 0,
            averageLoss: 0,
            maxDrawdown: 0,
            sharpeRatio: 0,
            startTime: Date.now(),
            lastUpdate: Date.now()
        };
    }

    recordTrade(trade: TradeRecord): void {
        this.trades.push(trade);
        this.metrics.totalTrades++;
        this.metrics.totalVolume += trade.amount * trade.price;
        this.metrics.lastUpdate = Date.now();

        // Update daily PnL
        const date = new Date(trade.timestamp).toDateString();
        const currentDailyPnL = this.dailyPnL.get(date) || 0;
        this.dailyPnL.set(date, currentDailyPnL + (trade.profit || 0));

        // Update profit metrics
        if (trade.profit !== undefined) {
            this.metrics.totalProfit += trade.profit;
            
            if (trade.isProfitable) {
                this.metrics.profitableTrades++;
            }

            // Update win rate
            this.metrics.winRate = this.metrics.profitableTrades / this.metrics.totalTrades;

            // Update average win/loss
            const profitableTrades = this.trades.filter(t => t.isProfitable && t.profit);
            const losingTrades = this.trades.filter(t => !t.isProfitable && t.profit);

            if (profitableTrades.length > 0) {
                this.metrics.averageWin = profitableTrades.reduce((sum, t) => sum + (t.profit || 0), 0) / profitableTrades.length;
            }

            if (losingTrades.length > 0) {
                this.metrics.averageLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit || 0), 0) / losingTrades.length);
            }

            // Update max drawdown
            this.updateMaxDrawdown();

            // Update Sharpe ratio
            this.updateSharpeRatio();
        }

        this.logger.debug(`📊 Trade recorded: ${trade.symbol} ${trade.action} ${trade.amount} @ ${trade.price} (Profit: ${trade.profit?.toFixed(4) || 'N/A'})`);
    }

    private updateMaxDrawdown(): void {
        let runningBalance = 0;
        let peak = 0;
        let maxDrawdown = 0;

        for (const trade of this.trades) {
            if (trade.profit) {
                runningBalance += trade.profit;
                peak = Math.max(peak, runningBalance);
                const drawdown = peak - runningBalance;
                maxDrawdown = Math.max(maxDrawdown, drawdown);
            }
        }

        this.metrics.maxDrawdown = maxDrawdown;
    }

    private updateSharpeRatio(): void {
        const dailyReturns = Array.from(this.dailyPnL.values());
        if (dailyReturns.length < 2) {
            this.metrics.sharpeRatio = 0;
            return;
        }

        const meanReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length;
        const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / dailyReturns.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev === 0) {
            this.metrics.sharpeRatio = 0;
        } else {
            // Assuming risk-free rate of 2% annually
            const riskFreeRate = 0.02 / 365; // Daily risk-free rate
            this.metrics.sharpeRatio = (meanReturn - riskFreeRate) / stdDev;
        }
    }

    getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    getRecentTrades(count: number = 10): TradeRecord[] {
        return this.trades.slice(-count).reverse();
    }

    getProfitableTrades(): TradeRecord[] {
        return this.trades.filter(t => t.isProfitable);
    }

    getTradesBySymbol(symbol: string): TradeRecord[] {
        return this.trades.filter(t => t.symbol === symbol);
    }

    getDailyPnL(): Map<string, number> {
        return new Map(this.dailyPnL);
    }

    getPerformanceSummary(): string {
        const metrics = this.getMetrics();
        const runtime = Math.floor((Date.now() - metrics.startTime) / 1000 / 60); // minutes

        return `
📊 === PERFORMANCE SUMMARY ===
⏰ Runtime: ${runtime} minutes
📈 Trading Performance:
   Total Trades: ${metrics.totalTrades}
   Profitable: ${metrics.profitableTrades}
   Win Rate: ${(metrics.winRate * 100).toFixed(1)}%
   Total Volume: $${metrics.totalVolume.toFixed(2)}
   Total Profit: $${metrics.totalProfit.toFixed(2)}
   Average Win: $${metrics.averageWin.toFixed(2)}
   Average Loss: $${metrics.averageLoss.toFixed(2)}
   Max Drawdown: $${metrics.maxDrawdown.toFixed(2)}
   Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}
=====================================`;
    }

    // Trading metrics methods
    getArbitrageTradeCount(): number {
        return this.trades.filter(t => t.symbol.includes('ARBITRAGE')).length;
    }

    getProfitableArbitrageCount(): number {
        return this.trades.filter(t => t.symbol.includes('ARBITRAGE') && t.isProfitable).length;
    }

    getTradingMetrics(): {
        volumeEligible: boolean;
        arbitrageMilestones: number[];
        currentVolume: number;
    } {
        const volumeEligible = this.metrics.totalVolume >= 1500;
        const arbitrageCount = this.getProfitableArbitrageCount();
        
        const milestones = [5, 10, 25, 50, 100];
        const achievedMilestones = milestones.filter(m => arbitrageCount >= m);

        return {
            volumeEligible,
            arbitrageMilestones: achievedMilestones,
            currentVolume: this.metrics.totalVolume
        };
    }

    reset(): void {
        this.metrics = {
            totalTrades: 0,
            profitableTrades: 0,
            totalVolume: 0,
            totalProfit: 0,
            winRate: 0,
            averageWin: 0,
            averageLoss: 0,
            maxDrawdown: 0,
            sharpeRatio: 0,
            startTime: Date.now(),
            lastUpdate: Date.now()
        };
        this.trades = [];
        this.dailyPnL.clear();
        this.peakBalance = 0;
        this.logger.info('🔄 Performance metrics reset');
    }
}
