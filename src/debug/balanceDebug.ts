import dotenv from 'dotenv';
import path from 'path';
import { GSwap, PrivateKeySigner } from '@gala-chain/gswap-sdk';
import { Logger } from '../utils/logger';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const logger = new Logger('BalanceDebug');

async function debugBalance(): Promise<void> {
    try {
        logger.info('🔍 Debugging wallet balance...');
        logger.info(`🔑 Wallet: ${process.env.WALLET_ADDRESS}`);
        
        const gswap = new GSwap({
            signer: new PrivateKeySigner(process.env.PRIVATE_KEY!),
            walletAddress: process.env.WALLET_ADDRESS!,
            gatewayBaseUrl: 'https://gateway-mainnet.galachain.com',
            dexContractBasePath: '/api/asset/dexv3-contract',
            tokenContractBasePath: '/api/asset/token-contract',
            bundlerBaseUrl: 'https://bundle-backend-prod1.defi.gala.com',
            bundlingAPIBasePath: '/bundle',
            dexBackendBaseUrl: 'https://dex-backend-prod1.defi.gala.com',
            transactionWaitTimeoutMs: 300000,
        });

        logger.info('📊 Fetching user assets...');
        const assets = await gswap.assets.getUserAssets(process.env.WALLET_ADDRESS!);
        
        logger.info('📋 Raw assets response:');
        logger.info(JSON.stringify(assets, null, 2));
        
        // Check for GALA specifically
        const galaAsset = (assets as any).assets?.find((asset: any) => 
            asset.classKey === 'GALA|Unit|none|none' || 
            asset.classKey?.includes('GALA') ||
            asset.symbol === 'GALA'
        );
        
        if (galaAsset) {
            logger.info('✅ Found GALA asset:');
            logger.info(JSON.stringify(galaAsset, null, 2));
            logger.info(`💰 GALA Balance: ${galaAsset.balance}`);
        } else {
            logger.warn('❌ GALA asset not found in response');
            logger.info('🔍 Available assets:');
            (assets as any).assets?.forEach((asset: any, index: number) => {
                logger.info(`${index + 1}. ${asset.classKey || asset.symbol || 'Unknown'} - ${asset.balance || 'No balance'}`);
            });
        }

        // Try alternative balance checking
        logger.info('🔍 Trying alternative balance check...');
        try {
            const quote = await gswap.quoting.quoteExactInput(
                'GALA|Unit|none|none',
                'GUSDC|Unit|none|none',
                '1',
                500
            );
            logger.info('✅ GALA quote successful - token exists and is tradeable');
            logger.info(`Quote result: ${JSON.stringify(quote, null, 2)}`);
        } catch (error) {
            logger.error('❌ GALA quote failed:', (error as any).message);
        }

    } catch (error) {
        logger.error('❌ Balance debug failed:', error);
    }
}

if (require.main === module) {
    debugBalance().catch(console.error);
}
