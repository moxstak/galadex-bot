import dotenv from 'dotenv';
import path from 'path';
import { Bot } from './bot';
import { Logger } from './utils/logger';
import { Config } from './config';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const logger = new Logger('EnhancedBot');

async function main(): Promise<void> {
    try {
        logger.info('🚀 Starting GalaDex Enhanced Trading Bot...');
        logger.info(`🔑 Wallet: ${process.env.WALLET_ADDRESS}`);
        logger.info(`🧪 Dry Run Mode: ${process.env.DRY_RUN}`);
        logger.info(`🚦 Trading Enabled: ${process.env.ENABLE_TRADING}`);
        
        Config.validate();

        const bot = new Bot();
        await bot.initialize();

        // Start enhanced trading
        await bot.startEnhancedTrading();

        // Log trading stats every 5 minutes
        const statsInterval = setInterval(() => {
            const stats = bot.getEnhancedTradingStats();
            const activeTrades = bot.getActiveTrades();
            const balances = bot.getBalances();
            const totalValue = bot.getTotalPortfolioValue();

            logger.info('📊 === ENHANCED TRADING DASHBOARD ===');
            logger.info(`⏰ Time: ${new Date().toLocaleString()}`);
            logger.info('📈 Trading Performance:');
            logger.info(`   Total Trades: ${stats.totalTrades}`);
            logger.info(`   Successful: ${stats.successfulTrades}`);
            logger.info(`   Failed: ${stats.failedTrades}`);
            logger.info(`   Win Rate: ${stats.winRate.toFixed(1)}%`);
            logger.info(`   Total Volume: ${stats.totalVolume.toFixed(2)}`);
            logger.info(`   Total Profit: $${stats.totalProfit.toFixed(2)}`);
            logger.info('📊 Active Trades:');
            activeTrades.forEach(trade => {
                logger.info(`   ${trade.action} ${trade.amount} ${trade.token} (${trade.confidence * 100}% confidence)`);
            });
            logger.info('💰 Portfolio:');
            balances.forEach((balanceInfo) => {
                logger.info(`   ${balanceInfo.token}: ${balanceInfo.balance.toFixed(6)}`);
            });
            logger.info(`   Total Value: $${totalValue.toFixed(2)}`);
            logger.info('=====================================');
        }, 300000); // 5 minutes

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            logger.info('🛑 Received shutdown signal...');
            clearInterval(statsInterval);
            bot.stopEnhancedTrading();
            await bot.stop();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            logger.info('🛑 Received termination signal...');
            clearInterval(statsInterval);
            bot.stopEnhancedTrading();
            await bot.stop();
            process.exit(0);
        });

        // Keep the process running
        logger.info('✅ Enhanced trading bot is running. Press Ctrl+C to stop.');
        
    } catch (error) {
        logger.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
