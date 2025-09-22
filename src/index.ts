import dotenv from 'dotenv';
import path from 'path';
import { Bot } from './bot';
import { Logger } from './utils/logger';
import { Config } from './config';
import { Monitor } from './services/monitor';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const logger = new Logger('Main');
let bot: Bot;
let monitor: Monitor;

async function main(): Promise<void> {
    try {
        logger.info('🚀 Starting GalaDex TypeScript Trading Bot...');
        Config.validate();
        
        bot = new Bot();
        monitor = new Monitor(bot);
        
        await bot.initialize();
        monitor.startMonitoring();
        await bot.start();
        
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            logger.info('🛑 Received shutdown signal...');
            await bot.stop();
            monitor.stopMonitoring();
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            logger.info('🛑 Received termination signal...');
            await bot.stop();
            monitor.stopMonitoring();
            process.exit(0);
        });
        
    } catch (error) {
        logger.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}