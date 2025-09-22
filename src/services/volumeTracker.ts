import { Logger } from '../utils/logger';

export interface VolumeMetrics {
    totalVolume: number;
    dailyVolume: number;
    hourlyVolume: number;
    volumeByToken: Map<string, number>;
    volumeHistory: Array<{ timestamp: number; volume: number }>;
    peakVolume: number;
    averageVolume: number;
}

export class VolumeTracker {
    private logger = new Logger('VolumeTracker');
    private metrics: VolumeMetrics;
    private readonly historySize = 1000; // Keep last 1000 volume records

    constructor() {
        this.metrics = {
            totalVolume: 0,
            dailyVolume: 0,
            hourlyVolume: 0,
            volumeByToken: new Map(),
            volumeHistory: [],
            peakVolume: 0,
            averageVolume: 0
        };
    }

    recordTrade(symbol: string, amount: number, price: number): void {
        const volume = amount * price;
        const now = Date.now();
        
        // Update total volume
        this.metrics.totalVolume += volume;
        
        // Update daily volume (last 24 hours)
        this.updateDailyVolume(now);
        
        // Update hourly volume (last hour)
        this.updateHourlyVolume(now);
        
        // Update volume by token
        const currentTokenVolume = this.metrics.volumeByToken.get(symbol) || 0;
        this.metrics.volumeByToken.set(symbol, currentTokenVolume + volume);
        
        // Add to volume history
        this.metrics.volumeHistory.push({ timestamp: now, volume });
        
        // Keep only recent history
        if (this.metrics.volumeHistory.length > this.historySize) {
            this.metrics.volumeHistory.shift();
        }
        
        // Update peak volume
        this.metrics.peakVolume = Math.max(this.metrics.peakVolume, volume);
        
        // Update average volume
        this.updateAverageVolume();
        
        this.logger.debug(`📊 Volume recorded: ${symbol} - $${volume.toFixed(2)} (Total: $${this.metrics.totalVolume.toFixed(2)})`);
    }

    private updateDailyVolume(now: number): void {
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        const dailyVolume = this.metrics.volumeHistory
            .filter(record => record.timestamp >= oneDayAgo)
            .reduce((sum, record) => sum + record.volume, 0);
        
        this.metrics.dailyVolume = dailyVolume;
    }

    private updateHourlyVolume(now: number): void {
        const oneHourAgo = now - (60 * 60 * 1000);
        const hourlyVolume = this.metrics.volumeHistory
            .filter(record => record.timestamp >= oneHourAgo)
            .reduce((sum, record) => sum + record.volume, 0);
        
        this.metrics.hourlyVolume = hourlyVolume;
    }

    private updateAverageVolume(): void {
        if (this.metrics.volumeHistory.length > 0) {
            const totalVolume = this.metrics.volumeHistory.reduce((sum, record) => sum + record.volume, 0);
            this.metrics.averageVolume = totalVolume / this.metrics.volumeHistory.length;
        }
    }

    getMetrics(): VolumeMetrics {
        return { ...this.metrics };
    }

    getTopTokensByVolume(count: number = 5): Array<{ symbol: string; volume: number }> {
        return Array.from(this.metrics.volumeByToken.entries())
            .map(([symbol, volume]) => ({ symbol, volume }))
            .sort((a, b) => b.volume - a.volume)
            .slice(0, count);
    }

    getVolumeTrend(): 'increasing' | 'decreasing' | 'stable' {
        if (this.metrics.volumeHistory.length < 10) {
            return 'stable';
        }

        const recent = this.metrics.volumeHistory.slice(-10);
        const older = this.metrics.volumeHistory.slice(-20, -10);
        
        if (older.length === 0) {
            return 'stable';
        }

        const recentAvg = recent.reduce((sum, r) => sum + r.volume, 0) / recent.length;
        const olderAvg = older.reduce((sum, r) => sum + r.volume, 0) / older.length;
        
        const change = (recentAvg - olderAvg) / olderAvg;
        
        if (change > 0.1) return 'increasing';
        if (change < -0.1) return 'decreasing';
        return 'stable';
    }

    getVolumeSummary(): string {
        const metrics = this.getMetrics();
        const topTokens = this.getTopTokensByVolume(3);
        const trend = this.getVolumeTrend();
        
        return `
📊 === VOLUME SUMMARY ===
💰 Total Volume: $${metrics.totalVolume.toFixed(2)}
📅 Daily Volume: $${metrics.dailyVolume.toFixed(2)}
⏰ Hourly Volume: $${metrics.hourlyVolume.toFixed(2)}
📈 Average Trade: $${metrics.averageVolume.toFixed(2)}
🏆 Peak Trade: $${metrics.peakVolume.toFixed(2)}
📊 Trend: ${trend}
🥇 Top Tokens:
${topTokens.map((t, i) => `   ${i + 1}. ${t.symbol}: $${t.volume.toFixed(2)}`).join('\n')}
=====================================`;
    }

    // Contest-specific methods
    getContestVolumeStatus(): {
        eligible: boolean;
        currentVolume: number;
        targetVolume: number;
        progress: number;
    } {
        const targetVolume = 1500; // $1,500 minimum for contest eligibility
        const progress = Math.min(100, (this.metrics.totalVolume / targetVolume) * 100);
        
        return {
            eligible: this.metrics.totalVolume >= targetVolume,
            currentVolume: this.metrics.totalVolume,
            targetVolume,
            progress
        };
    }

    reset(): void {
        this.metrics = {
            totalVolume: 0,
            dailyVolume: 0,
            hourlyVolume: 0,
            volumeByToken: new Map(),
            volumeHistory: [],
            peakVolume: 0,
            averageVolume: 0
        };
        this.logger.info('🔄 Volume metrics reset');
    }
}
