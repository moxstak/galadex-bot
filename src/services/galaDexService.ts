import { GSwap, PrivateKeySigner, GalaChainTokenClassKey, FEE_TIER } from '@gala-chain/gswap-sdk';
import { Config } from '../config';
import { Logger } from '../utils/logger';

export interface GalaToken {
    symbol: string;
    classKey: string;
    decimals: number;
    name: string;
}

export interface GalaPriceData {
    token: string;
    price: number;
    timestamp: number;
    source: 'galadex';
    feeTier: FEE_TIER;
}

export interface GalaArbitrageOpportunity {
    tokenIn: GalaToken;
    tokenOut: GalaToken;
    buyPrice: number;
    sellPrice: number;
    profit: number;
    profitPercentage: number;
    volume: number;
    feeTier: FEE_TIER;
    timestamp: number;
}

export interface GalaSwapResult {
    transactionHash: string;
    amountIn: string;
    amountOut: string;
    priceImpact: number;
    fee: number;
    timestamp: number;
}

export class GalaDexService {
    private logger = new Logger('GalaDexService');
    public gswap: GSwap;
    private supportedTokens: GalaToken[] = [];
    private priceData: Map<string, GalaPriceData[]> = new Map();

    constructor() {
        // Initialize GSwap SDK with signer for trading
        this.gswap = new GSwap({
            signer: new PrivateKeySigner(Config.PRIVATE_KEY),
            walletAddress: Config.WALLET_ADDRESS,
            gatewayBaseUrl: 'https://gateway-mainnet.galachain.com',
            dexContractBasePath: '/api/asset/dexv3-contract',
            tokenContractBasePath: '/api/asset/token-contract',
            bundlerBaseUrl: 'https://bundle-backend-prod1.defi.gala.com',
            bundlingAPIBasePath: '/bundle',
            dexBackendBaseUrl: 'https://dex-backend-prod1.defi.gala.com',
            transactionWaitTimeoutMs: 300000, // 5 minutes
        });
    }

    async initialize(): Promise<void> {
        this.logger.info('🔧 Initializing GalaDex service...');
        await this.loadSupportedTokens();
        this.logger.info(`📊 Loaded ${this.supportedTokens.length} supported tokens`);
    }

    private async loadSupportedTokens(): Promise<void> {
        try {
            // Start with known working tokens
            this.supportedTokens = [
                {
                    symbol: 'GALA',
                    classKey: 'GALA|Unit|none|none',
                    decimals: 8,
                    name: 'Gala'
                },
                {
                    symbol: 'GUSDC',
                    classKey: 'GUSDC|Unit|none|none',
                    decimals: 6,
                    name: 'Gala USD Coin'
                }
            ];

            // Try to discover more tokens by testing common pairs
            await this.discoverAvailableTokens();
            
            this.logger.info(`📊 Discovered ${this.supportedTokens.length} available tokens`);
        } catch (error) {
            this.logger.error('Failed to load supported tokens:', error);
            throw error;
        }
    }

    private async discoverAvailableTokens(): Promise<void> {
        const potentialTokens = [
            { symbol: 'GUSDT', classKey: 'GUSDT|Unit|none|none', decimals: 6, name: 'Gala Tether USD' },
            { symbol: 'GETH', classKey: 'GETH|Unit|none|none', decimals: 18, name: 'Gala Ethereum' },
            { symbol: 'GWBTC', classKey: 'GWBTC|Unit|none|none', decimals: 8, name: 'Gala Wrapped Bitcoin' },
            { symbol: 'GBNB', classKey: 'GBNB|Unit|none|none', decimals: 18, name: 'Gala BNB' },
            { symbol: 'GADA', classKey: 'GADA|Unit|none|none', decimals: 6, name: 'Gala Cardano' },
            { symbol: 'GSOL', classKey: 'GSOL|Unit|none|none', decimals: 9, name: 'Gala Solana' },
            { symbol: 'GAVAX', classKey: 'GAVAX|Unit|none|none', decimals: 18, name: 'Gala Avalanche' },
            { symbol: 'GMATIC', classKey: 'GMATIC|Unit|none|none', decimals: 18, name: 'Gala Polygon' },
            { symbol: 'GDOT', classKey: 'GDOT|Unit|none|none', decimals: 10, name: 'Gala Polkadot' },
            { symbol: 'GLINK', classKey: 'GLINK|Unit|none|none', decimals: 18, name: 'Gala Chainlink' }
        ];

        for (const token of potentialTokens) {
            try {
                // Test if token can be quoted against GUSDC (most liquid pair)
                await this.gswap.quoting.quoteExactInput(
                    token.classKey as any,
                    'GUSDC|Unit|none|none',
                    '1',
                    500
                );
                
                // If successful, add to supported tokens
                this.supportedTokens.push(token);
                this.logger.info(`✅ Discovered token: ${token.symbol}`);
            } catch (error) {
                // Token not available or pool doesn't exist
                this.logger.debug(`❌ Token not available: ${token.symbol}`);
            }
        }
    }

    async fetchPrices(): Promise<GalaPriceData[]> {
        try {
            const prices: GalaPriceData[] = [];
            
            for (const token of this.supportedTokens) {
                try {
                    // Skip GUSDC as it's our base currency
                    if (token.symbol === 'GUSDC') {
                        const priceData: GalaPriceData = {
                            token: token.symbol,
                            price: 1.0, // GUSDC is always $1
                            timestamp: Date.now(),
                            source: 'galadex',
                            feeTier: 500
                        };
                        prices.push(priceData);
                        continue;
                    }

                    // Get quote for 1 unit of token to GUSDC to determine price
                    const quote = await this.gswap.quoting.quoteExactInput(
                        token.classKey as any,
                        'GUSDC|Unit|none|none',
                        '1',
                        500 // 0.5% fee tier
                    );

                    const price = parseFloat((quote as any).amountOut || '0') / Math.pow(10, 6); // GUSDC has 6 decimals
                    
                    if (price > 0) {
                        const priceData: GalaPriceData = {
                            token: token.symbol,
                            price: price,
                            timestamp: Date.now(),
                            source: 'galadex',
                            feeTier: 500
                        };
                        
                        prices.push(priceData);
                        
                        // Store price data
                        if (!this.priceData.has(token.symbol)) {
                            this.priceData.set(token.symbol, []);
                        }
                        this.priceData.get(token.symbol)!.push(priceData);
                        
                        // Keep only last 100 price points
                        const tokenPrices = this.priceData.get(token.symbol)!;
                        if (tokenPrices.length > 100) {
                            tokenPrices.splice(0, tokenPrices.length - 100);
                        }
                    }
                    
                } catch (error) {
                    this.logger.debug(`Failed to fetch price for ${token.symbol}:`, (error as any).message);
                }
            }
            
            this.logger.info(`📈 Fetched prices for ${prices.length} tokens`);
            return prices;
        } catch (error) {
            this.logger.error('Failed to fetch prices:', error);
            throw error;
        }
    }

    async findArbitrageOpportunities(): Promise<GalaArbitrageOpportunity[]> {
        try {
            const opportunities: GalaArbitrageOpportunity[] = [];
            const prices = await this.fetchPrices();
            
            // Look for arbitrage opportunities between different fee tiers
            for (let i = 0; i < this.supportedTokens.length; i++) {
                for (let j = i + 1; j < this.supportedTokens.length; j++) {
                    const tokenA = this.supportedTokens[i];
                    const tokenB = this.supportedTokens[j];
                    
                    try {
                        // Check both directions of the pair
                        const opportunitiesAB = await this.checkArbitragePair(tokenA, tokenB);
                        const opportunitiesBA = await this.checkArbitragePair(tokenB, tokenA);
                        
                        opportunities.push(...opportunitiesAB, ...opportunitiesBA);
                    } catch (error) {
                        this.logger.warn(`Failed to check arbitrage for ${tokenA.symbol}/${tokenB.symbol}:`, error);
                    }
                }
            }
            
            if (opportunities.length > 0) {
                this.logger.info(`💰 Found ${opportunities.length} arbitrage opportunities`);
            }
            
            return opportunities;
        } catch (error) {
            this.logger.error('Failed to find arbitrage opportunities:', error);
            throw error;
        }
    }

    private async checkArbitragePair(tokenA: GalaToken, tokenB: GalaToken): Promise<GalaArbitrageOpportunity[]> {
        const opportunities: GalaArbitrageOpportunity[] = [];
        const feeTiers: FEE_TIER[] = [500, 3000, 10000]; // Different fee tiers
        
        try {
            // Get quotes for different fee tiers
            const quotes = new Map<FEE_TIER, number>();
            
            for (const feeTier of feeTiers) {
                try {
                    const quote = await this.gswap.quoting.quoteExactInput(
                        tokenA.classKey,
                        tokenB.classKey,
                        '1',
                        feeTier
                    );
                    
                    const price = parseFloat((quote as any).amountOut || '0') / Math.pow(10, tokenB.decimals);
                    quotes.set(feeTier, price);
                } catch (error) {
                    // Pool might not exist for this fee tier
                    continue;
                }
            }
            
            if (quotes.size < 2) return opportunities;
            
            // Find price differences between fee tiers
            const quoteEntries = Array.from(quotes.entries());
            for (let i = 0; i < quoteEntries.length; i++) {
                for (let j = i + 1; j < quoteEntries.length; j++) {
                    const [feeTier1, price1] = quoteEntries[i];
                    const [feeTier2, price2] = quoteEntries[j];
                    
                    const priceDiff = Math.abs(price1 - price2);
                    const avgPrice = (price1 + price2) / 2;
                    const profitPercentage = (priceDiff / avgPrice) * 100;
                    
                    if (profitPercentage >= Config.MIN_PROFIT_THRESHOLD) {
                        const buyPrice = Math.min(price1, price2);
                        const sellPrice = Math.max(price1, price2);
                        const profit = sellPrice - buyPrice;
                        
                        opportunities.push({
                            tokenIn: tokenA,
                            tokenOut: tokenB,
                            buyPrice,
                            sellPrice,
                            profit,
                            profitPercentage,
                            volume: Config.MAX_POSITION_SIZE,
                            feeTier: price1 < price2 ? feeTier1 : feeTier2,
                            timestamp: Date.now()
                        });
                    }
                }
            }
            
        } catch (error) {
            this.logger.warn(`Error checking arbitrage for ${tokenA.symbol}/${tokenB.symbol}:`, error);
        }
        
        return opportunities;
    }

    async executeSwap(opportunity: GalaArbitrageOpportunity): Promise<GalaSwapResult | null> {
        if (Config.DRY_RUN) {
            this.logger.info(`🧪 DRY RUN: Would execute swap ${opportunity.tokenIn.symbol} -> ${opportunity.tokenOut.symbol}`);
            return this.createMockSwapResult(opportunity);
        }

        if (!Config.ENABLE_TRADING) {
            this.logger.info(`🚫 Trading disabled: Skipping swap ${opportunity.tokenIn.symbol} -> ${opportunity.tokenOut.symbol}`);
            return null;
        }

        try {
            this.logger.info(`📝 Executing swap: ${opportunity.tokenIn.symbol} -> ${opportunity.tokenOut.symbol}...`);
            
            // Calculate swap amount based on opportunity volume
            const amountIn = (opportunity.volume / opportunity.buyPrice).toString();
            
            // Calculate minimum amount out with slippage protection
            const amountOutMinimum = (opportunity.volume * (1 - Config.MAX_SLIPPAGE)).toString();
            
            // Execute the swap
            const swapResult = await this.gswap.swaps.swap(
                opportunity.tokenIn.classKey,
                opportunity.tokenOut.classKey,
                opportunity.feeTier,
                {
                    exactIn: amountIn,
                    amountOutMinimum: amountOutMinimum,
                },
                Config.WALLET_ADDRESS
            );
            
            // Wait for transaction completion
            const completed = await swapResult.wait();
            
            const result: GalaSwapResult = {
                transactionHash: completed.transactionHash,
                amountIn: amountIn,
                amountOut: amountOutMinimum,
                priceImpact: 0, // Calculate based on actual vs expected
                fee: opportunity.feeTier / 10000, // Convert to percentage
                timestamp: Date.now()
            };
            
            this.logger.info(`✅ Swap executed: ${result.transactionHash}`);
            return result;
            
        } catch (error) {
            this.logger.error(`Failed to execute swap ${opportunity.tokenIn.symbol} -> ${opportunity.tokenOut.symbol}:`, error);
            throw error;
        }
    }

    private createMockSwapResult(opportunity: GalaArbitrageOpportunity): GalaSwapResult {
        return {
            transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
            amountIn: (opportunity.volume / opportunity.buyPrice).toString(),
            amountOut: (opportunity.volume * (1 - Config.MAX_SLIPPAGE)).toString(),
            priceImpact: 0.1,
            fee: opportunity.feeTier / 10000,
            timestamp: Date.now()
        };
    }

    async getTokenBalance(token: GalaToken): Promise<number> {
        try {
            const assets = await this.gswap.assets.getUserAssets(Config.WALLET_ADDRESS);
            const tokenData = (assets as any).tokens?.find((t: any) => t.symbol === token.symbol);
            return tokenData ? parseFloat(tokenData.quantity) : 0;
        } catch (error) {
            this.logger.error(`Failed to get balance for ${token.symbol}:`, error);
            return 0;
        }
    }

    async getAllBalances(): Promise<Map<string, number>> {
        const balances = new Map<string, number>();
        
        try {
            const assets = await this.gswap.assets.getUserAssets(Config.WALLET_ADDRESS);
            
            // Map all available tokens
            if ((assets as any).tokens) {
                for (const tokenData of (assets as any).tokens) {
                    balances.set(tokenData.symbol, parseFloat(tokenData.quantity));
                }
            }
            
            // Ensure all supported tokens are in the map (even if 0)
            for (const token of this.supportedTokens) {
                if (!balances.has(token.symbol)) {
                    balances.set(token.symbol, 0);
                }
            }
        } catch (error) {
            this.logger.error('Failed to get balances:', error);
        }
        
        return balances;
    }

    getSupportedTokens(): GalaToken[] {
        return [...this.supportedTokens];
    }

    getPriceHistory(token: string): GalaPriceData[] {
        return this.priceData.get(token) || [];
    }

    async refreshTokenList(): Promise<void> {
        this.logger.info('🔄 Refreshing token list...');
        await this.loadSupportedTokens();
        this.logger.info(`📊 Updated token list: ${this.supportedTokens.length} tokens available`);
    }

    getAvailableTradingPairs(): string[] {
        const pairs: string[] = [];
        for (let i = 0; i < this.supportedTokens.length; i++) {
            for (let j = i + 1; j < this.supportedTokens.length; j++) {
                pairs.push(`${this.supportedTokens[i].symbol}/${this.supportedTokens[j].symbol}`);
            }
        }
        return pairs;
    }

    async getTokenLiquidity(token: string): Promise<number> {
        try {
            const tokenObj = this.supportedTokens.find(t => t.symbol === token);
            if (!tokenObj) return 0;

            // Get quote for a larger amount to test liquidity
            const quote = await this.gswap.quoting.quoteExactInput(
                tokenObj.classKey as any,
                'GUSDC|Unit|none|none',
                '1000', // Test with 1000 units
                500
            );

            const amountOut = parseFloat((quote as any).amountOut || '0') / Math.pow(10, 6);
            return amountOut;
        } catch (error) {
            this.logger.debug(`Failed to get liquidity for ${token}:`, (error as any).message);
            return 0;
        }
    }
}
