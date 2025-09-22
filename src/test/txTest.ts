import { GSwap, PrivateKeySigner } from '@gala-chain/gswap-sdk';
import { Config } from '../config';
import { Logger } from '../utils/logger';

export class TransactionTest {
    private logger = new Logger('TransactionTest');
    private gswap: GSwap;

    constructor() {
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
        this.logger.info('🔌 Connecting to GalaDex socket...');
        await GSwap.events.connectEventSocket();
        this.logger.info('✅ Socket connected');
    }

    async testGalaToUsdcSwap(): Promise<void> {
        try {
            this.logger.info('🧪 Starting GALA to GUSDC swap test...');
            
            // First, check if we have enough GALA balance
            const galaBalance = await this.getTokenBalance('GALA|Unit|none|none');
            this.logger.info(`💰 Current GALA balance: ${galaBalance}`);
            
            if (galaBalance < 100) {
                this.logger.warn(`⚠️ Insufficient GALA balance. Need 100, have ${galaBalance}`);
                return;
            }

            // Get a quote for 100 GALA to GUSDC
            this.logger.info('📊 Getting quote for 100 GALA to GUSDC...');
            const quote = await this.gswap.quoting.quoteExactInput(
                'GALA|Unit|none|none',
                'GUSDC|Unit|none|none',
                '100',
                500 // 0.5% fee tier
            );

            const expectedGusdc = parseFloat((quote as any).amountOut || '0') / Math.pow(10, 6);
            this.logger.info(`📈 Expected GUSDC output: ${expectedGusdc.toFixed(6)}`);
            this.logger.info(`🔍 Raw quote amountOut: ${(quote as any).amountOut}`);
            this.logger.info(`🔍 Raw quote outTokenAmount: ${(quote as any).outTokenAmount}`);

            // Use outTokenAmount if amountOut is 0
            const actualExpectedGusdc = expectedGusdc > 0 ? expectedGusdc : parseFloat((quote as any).outTokenAmount || '0');
            this.logger.info(`📈 Actual expected GUSDC: ${actualExpectedGusdc.toFixed(6)}`);

            // Calculate minimum amount out with 1% slippage tolerance
            const minAmountOut = (actualExpectedGusdc * 0.99).toFixed(6);
            this.logger.info(`📉 Minimum GUSDC (1% slippage): ${minAmountOut}`);

            // Execute the swap
            this.logger.info('🚀 Executing swap transaction...');
            const swapResult = await this.gswap.swaps.swap(
                'GALA|Unit|none|none',
                'GUSDC|Unit|none|none',
                500, // 0.5% fee tier
                {
                    exactIn: '100',
                    amountOutMinimum: minAmountOut,
                },
                Config.WALLET_ADDRESS
            );

            this.logger.info(`📝 Transaction submitted: ${swapResult.transactionId}`);
            this.logger.info('⏳ Waiting for transaction confirmation...');

            // Wait for transaction completion
            const completed = await swapResult.wait();
            
            this.logger.info('✅ Transaction confirmed!');
            this.logger.info(`🔗 Transaction Hash: ${completed.transactionHash}`);
            this.logger.info(`📊 Transaction ID: ${completed.txId}`);
            this.logger.info(`📊 Data: ${JSON.stringify(completed.Data)}`);

            // Check final balances
            const finalGalaBalance = await this.getTokenBalance('GALA|Unit|none|none');
            const finalGusdcBalance = await this.getTokenBalance('GUSDC|Unit|none|none');
            
            this.logger.info('💰 Final Balances:');
            this.logger.info(`   GALA: ${finalGalaBalance}`);
            this.logger.info(`   GUSDC: ${finalGusdcBalance}`);

            const galaSpent = galaBalance - finalGalaBalance;
            const gusdcReceived = finalGusdcBalance - (await this.getInitialGusdcBalance());
            
            this.logger.info('📈 Trade Summary:');
            this.logger.info(`   GALA Spent: ${galaSpent}`);
            this.logger.info(`   GUSDC Received: ${gusdcReceived.toFixed(6)}`);
            this.logger.info(`   Effective Rate: ${(gusdcReceived / galaSpent).toFixed(6)} GUSDC per GALA`);

        } catch (error) {
            this.logger.error('❌ Transaction test failed:', error);
            throw error;
        }
    }

    async testDryRun(): Promise<void> {
        try {
            this.logger.info('🧪 Testing dry run mode (no actual transaction)...');
            
            // Get quote without executing
            const quote = await this.gswap.quoting.quoteExactInput(
                'GALA|Unit|none|none',
                'GUSDC|Unit|none|none',
                '100',
                500
            );

            const expectedGusdc = parseFloat((quote as any).amountOut || '0') / Math.pow(10, 6);
            this.logger.info(`📊 Dry run quote: 100 GALA → ${expectedGusdc.toFixed(6)} GUSDC`);
            this.logger.info('✅ Dry run test completed successfully');

        } catch (error) {
            this.logger.error('❌ Dry run test failed:', error);
            throw error;
        }
    }

    private async getTokenBalance(tokenClassKey: string): Promise<number> {
        try {
            const assets = await this.gswap.assets.getUserAssets(Config.WALLET_ADDRESS);
            
            // Map token class key to symbol
            const symbolMap: { [key: string]: string } = {
                'GALA|Unit|none|none': 'GALA',
                'GUSDC|Unit|none|none': 'GUSDC',
                'GUSDT|Unit|none|none': 'GUSDT',
                'GETH|Unit|none|none': 'GETH',
                'GWBTC|Unit|none|none': 'GWBTC'
            };
            
            const symbol = symbolMap[tokenClassKey];
            if (!symbol) return 0;
            
            const tokenData = (assets as any).tokens?.find((t: any) => t.symbol === symbol);
            return tokenData ? parseFloat(tokenData.quantity) : 0;
        } catch (error) {
            this.logger.error(`Failed to get balance for ${tokenClassKey}:`, error);
            return 0;
        }
    }

    private async getInitialGusdcBalance(): Promise<number> {
        return await this.getTokenBalance('GUSDC|Unit|none|none');
    }

    async runFullTest(): Promise<void> {
        this.logger.info('🚀 Starting full transaction test suite...');
        
        try {
            // Initialize socket connection
            await this.initialize();
            
            // Test 1: Dry run
            await this.testDryRun();
            
            // Test 2: Real transaction (only if not in dry run mode)
            if (!Config.DRY_RUN) {
                await this.testGalaToUsdcSwap();
            } else {
                this.logger.info('🧪 Skipping real transaction test (DRY_RUN=true)');
            }
            
            this.logger.info('✅ All tests completed successfully!');
            
        } catch (error) {
            this.logger.error('❌ Test suite failed:', error);
            throw error;
        }
    }
}
