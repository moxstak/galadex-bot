import { GalaDexService, GalaToken } from './galaDexService';
import { Config } from '../config';
import { Logger } from '../utils/logger';

export interface BalanceInfo {
    token: string;
    balance: number;
    usdValue: number;
    lastUpdated: number;
}

export class BalanceMonitor {
    private logger = new Logger('BalanceMonitor');
    private galaDexService: GalaDexService;
    private balances: Map<string, BalanceInfo> = new Map();
    private updateInterval?: NodeJS.Timeout;

    constructor(galaDexService: GalaDexService) {
        this.galaDexService = galaDexService;
    }

    startMonitoring(): void {
        this.logger.info('💰 Starting balance monitoring...');
        
        // Update balances every 30 seconds
        this.updateInterval = setInterval(async () => {
            await this.updateBalances();
        }, 30000);
        
        // Initial update
        this.updateBalances();
    }

    stopMonitoring(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.logger.info('💰 Balance monitoring stopped');
    }

    private async updateBalances(): Promise<void> {
        try {
            const balances = await this.galaDexService.getAllBalances();
            const prices = await this.galaDexService.fetchPrices();
            
            // Create price map for USD conversion
            const priceMap = new Map<string, number>();
            for (const price of prices) {
                priceMap.set(price.token, price.price);
            }
            
            // Update balance info
            for (const [token, balance] of balances) {
                const price = priceMap.get(token) || 0;
                const usdValue = balance * price;
                
                this.balances.set(token, {
                    token,
                    balance,
                    usdValue,
                    lastUpdated: Date.now()
                });
            }
            
            this.logBalances();
        } catch (error) {
            this.logger.error('Failed to update balances:', error);
        }
    }

    private logBalances(): void {
        const totalValue = Array.from(this.balances.values())
            .reduce((sum, balance) => sum + balance.usdValue, 0);
        
        this.logger.info('💰 === BALANCE UPDATE ===');
        this.logger.info(`💵 Total Portfolio Value: $${totalValue.toFixed(2)}`);
        
        for (const balance of this.balances.values()) {
            if (balance.balance > 0) {
                this.logger.info(`${balance.token}: ${balance.balance.toFixed(6)} ($${balance.usdValue.toFixed(2)})`);
            }
        }
        this.logger.info('========================');
    }

    getBalances(): BalanceInfo[] {
        return Array.from(this.balances.values());
    }

    getBalance(token: string): BalanceInfo | undefined {
        return this.balances.get(token);
    }

    getTotalValue(): number {
        return Array.from(this.balances.values())
            .reduce((sum, balance) => sum + balance.usdValue, 0);
    }

    async checkSufficientBalance(token: string, requiredAmount: number): Promise<boolean> {
        const balance = this.balances.get(token);
        if (!balance) {
            this.logger.warn(`No balance data for token ${token}`);
            return false;
        }
        
        const hasEnough = balance.balance >= requiredAmount;
        if (!hasEnough) {
            this.logger.warn(`Insufficient balance: ${token} - Required: ${requiredAmount}, Available: ${balance.balance}`);
        }
        
        return hasEnough;
    }
}
