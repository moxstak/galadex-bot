import { Config } from '../config';
import { Logger } from '../utils/logger';
import { ArbitrageOpportunity, Order } from './tradingService';

export interface RiskMetrics {
    totalExposure: number;
    dailyPnL: number;
    maxDrawdown: number;
    winRate: number;
    totalTrades: number;
    successfulTrades: number;
}

export class RiskManager {
    private logger = new Logger('RiskManager');
    private dailyPnL = 0;
    private totalTrades = 0;
    private successfulTrades = 0;
    private maxDrawdown = 0;
    private currentDrawdown = 0;
    private peakValue = 0;
    private orders: Order[] = [];

    async validateOpportunity(opportunity: ArbitrageOpportunity): Promise<boolean> {
        try {
            // Check minimum profit threshold
            if (opportunity.profitPercentage < Config.MIN_PROFIT_THRESHOLD) {
                this.logger.debug(`❌ Opportunity rejected: Profit ${opportunity.profitPercentage.toFixed(2)}% below threshold ${Config.MIN_PROFIT_THRESHOLD}%`);
                return false;
            }

            // Check maximum position size
            if (opportunity.volume > Config.MAX_POSITION_SIZE) {
                this.logger.warn(`⚠️ Position size ${opportunity.volume} exceeds max ${Config.MAX_POSITION_SIZE}`);
                return false;
            }

            // Check slippage tolerance
            const expectedSlippage = this.calculateExpectedSlippage(opportunity);
            if (expectedSlippage > Config.MAX_SLIPPAGE) {
                this.logger.warn(`⚠️ Expected slippage ${expectedSlippage.toFixed(2)}% exceeds max ${Config.MAX_SLIPPAGE * 100}%`);
                return false;
            }

            // Check daily loss limit (5% of max position size)
            const dailyLossLimit = Config.MAX_POSITION_SIZE * 0.05;
            if (this.dailyPnL < -dailyLossLimit) {
                this.logger.warn(`⚠️ Daily loss limit reached: ${this.dailyPnL.toFixed(2)}`);
                return false;
            }

            // Check maximum drawdown (10% of peak value)
            const maxDrawdownLimit = this.peakValue * 0.1;
            if (this.currentDrawdown > maxDrawdownLimit) {
                this.logger.warn(`⚠️ Maximum drawdown limit reached: ${this.currentDrawdown.toFixed(2)}`);
                return false;
            }

            this.logger.info(`✅ Opportunity validated: ${opportunity.token} - ${opportunity.profitPercentage.toFixed(2)}% profit`);
            return true;
        } catch (error) {
            this.logger.error('Error validating opportunity:', error);
            return false;
        }
    }

    calculatePositionSize(opportunity: ArbitrageOpportunity): number {
        try {
            // Kelly Criterion for position sizing
            const winRate = this.getWinRate();
            const avgWin = this.getAverageWin();
            const avgLoss = this.getAverageLoss();
            
            if (avgLoss === 0) return Config.MAX_POSITION_SIZE * 0.1; // Conservative 10% if no loss data
            
            const kellyFraction = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
            const positionSize = Math.max(0, Math.min(kellyFraction, 0.25)) * Config.MAX_POSITION_SIZE; // Cap at 25%
            
            // Ensure minimum position size
            const minPositionSize = Config.MAX_POSITION_SIZE * 0.01; // 1% minimum
            return Math.max(minPositionSize, positionSize);
        } catch (error) {
            this.logger.error('Error calculating position size:', error);
            return Config.MAX_POSITION_SIZE * 0.1; // Conservative fallback
        }
    }

    private calculateExpectedSlippage(opportunity: ArbitrageOpportunity): number {
        // Mock slippage calculation - replace with actual market depth analysis
        const baseSlippage = 0.001; // 0.1% base slippage
        const volumeImpact = (opportunity.volume / Config.MAX_POSITION_SIZE) * 0.005; // Up to 0.5% based on volume
        return baseSlippage + volumeImpact;
    }

    updateMetrics(order: Order, profit: number): void {
        try {
            this.orders.push(order);
            this.totalTrades++;
            this.dailyPnL += profit;
            
            if (profit > 0) {
                this.successfulTrades++;
            }

            // Update drawdown tracking
            const currentValue = this.peakValue + this.dailyPnL;
            if (currentValue > this.peakValue) {
                this.peakValue = currentValue;
                this.currentDrawdown = 0;
            } else {
                this.currentDrawdown = this.peakValue - currentValue;
                this.maxDrawdown = Math.max(this.maxDrawdown, this.currentDrawdown);
            }

            this.logger.info(`📊 Updated metrics: PnL: ${this.dailyPnL.toFixed(2)}, Trades: ${this.totalTrades}, Win Rate: ${this.getWinRate().toFixed(2)}%`);
        } catch (error) {
            this.logger.error('Error updating metrics:', error);
        }
    }

    getRiskMetrics(): RiskMetrics {
        return {
            totalExposure: this.calculateTotalExposure(),
            dailyPnL: this.dailyPnL,
            maxDrawdown: this.maxDrawdown,
            winRate: this.getWinRate(),
            totalTrades: this.totalTrades,
            successfulTrades: this.successfulTrades
        };
    }

    private calculateTotalExposure(): number {
        const activeOrders = this.orders.filter(order => order.status === 'pending' || order.status === 'filled');
        return activeOrders.reduce((total, order) => total + (order.amount * order.price), 0);
    }

    private getWinRate(): number {
        if (this.totalTrades === 0) return 0;
        return (this.successfulTrades / this.totalTrades) * 100;
    }

    private getAverageWin(): number {
        const winningOrders = this.orders.filter(order => order.status === 'filled');
        if (winningOrders.length === 0) return 0;
        // Mock calculation - replace with actual profit tracking
        return Config.MAX_POSITION_SIZE * 0.02; // 2% average win
    }

    private getAverageLoss(): number {
        const losingOrders = this.orders.filter(order => order.status === 'filled');
        if (losingOrders.length === 0) return 0;
        // Mock calculation - replace with actual loss tracking
        return Config.MAX_POSITION_SIZE * 0.01; // 1% average loss
    }

    resetDailyMetrics(): void {
        this.dailyPnL = 0;
        this.logger.info('🔄 Daily metrics reset');
    }

    shouldStopTrading(): boolean {
        const dailyLossLimit = Config.MAX_POSITION_SIZE * 0.05;
        const maxDrawdownLimit = this.peakValue * 0.1;
        
        return this.dailyPnL < -dailyLossLimit || this.currentDrawdown > maxDrawdownLimit;
    }
}
