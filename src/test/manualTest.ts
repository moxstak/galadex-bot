import { Bot } from '../bot';
import { Logger } from '../utils/logger';

const logger = new Logger('ManualTest');

export async function testTransaction(): Promise<void> {
    try {
        logger.info('🧪 Starting manual transaction test...');
        
        const bot = new Bot();
        await bot.initialize();
        
        // Test the transaction
        await bot.testTransaction();
        
        logger.info('✅ Manual test completed!');
        
    } catch (error) {
        logger.error('❌ Manual test failed:', error);
        throw error;
    }
}

if (require.main === module) {
    testTransaction().catch(console.error);
}
