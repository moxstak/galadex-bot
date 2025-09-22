export class Config {
    static readonly PRIVATE_KEY = process.env.PRIVATE_KEY || '';
    static readonly WALLET_ADDRESS = process.env.WALLET_ADDRESS || '';
    static readonly MIN_PROFIT_THRESHOLD = parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.01');
    static readonly MAX_POSITION_SIZE = parseFloat(process.env.MAX_POSITION_SIZE || '1000');
    static readonly DRY_RUN = process.env.DRY_RUN?.toLowerCase() === 'true';
    static readonly SCAN_INTERVAL_MS = parseInt(process.env.SCAN_INTERVAL_MS || '30000');
    static readonly LOG_LEVEL = process.env.LOG_LEVEL || 'info';
    static readonly MAX_SLIPPAGE = parseFloat(process.env.MAX_SLIPPAGE || '0.05');
    static readonly ENABLE_TRADING = process.env.ENABLE_TRADING?.toLowerCase() === 'true';
    static readonly DAILY_LOSS_LIMIT = parseFloat(process.env.DAILY_LOSS_LIMIT || '50');
    static readonly MAX_DRAWDOWN_LIMIT = parseFloat(process.env.MAX_DRAWDOWN_LIMIT || '100');
    static readonly RISK_FREE_RATE = parseFloat(process.env.RISK_FREE_RATE || '0.02');

    static validate(): void {
        if (!this.WALLET_ADDRESS) throw new Error('WALLET_ADDRESS is required');
        if (!this.PRIVATE_KEY) throw new Error('PRIVATE_KEY is required');
    }
}