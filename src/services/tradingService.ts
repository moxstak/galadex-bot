import { Config } from '../config';
import { Logger } from '../utils/logger';
import { GalaDexService, GalaToken, GalaPriceData, GalaArbitrageOpportunity, GalaSwapResult } from './galaDexService';

export interface TokenInfo {
    symbol: string;
    address: string;
    decimals: number;
    name: string;
}

export interface PriceData {
    token: string;
    price: number;
    timestamp: number;
    source: string;
}

export interface ArbitrageOpportunity {
    token: string;
    buyExchange: string;
    sellExchange: string;
    buyPrice: number;
    sellPrice: number;
    profit: number;
    profitPercentage: number;
    volume: number;
    timestamp: number;
}

export interface Order {
    id: string;
    token: string;
    side: 'buy' | 'sell';
    amount: number;
    price: number;
    status: 'pending' | 'filled' | 'cancelled' | 'failed';
    timestamp: number;
    txHash?: string;
}

export class TradingService {
    private logger = new Logger('TradingService');
    private galaDexService: GalaDexService;
    private supportedTokens: TokenInfo[] = [];
    private priceData: Map<string, PriceData[]> = new Map();
    private orders: Order[] = [];

    constructor() {
        this.galaDexService = new GalaDexService();
    }

    async initialize(): Promise<void> {
        this.logger.info('🔧 Initializing trading service...');
        await this.galaDexService.initialize();
        await this.loadSupportedTokens();
        this.logger.info(`📊 Loaded ${this.supportedTokens.length} supported tokens`);
    }

    private async loadSupportedTokens(): Promise<void> {
        try {
            const galaTokens = this.galaDexService.getSupportedTokens();
            this.supportedTokens = galaTokens.map(token => ({
                symbol: token.symbol,
                address: token.classKey as string,
                decimals: token.decimals,
                name: token.name
            }));
        } catch (error) {
            this.logger.error('Failed to load supported tokens:', error);
            throw error;
        }
    }

    async fetchPrices(): Promise<PriceData[]> {
        try {
            const galaPrices = await this.galaDexService.fetchPrices();
            const prices: PriceData[] = galaPrices.map(price => ({
                token: price.token,
                price: price.price,
                timestamp: price.timestamp,
                source: price.source
            }));
            
            // Store price data
            for (const price of prices) {
                if (!this.priceData.has(price.token)) {
                    this.priceData.set(price.token, []);
                }
                this.priceData.get(price.token)!.push(price);
                
                // Keep only last 100 price points
                const tokenPrices = this.priceData.get(price.token)!;
                if (tokenPrices.length > 100) {
                    tokenPrices.splice(0, tokenPrices.length - 100);
                }
            }
            
            this.logger.info(`📈 Fetched prices for ${prices.length} tokens`);
            return prices;
        } catch (error) {
            this.logger.error('Failed to fetch prices:', error);
            throw error;
        }
    }

    async findArbitrageOpportunities(): Promise<ArbitrageOpportunity[]> {
        try {
            const galaOpportunities = await this.galaDexService.findArbitrageOpportunities();
            const opportunities: ArbitrageOpportunity[] = galaOpportunities.map(opp => ({
                token: `${opp.tokenIn.symbol}/${opp.tokenOut.symbol}`,
                buyExchange: 'galadex',
                sellExchange: 'galadex',
                buyPrice: opp.buyPrice,
                sellPrice: opp.sellPrice,
                profit: opp.profit,
                profitPercentage: opp.profitPercentage,
                volume: opp.volume,
                timestamp: opp.timestamp
            }));
            
            if (opportunities.length > 0) {
                this.logger.info(`💰 Found ${opportunities.length} arbitrage opportunities`);
            }
            
            return opportunities;
        } catch (error) {
            this.logger.error('Failed to find arbitrage opportunities:', error);
            throw error;
        }
    }

    async executeOrder(opportunity: ArbitrageOpportunity): Promise<Order | null> {
        if (Config.DRY_RUN) {
            this.logger.info(`🧪 DRY RUN: Would execute order for ${opportunity.token}`);
            return this.createMockOrder(opportunity);
        }

        if (!Config.ENABLE_TRADING) {
            this.logger.info(`🚫 Trading disabled: Skipping order for ${opportunity.token}`);
            return null;
        }

        try {
            this.logger.info(`📝 Executing order for ${opportunity.token}...`);
            
            // Convert to GalaDex opportunity format
            const galaOpportunity = await this.convertToGalaOpportunity(opportunity);
            if (!galaOpportunity) {
                this.logger.warn(`Could not convert opportunity ${opportunity.token} to GalaDex format`);
                return null;
            }
            
            // Execute the swap
            const swapResult = await this.galaDexService.executeSwap(galaOpportunity);
            if (!swapResult) {
                this.logger.warn(`Swap execution failed for ${opportunity.token}`);
                return null;
            }
            
            // Create order record
            const order: Order = {
                id: swapResult.transactionHash,
                token: opportunity.token,
                side: 'buy',
                amount: parseFloat(swapResult.amountIn),
                price: opportunity.buyPrice,
                status: 'filled',
                timestamp: swapResult.timestamp,
                txHash: swapResult.transactionHash
            };
            
            this.orders.push(order);
            this.logger.info(`✅ Order executed: ${order.id}`);
            return order;
        } catch (error) {
            this.logger.error('Failed to execute order:', error);
            throw error;
        }
    }

    private async convertToGalaOpportunity(opportunity: ArbitrageOpportunity): Promise<GalaArbitrageOpportunity | null> {
        try {
            const tokens = this.galaDexService.getSupportedTokens();
            const [tokenInSymbol, tokenOutSymbol] = opportunity.token.split('/');
            
            const tokenIn = tokens.find(t => t.symbol === tokenInSymbol);
            const tokenOut = tokens.find(t => t.symbol === tokenOutSymbol);
            
            if (!tokenIn || !tokenOut) {
                return null;
            }
            
            return {
                tokenIn,
                tokenOut,
                buyPrice: opportunity.buyPrice,
                sellPrice: opportunity.sellPrice,
                profit: opportunity.profit,
                profitPercentage: opportunity.profitPercentage,
                volume: opportunity.volume,
                feeTier: 500, // Default fee tier
                timestamp: opportunity.timestamp
            };
        } catch (error) {
            this.logger.error('Failed to convert opportunity:', error);
            return null;
        }
    }

    private async createMockOrder(opportunity: ArbitrageOpportunity): Promise<Order> {
        const order: Order = {
            id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            token: opportunity.token,
            side: 'buy',
            amount: opportunity.volume,
            price: opportunity.buyPrice,
            status: 'filled',
            timestamp: Date.now(),
            txHash: `0x${Math.random().toString(16).substr(2, 64)}`
        };
        
        return order;
    }

    getOrders(): Order[] {
        return [...this.orders];
    }

    getOrderById(id: string): Order | undefined {
        return this.orders.find(order => order.id === id);
    }

    getPriceHistory(token: string): PriceData[] {
        return this.priceData.get(token) || [];
    }

    getSupportedTokens(): TokenInfo[] {
        return [...this.supportedTokens];
    }
}
