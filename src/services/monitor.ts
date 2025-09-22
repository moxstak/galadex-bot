import { Logger } from '../utils/logger';
import { Bot } from '../bot';

export class Monitor {
    private logger = new Logger('Monitor');
    private bot: Bot;
    private statsInterval?: NodeJS.Timeout;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    startMonitoring(): void {
        this.logger.info('📊 Starting monitoring dashboard...');
        
        // Log stats every 5 minutes
        this.statsInterval = setInterval(() => {
            this.logStats();
        }, 5 * 60 * 1000); // 5 minutes
    }

    stopMonitoring(): void {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
        this.logger.info('📊 Monitoring stopped');
    }

    private logStats(): void {
        const stats = this.bot.getTradingStats();
        
        this.logger.info('📊 === MONITORING DASHBOARD ===');
        this.logger.info(`💰 Total Profit: $${stats.totalProfit.toFixed(2)}`);
        this.logger.info(`📈 Total Trades: ${stats.totalTrades}`);
        this.logger.info(`✅ Successful: ${stats.successfulTrades}`);
        this.logger.info(`🎯 Win Rate: ${stats.winRate.toFixed(2)}%`);
        this.logger.info(`📉 Daily P&L: $${stats.riskMetrics.dailyPnL.toFixed(2)}`);
        this.logger.info(`📊 Exposure: $${stats.riskMetrics.totalExposure.toFixed(2)}`);
        this.logger.info(`📉 Max Drawdown: $${stats.riskMetrics.maxDrawdown.toFixed(2)}`);
        this.logger.info(`🔄 Active Orders: ${stats.orders.filter(o => o.status === 'pending').length}`);
        this.logger.info('===============================');
    }

    getDetailedReport(): string {
        const stats = this.bot.getTradingStats();
        const supportedTokens = this.bot.getSupportedTokens();
        
        let report = '\n📊 === DETAILED TRADING REPORT ===\n';
        report += `💰 Total Profit: $${stats.totalProfit.toFixed(2)}\n`;
        report += `📈 Total Trades: ${stats.totalTrades}\n`;
        report += `✅ Successful Trades: ${stats.successfulTrades}\n`;
        report += `❌ Failed Trades: ${stats.totalTrades - stats.successfulTrades}\n`;
        report += `🎯 Win Rate: ${stats.winRate.toFixed(2)}%\n`;
        report += `📉 Daily P&L: $${stats.riskMetrics.dailyPnL.toFixed(2)}\n`;
        report += `📊 Total Exposure: $${stats.riskMetrics.totalExposure.toFixed(2)}\n`;
        report += `📉 Max Drawdown: $${stats.riskMetrics.maxDrawdown.toFixed(2)}\n`;
        report += `\n🪙 Supported Tokens: ${supportedTokens.map(t => t.symbol).join(', ')}\n`;
        
        if (stats.orders.length > 0) {
            report += '\n📋 Recent Orders:\n';
            stats.orders.slice(-5).forEach(order => {
                report += `  ${order.id}: ${order.side.toUpperCase()} ${order.amount} ${order.token} @ $${order.price} (${order.status})\n`;
            });
        }
        
        report += '================================\n';
        return report;
    }
}
