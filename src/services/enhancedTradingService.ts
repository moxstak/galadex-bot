import { Logger } from '../utils/logger';
import { GalaDexService } from './galaDexService';
import { TradingStrategy, TradingSignal } from '../strategies/tradingStrategy';
import { Config } from '../config';
import { PerformanceTracker, TradeRecord } from './performanceTracker';
import { VolumeTracker } from './volumeTracker';
import { ProfileManager } from './profileManager';

export interface TradeExecution {
    id: string;
    token: string;
    action: 'BUY' | 'SELL';
    amount: number;
    price: number;
    confidence: number;
    reason: string;
    timestamp: number;
    status: 'PENDING' | 'FILLED' | 'FAILED';
    txHash?: string;
}

export class EnhancedTradingService {
    private logger = new Logger('EnhancedTradingService');
    private galaDexService: GalaDexService;
    private tradingStrategy: TradingStrategy;
    private activeTrades: Map<string, TradeExecution> = new Map();
    private tradeHistory: TradeExecution[] = [];
    private isRunning = false;
    private tradingInterval?: NodeJS.Timeout;
    private performanceTracker: PerformanceTracker;
    private volumeTracker: VolumeTracker;
    private profileManager: ProfileManager;

    constructor(galaDexService: GalaDexService) {
        this.galaDexService = galaDexService;
        this.profileManager = new ProfileManager();
        
        // Initialize trading strategy with current profile
        const currentProfile = this.profileManager.getCurrentProfile();
        this.tradingStrategy = new TradingStrategy(galaDexService, currentProfile);
        
        this.performanceTracker = new PerformanceTracker();
        this.volumeTracker = new VolumeTracker();
    }

    async startTrading(): Promise<void> {
        if (this.isRunning) {
            this.logger.warn('Trading service is already running');
            return;
        }

        this.logger.info('🚀 Starting enhanced trading service...');
        this.isRunning = true;

        // Start the main trading loop
        this.tradingInterval = setInterval(async () => {
            try {
                await this.executeTradingCycle();
            } catch (error) {
                this.logger.error('Trading cycle error:', error);
            }
        }, Config.SCAN_INTERVAL_MS);

        // Initial trading cycle
        await this.executeTradingCycle();
    }

    stopTrading(): void {
        this.logger.info('🛑 Stopping enhanced trading service...');
        this.isRunning = false;
        
        if (this.tradingInterval) {
            clearInterval(this.tradingInterval);
            this.tradingInterval = undefined;
        }
    }

    private async executeTradingCycle(): Promise<void> {
        if (!this.isRunning) return;

        this.logger.info('🔄 Executing trading cycle...');

        try {
            // Analyze market conditions
            const signals = await this.tradingStrategy.analyzeMarket();
            
            if (signals.size === 0) {
                this.logger.info('📊 No trading signals generated');
                return;
            }

            // Process each signal
            for (const [token, signal] of signals) {
                await this.processTradingSignal(token, signal);
            }

            // Update active trades
            await this.updateActiveTrades();

        } catch (error) {
            this.logger.error('Trading cycle failed:', error);
        }
    }

    private async processTradingSignal(token: string, signal: TradingSignal): Promise<void> {
        try {
            // Get current balance for the token
            const tokenInfo = this.galaDexService.getSupportedTokens().find(t => t.symbol === token);
            if (!tokenInfo) {
                this.logger.warn(`Token ${token} not found in supported tokens`);
                return;
            }

            const currentBalance = await this.galaDexService.getTokenBalance(tokenInfo);
            
            // Check if we should execute this trade
            if (!this.tradingStrategy.shouldExecuteTrade(signal, currentBalance)) {
                this.logger.debug(`Skipping trade for ${token}: ${signal.reason}`);
                return;
            }

            // Calculate position size
            const positionSize = this.tradingStrategy.calculatePositionSize(signal, currentBalance);
            
            if (positionSize < 10) { // Minimum trade size
                this.logger.debug(`Position size too small for ${token}: ${positionSize}`);
                return;
            }

            // Execute the trade
            await this.executeTrade(token, signal, positionSize);

        } catch (error) {
            this.logger.error(`Failed to process signal for ${token}:`, error);
        }
    }

    private async executeTrade(token: string, signal: TradingSignal, amount: number): Promise<void> {
        const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const trade: TradeExecution = {
            id: tradeId,
            token,
            action: signal.action as 'BUY' | 'SELL', // Type assertion since we've already filtered out HOLD
            amount,
            price: 0, // Will be filled after execution
            confidence: signal.confidence,
            reason: signal.reason,
            timestamp: Date.now(),
            status: 'PENDING'
        };

        this.activeTrades.set(tradeId, trade);
        this.logger.info(`📝 Executing ${signal.action} order for ${amount} ${token} (Confidence: ${(signal.confidence * 100).toFixed(1)}%)`);

        try {
            if (Config.DRY_RUN) {
                // Simulate trade execution
                trade.status = 'FILLED';
                trade.price = await this.getCurrentPrice(token);
                this.logger.info(`🧪 DRY RUN: ${signal.action} ${amount} ${token} at ${trade.price}`);
            } else if (Config.ENABLE_TRADING) {
                // Execute real trade
                const result = await this.executeRealTrade(token, signal, amount);
                if (result) {
                    trade.status = 'FILLED';
                    trade.price = result.price;
                    trade.txHash = result.txHash;
                    this.logger.info(`✅ Trade executed: ${trade.txHash}`);
                } else {
                    trade.status = 'FAILED';
                    this.logger.warn(`❌ Trade failed for ${token}`);
                }
            } else {
                this.logger.info(`🚫 Trading disabled: Would ${signal.action} ${amount} ${token}`);
                trade.status = 'FAILED';
            }

        } catch (error) {
            this.logger.error(`Trade execution failed for ${token}:`, error);
            trade.status = 'FAILED';
        }

        // Move to history
        this.tradeHistory.push(trade);
        this.activeTrades.delete(tradeId);
    }

    private async executeRealTrade(token: string, signal: TradingSignal, amount: number): Promise<{ price: number; txHash: string } | null> {
        try {
            const tokenInfo = this.galaDexService.getSupportedTokens().find(t => t.symbol === token);
            if (!tokenInfo) return null;

            // Get quote
            const quote = await this.galaDexService.gswap.quoting.quoteExactInput(
                tokenInfo.classKey as any,
                'GUSDC|Unit|none|none',
                amount.toString(),
                500
            );

            const expectedOutput = parseFloat((quote as any).outTokenAmount || '0');
            const minOutput = (expectedOutput * 0.99).toFixed(6);

            // Execute swap
            const swapResult = await this.galaDexService.gswap.swaps.swap(
                tokenInfo.classKey as any,
                'GUSDC|Unit|none|none',
                500,
                {
                    exactIn: amount.toString(),
                    amountOutMinimum: minOutput,
                },
                Config.WALLET_ADDRESS
            );

            // Wait for confirmation
            const completed = await swapResult.wait();

            return {
                price: expectedOutput / amount,
                txHash: completed.transactionHash
            };

        } catch (error) {
            this.logger.error(`Real trade execution failed:`, error);
            return null;
        }
    }

    private async getCurrentPrice(token: string): Promise<number> {
        try {
            const tokenInfo = this.galaDexService.getSupportedTokens().find(t => t.symbol === token);
            if (!tokenInfo) return 0;

            const quote = await this.galaDexService.gswap.quoting.quoteExactInput(
                tokenInfo.classKey as any,
                'GUSDC|Unit|none|none',
                '1',
                500
            );

            return parseFloat((quote as any).outTokenAmount || '0');
        } catch (error) {
            return 0;
        }
    }

    private async updateActiveTrades(): Promise<void> {
        // In a real implementation, you'd check the status of pending trades
        // For now, we'll just log the active trades
        if (this.activeTrades.size > 0) {
            this.logger.info(`📊 Active trades: ${this.activeTrades.size}`);
        }
    }

    // Public methods for monitoring
    getActiveTrades(): TradeExecution[] {
        return Array.from(this.activeTrades.values());
    }

    getTradeHistory(): TradeExecution[] {
        return [...this.tradeHistory];
    }

    getTradingStats(): {
        totalTrades: number;
        successfulTrades: number;
        failedTrades: number;
        winRate: number;
        totalVolume: number;
        totalProfit: number;
    } {
        const trades = this.tradeHistory;
        const successfulTrades = trades.filter(t => t.status === 'FILLED').length;
        const failedTrades = trades.filter(t => t.status === 'FAILED').length;
        const totalVolume = trades.reduce((sum, t) => sum + t.amount, 0);
        
        // Calculate profit (simplified)
        const totalProfit = trades
            .filter(t => t.status === 'FILLED')
            .reduce((sum, t) => {
                // This is a simplified calculation
                // In reality, you'd track buy/sell pairs and calculate actual P&L
                return sum + (t.action === 'BUY' ? -t.amount * t.price : t.amount * t.price);
            }, 0);

        return {
            totalTrades: trades.length,
            successfulTrades,
            failedTrades,
            winRate: trades.length > 0 ? (successfulTrades / trades.length) * 100 : 0,
            totalVolume,
            totalProfit
        };
    }

    isTradingActive(): boolean {
        return this.isRunning;
    }

    private recordTradeForTracking(trade: TradeExecution): void {
        // Record for performance tracking
        const tradeRecord: TradeRecord = {
            id: trade.id,
            symbol: trade.token,
            action: trade.action,
            amount: trade.amount,
            price: trade.price,
            timestamp: trade.timestamp,
            profit: trade.status === 'FILLED' ? this.calculateTradeProfit(trade) : 0,
            isProfitable: trade.status === 'FILLED' && this.calculateTradeProfit(trade) > 0
        };

        this.performanceTracker.recordTrade(tradeRecord);
        this.volumeTracker.recordTrade(trade.token, trade.amount, trade.price);
    }

    private calculateTradeProfit(trade: TradeExecution): number {
        // Simple profit calculation - in real implementation, this would be more complex
        // For now, we'll use a mock calculation based on confidence and amount
        if (trade.action === 'BUY') {
            return trade.amount * trade.price * 0.02; // Assume 2% profit for buys
        } else {
            return trade.amount * trade.price * 0.01; // Assume 1% profit for sells
        }
    }

    getTradingStatus(): any {
        const performance = this.performanceTracker.getTradingMetrics();
        const volume = this.volumeTracker.getContestVolumeStatus();
        
        return {
            performance,
            volume,
            performanceMetrics: this.performanceTracker.getMetrics(),
            volumeMetrics: this.volumeTracker.getMetrics()
        };
    }

    getPerformanceSummary(): string {
        return this.performanceTracker.getPerformanceSummary();
    }

    getVolumeSummary(): string {
        return this.volumeTracker.getVolumeSummary();
    }

    // Profile management methods
    switchProfile(profileId: string): boolean {
        const profile = this.profileManager.getProfile(profileId);
        if (!profile) {
            this.logger.error(`Profile ${profileId} not found`);
            return false;
        }

        this.tradingStrategy.setProfile(profile);
        this.profileManager.setCurrentProfile(profileId);
        this.logger.info(`🔄 Switched to profile: ${profile.name}`);
        return true;
    }

    getCurrentProfile() {
        return this.tradingStrategy.getCurrentProfile();
    }

    getAllProfiles() {
        return this.profileManager.getAllProfiles();
    }

    getProfileManager() {
        return this.profileManager;
    }

    getProfileSummary(): string {
        return this.profileManager.getProfileSummary();
    }
}
