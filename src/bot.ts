import { Config } from './config';
import { Logger } from './utils/logger';
import { TradingService, ArbitrageOpportunity } from './services/tradingService';
import { RiskManager } from './services/riskManager';
import { GalaDexService } from './services/galaDexService';
import { BalanceMonitor } from './services/balanceMonitor';
import { EnhancedTradingService } from './services/enhancedTradingService';

export class Bot {
    private logger = new Logger('Bot');
    private running = false;
    private scanInterval?: NodeJS.Timeout;
    private tradingService: TradingService;
    private enhancedTradingService: EnhancedTradingService;
    private riskManager: RiskManager;
    private galaDexService: GalaDexService;
    private balanceMonitor: BalanceMonitor;
    private totalProfit = 0;
    private totalTrades = 0;
    private successfulTrades = 0;

    constructor() {
        this.galaDexService = new GalaDexService();
        this.tradingService = new TradingService();
        this.enhancedTradingService = new EnhancedTradingService(this.galaDexService);
        this.riskManager = new RiskManager();
        this.balanceMonitor = new BalanceMonitor(this.galaDexService);
    }

    async initialize(): Promise<void> {
        this.logger.info('🔧 Initializing bot components...');
        this.logger.info(`🧪 Dry Run Mode: ${Config.DRY_RUN}`);
        this.logger.info(`💰 Min Profit Threshold: ${Config.MIN_PROFIT_THRESHOLD}%`);
        this.logger.info(`💵 Max Position Size: ${Config.MAX_POSITION_SIZE}`);
        this.logger.info(`📊 Max Slippage: ${Config.MAX_SLIPPAGE * 100}%`);
        this.logger.info(`🚦 Trading Enabled: ${Config.ENABLE_TRADING}`);
        
        await this.galaDexService.initialize();
        await this.tradingService.initialize();
        this.balanceMonitor.startMonitoring();
        
        this.logger.info('✅ Bot initialization complete');
    }

    async startEnhancedTrading(): Promise<void> {
        this.logger.info('🚀 Starting enhanced trading service...');
        await this.enhancedTradingService.startTrading();
    }

    stopEnhancedTrading(): void {
        this.logger.info('🛑 Stopping enhanced trading service...');
        this.enhancedTradingService.stopTrading();
    }

    async start(): Promise<void> {
        this.logger.info('🚀 Starting bot loop...');
        this.running = true;

        this.scanInterval = setInterval(async () => {
            if (this.running) {
                await this.scanAndTrade();
            }
        }, Config.SCAN_INTERVAL_MS);

        // Initial scan
        await this.scanAndTrade();
    }

    private async scanAndTrade(): Promise<void> {
        try {
            this.logger.info('🔍 Scanning for arbitrage opportunities...');
            
            // Check if we should stop trading due to risk limits
            if (this.riskManager.shouldStopTrading()) {
                this.logger.warn('🛑 Trading stopped due to risk limits');
                return;
            }

            // Find arbitrage opportunities
            const opportunities = await this.tradingService.findArbitrageOpportunities();
            
            if (opportunities.length === 0) {
                this.logger.info('📊 No arbitrage opportunities found');
                return;
            }

            // Process each opportunity
            for (const opportunity of opportunities) {
                await this.processOpportunity(opportunity);
            }

            // Log current metrics
            this.logMetrics();
            
        } catch (error) {
            this.logger.error('Error during scan and trade:', error);
        }
    }

    private async processOpportunity(opportunity: ArbitrageOpportunity): Promise<void> {
        try {
            this.logger.info(`🎯 Processing opportunity: ${opportunity.token} - ${opportunity.profitPercentage.toFixed(2)}% profit`);
            
            // Validate opportunity with risk management
            const isValid = await this.riskManager.validateOpportunity(opportunity);
            if (!isValid) {
                this.logger.info(`❌ Opportunity rejected by risk manager: ${opportunity.token}`);
                return;
            }

            // Calculate optimal position size
            const positionSize = this.riskManager.calculatePositionSize(opportunity);
            opportunity.volume = Math.min(opportunity.volume, positionSize);

            this.logger.info(`📊 Position size: ${opportunity.volume.toFixed(2)} (${((opportunity.volume / Config.MAX_POSITION_SIZE) * 100).toFixed(1)}% of max)`);

            // Execute the trade
            const order = await this.tradingService.executeOrder(opportunity);
            if (order) {
                this.totalTrades++;
                if (order.status === 'filled') {
                    this.successfulTrades++;
                    this.totalProfit += opportunity.profit;
                    this.riskManager.updateMetrics(order, opportunity.profit);
                    
                    this.logger.info(`✅ Trade executed: ${order.id} - Profit: ${opportunity.profit.toFixed(2)}`);
                } else {
                    this.logger.warn(`⚠️ Trade failed: ${order.id} - Status: ${order.status}`);
                }
            }

        } catch (error) {
            this.logger.error(`Error processing opportunity ${opportunity.token}:`, error);
        }
    }

    private logMetrics(): void {
        const riskMetrics = this.riskManager.getRiskMetrics();
        const winRate = this.totalTrades > 0 ? (this.successfulTrades / this.totalTrades) * 100 : 0;
        
        this.logger.info('📈 === Trading Metrics ===');
        this.logger.info(`💰 Total Profit: ${this.totalProfit.toFixed(2)}`);
        this.logger.info(`📊 Total Trades: ${this.totalTrades}`);
        this.logger.info(`✅ Successful Trades: ${this.successfulTrades}`);
        this.logger.info(`🎯 Win Rate: ${winRate.toFixed(2)}%`);
        this.logger.info(`📉 Daily P&L: ${riskMetrics.dailyPnL.toFixed(2)}`);
        this.logger.info(`📊 Total Exposure: ${riskMetrics.totalExposure.toFixed(2)}`);
        this.logger.info(`📉 Max Drawdown: ${riskMetrics.maxDrawdown.toFixed(2)}`);
        this.logger.info('========================');
    }

    async stop(): Promise<void> {
        this.logger.info('⏹️ Stopping bot...');
        this.running = false;
        if (this.scanInterval) clearInterval(this.scanInterval);
        
        this.balanceMonitor.stopMonitoring();
        
        // Log final metrics
        this.logMetrics();
        this.logger.info('🛑 Bot stopped');
    }

    // Public methods for external monitoring
    getTradingStats() {
        return {
            totalProfit: this.totalProfit,
            totalTrades: this.totalTrades,
            successfulTrades: this.successfulTrades,
            winRate: this.totalTrades > 0 ? (this.successfulTrades / this.totalTrades) * 100 : 0,
            riskMetrics: this.riskManager.getRiskMetrics(),
            orders: this.tradingService.getOrders()
        };
    }

    getSupportedTokens() {
        return this.tradingService.getSupportedTokens();
    }

    getPriceHistory(token: string) {
        return this.tradingService.getPriceHistory(token);
    }

    getBalances() {
        return this.balanceMonitor.getBalances();
    }

    getTotalPortfolioValue() {
        return this.balanceMonitor.getTotalValue();
    }

    getEnhancedTradingStats() {
        return this.enhancedTradingService.getTradingStats();
    }

    getActiveTrades() {
        return this.enhancedTradingService.getActiveTrades();
    }

    getTradeHistory() {
        return this.enhancedTradingService.getTradeHistory();
    }

    isEnhancedTradingActive(): boolean {
        return this.enhancedTradingService.isTradingActive();
    }

    async checkBalance(token: string, amount: number) {
        return await this.balanceMonitor.checkSufficientBalance(token, amount);
    }

    async refreshTokens() {
        await this.galaDexService.refreshTokenList();
    }

    getAvailableTradingPairs() {
        return this.galaDexService.getAvailableTradingPairs();
    }

    async getTokenLiquidity(token: string) {
        return await this.galaDexService.getTokenLiquidity(token);
    }

    async testTransaction(): Promise<void> {
        this.logger.info('🧪 Starting transaction test...');
        
        try {
            // Check GALA balance first
            const galaBalance = await this.galaDexService.getTokenBalance({
                symbol: 'GALA',
                classKey: 'GALA|Unit|none|none',
                decimals: 8,
                name: 'Gala'
            });
            
            this.logger.info(`💰 Current GALA balance: ${galaBalance}`);
            
            if (galaBalance < 100) {
                this.logger.warn(`⚠️ Insufficient GALA balance. Need 100, have ${galaBalance}`);
                return;
            }

            // Get quote
            const quote = await this.galaDexService.gswap.quoting.quoteExactInput(
                'GALA|Unit|none|none',
                'GUSDC|Unit|none|none',
                '100',
                500
            );

            const expectedGusdc = parseFloat((quote as any).amountOut || '0') / Math.pow(10, 6);
            this.logger.info(`📊 Quote: 100 GALA → ${expectedGusdc.toFixed(6)} GUSDC`);

            if (Config.DRY_RUN) {
                this.logger.info('🧪 DRY RUN: Would execute 100 GALA → GUSDC swap');
                this.logger.info(`   Expected output: ${expectedGusdc.toFixed(6)} GUSDC`);
                return;
            }

            // Execute real transaction
            this.logger.info('🚀 Executing real transaction...');
            const swapResult = await this.galaDexService.gswap.swaps.swap(
                'GALA|Unit|none|none',
                'GUSDC|Unit|none|none',
                500,
                {
                    exactIn: '100',
                    amountOutMinimum: (expectedGusdc * 0.99).toFixed(6),
                },
                Config.WALLET_ADDRESS
            );

            this.logger.info(`📝 Transaction submitted: ${swapResult.transactionId}`);
            
            const completed = await swapResult.wait();
            this.logger.info(`✅ Transaction confirmed: ${completed.transactionHash}`);
            
        } catch (error) {
            this.logger.error('❌ Transaction test failed:', error);
            throw error;
        }
    }

    getEnhancedTradingService(): any {
        return this.enhancedTradingService;
    }

    getGalaDexService(): any {
        return this.galaDexService;
    }
}