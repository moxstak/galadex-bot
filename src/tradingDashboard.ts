import { Logger } from './utils/logger';
import { EnhancedTradingService } from './services/enhancedTradingService';
import { GalaDexService } from './services/galaDexService';

export class TradingDashboard {
    private logger = new Logger('TradingDashboard');
    private tradingService: EnhancedTradingService;
    private galaDexService: GalaDexService;

    constructor(tradingService: EnhancedTradingService, galaDexService: GalaDexService) {
        this.tradingService = tradingService;
        this.galaDexService = galaDexService;
    }

    async displayTradingStatus(): Promise<void> {
        console.log('\n📊 === GALA DEX TRADING BOT STATUS ===');
        
        // Display current profile
        this.displayCurrentProfile();
        
        // Check balance
        await this.displayBalanceStatus();
        
        // Display performance metrics
        this.displayPerformanceMetrics();
        
        // Display volume metrics
        this.displayVolumeMetrics();
        
        // Display strategy status
        this.displayStrategyStatus();
        
        console.log('==========================================\n');
    }

    private displayCurrentProfile(): void {
        const currentProfile = this.tradingService.getCurrentProfile();
        console.log(`🎯 Current Profile: ${currentProfile.name}`);
        console.log(`📝 Description: ${currentProfile.description}`);
        console.log('');
    }

    private async displayBalanceStatus(): Promise<void> {
        try {
            const galaBalance = await this.galaDexService.getTokenBalance({
                symbol: 'GALA',
                classKey: 'GALA|Unit|none|none',
                decimals: 8,
                name: 'Gala'
            });
            
            console.log(`💰 Wallet Status: ${galaBalance > 0 ? '✅ CONNECTED' : '❌ NO BALANCE'}`);
            console.log(`   GALA Balance: ${galaBalance.toFixed(6)} GALA`);
            console.log(`   Status: ${galaBalance > 0 ? 'Ready for trading' : 'Need GALA tokens'}\n`);
        } catch (error) {
            console.log(`💰 Wallet Status: ❌ CONNECTION FAILED - ${error}\n`);
        }
    }

    private displayTradingMetrics(): void {
        const performance = this.tradingService.getTradingStatus();
        
        console.log('📈 TRADING METRICS:');
        console.log(`   Total Volume: $${performance.volumeMetrics.totalVolume.toFixed(2)}`);
        console.log(`   Daily Volume: $${performance.volumeMetrics.dailyVolume.toFixed(2)}`);
        console.log(`   Arbitrage Trades: ${performance.performance.arbitrageMilestones.length > 0 ? performance.performance.arbitrageMilestones[performance.performance.arbitrageMilestones.length - 1] : 0} completed`);
        console.log('');
    }

    private displayPerformanceMetrics(): void {
        const performanceSummary = this.tradingService.getPerformanceSummary();
        console.log(performanceSummary);
    }

    private displayVolumeMetrics(): void {
        const volumeSummary = this.tradingService.getVolumeSummary();
        console.log(volumeSummary);
    }

    private displayStrategyStatus(): void {
        const currentProfile = this.tradingService.getCurrentProfile();
        const weights = currentProfile.strategyWeights;
        const enabled = currentProfile.enabledStrategies;
        
        console.log('🤖 ACTIVE STRATEGIES:');
        console.log(`   ${enabled.arbitrage ? '✅' : '❌'} Arbitrage Detection (${(weights.arbitrage * 100).toFixed(1)}% weight)`);
        console.log(`   ${enabled.momentum ? '✅' : '❌'} Momentum Analysis (${(weights.momentum * 100).toFixed(1)}% weight)`);
        console.log(`   ${enabled.volume ? '✅' : '❌'} Volume Analysis (${(weights.volume * 100).toFixed(1)}% weight)`);
        console.log(`   ${enabled.trend ? '✅' : '❌'} Trend Analysis (${(weights.trend * 100).toFixed(1)}% weight)`);
        console.log(`   ${enabled.bollingerBands ? '✅' : '❌'} Bollinger Bands (${(weights.bollingerBands * 100).toFixed(1)}% weight)`);
        console.log(`   ${enabled.fibonacci ? '✅' : '❌'} Fibonacci Strategy (${(weights.fibonacci * 100).toFixed(1)}% weight)`);
        console.log(`   ${enabled.dca ? '✅' : '❌'} DCA Strategy (${(weights.dca * 100).toFixed(1)}% weight)`);
        console.log('');
    }

    async startMonitoring(): Promise<void> {
        this.logger.info('📊 Starting trading monitoring...');
        
        // Display profile summary
        this.displayProfileSummary();
        
        // Display initial status
        await this.displayTradingStatus();
        
        // Monitor every 5 minutes
        setInterval(async () => {
            await this.displayTradingStatus();
        }, 5 * 60 * 1000);
    }

    private displayProfileSummary(): void {
        const currentProfile = this.tradingService.getCurrentProfile();
        console.log('\n🎯 === TRADING PROFILE SUMMARY ===');
        console.log(`Profile: ${currentProfile.name}`);
        console.log(`Description: ${currentProfile.description}`);
        console.log(`Risk Level: ${this.getRiskLevel(currentProfile)}`);
        console.log(`Max Position: ${currentProfile.riskSettings.maxPositionSize}`);
        console.log(`Min Confidence: ${(currentProfile.riskSettings.minConfidenceThreshold * 100).toFixed(1)}%`);
        console.log(`Scan Interval: ${currentProfile.tradingSettings.scanIntervalMs / 1000}s`);
        console.log(`Dry Run: ${currentProfile.tradingSettings.enableDryRun ? 'Enabled' : 'Disabled'}`);
        console.log('=====================================\n');
    }

    private getRiskLevel(profile: any): string {
        const totalRisk = profile.riskSettings.maxPositionSize + 
                         profile.riskSettings.maxDailyLoss + 
                         profile.riskSettings.maxDrawdown;
        
        if (totalRisk < 200) return '🟢 Conservative';
        if (totalRisk < 500) return '🟡 Balanced';
        return '🔴 Aggressive';
    }
}
