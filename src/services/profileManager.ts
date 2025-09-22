import { Logger } from '../utils/logger';
import { TradingProfile, DEFAULT_PROFILES, createCustomProfile, validateStrategyWeights } from '../config/tradingProfiles';
import * as fs from 'fs';
import * as path from 'path';

export class ProfileManager {
    private logger = new Logger('ProfileManager');
    private profiles: Map<string, TradingProfile> = new Map();
    private currentProfileId: string = 'balanced';
    private profilesFilePath: string;

    constructor() {
        this.profilesFilePath = path.join(process.cwd(), 'profiles.json');
        this.loadProfiles();
    }

    private loadProfiles(): void {
        // Load default profiles
        DEFAULT_PROFILES.forEach(profile => {
            this.profiles.set(profile.id, profile);
        });

        // Try to load custom profiles from file
        try {
            if (fs.existsSync(this.profilesFilePath)) {
                const customProfiles = JSON.parse(fs.readFileSync(this.profilesFilePath, 'utf8'));
                customProfiles.forEach((profile: TradingProfile) => {
                    this.profiles.set(profile.id, profile);
                });
                this.logger.info(`📁 Loaded ${customProfiles.length} custom profiles`);
            }
        } catch (error) {
            this.logger.warn('Failed to load custom profiles:', error);
        }
    }

    private saveProfiles(): void {
        try {
            const customProfiles = Array.from(this.profiles.values())
                .filter(profile => !DEFAULT_PROFILES.some(defaultProfile => defaultProfile.id === profile.id));
            
            fs.writeFileSync(this.profilesFilePath, JSON.stringify(customProfiles, null, 2));
            this.logger.info(`💾 Saved ${customProfiles.length} custom profiles`);
        } catch (error) {
            this.logger.error('Failed to save custom profiles:', error);
        }
    }

    getAllProfiles(): TradingProfile[] {
        return Array.from(this.profiles.values());
    }

    getProfile(id: string): TradingProfile | undefined {
        return this.profiles.get(id);
    }

    getCurrentProfile(): TradingProfile {
        const profile = this.profiles.get(this.currentProfileId);
        if (!profile) {
            this.logger.warn(`Profile ${this.currentProfileId} not found, falling back to balanced`);
            return this.profiles.get('balanced')!;
        }
        return profile;
    }

    setCurrentProfile(id: string): boolean {
        if (!this.profiles.has(id)) {
            this.logger.error(`Profile ${id} not found`);
            return false;
        }
        
        this.currentProfileId = id;
        this.logger.info(`🔄 Switched to profile: ${this.profiles.get(id)!.name}`);
        return true;
    }

    createProfile(profile: TradingProfile): boolean {
        if (this.profiles.has(profile.id)) {
            this.logger.error(`Profile ${profile.id} already exists`);
            return false;
        }

        if (!validateStrategyWeights(profile.strategyWeights)) {
            this.logger.error('Invalid strategy weights: must sum to 1.0');
            return false;
        }

        this.profiles.set(profile.id, profile);
        this.saveProfiles();
        this.logger.info(`✅ Created profile: ${profile.name}`);
        return true;
    }

    updateProfile(id: string, updates: Partial<TradingProfile>): boolean {
        const profile = this.profiles.get(id);
        if (!profile) {
            this.logger.error(`Profile ${id} not found`);
            return false;
        }

        const updatedProfile = { ...profile, ...updates };
        
        if (updatedProfile.strategyWeights && !validateStrategyWeights(updatedProfile.strategyWeights)) {
            this.logger.error('Invalid strategy weights: must sum to 1.0');
            return false;
        }

        this.profiles.set(id, updatedProfile);
        this.saveProfiles();
        this.logger.info(`✅ Updated profile: ${updatedProfile.name}`);
        return true;
    }

    deleteProfile(id: string): boolean {
        if (DEFAULT_PROFILES.some(p => p.id === id)) {
            this.logger.error('Cannot delete default profiles');
            return false;
        }

        if (!this.profiles.has(id)) {
            this.logger.error(`Profile ${id} not found`);
            return false;
        }

        this.profiles.delete(id);
        this.saveProfiles();
        
        // If we deleted the current profile, switch to balanced
        if (this.currentProfileId === id) {
            this.currentProfileId = 'balanced';
            this.logger.info('🔄 Switched to balanced profile');
        }
        
        this.logger.info(`🗑️ Deleted profile: ${id}`);
        return true;
    }

    duplicateProfile(id: string, newId: string, newName: string): boolean {
        const originalProfile = this.profiles.get(id);
        if (!originalProfile) {
            this.logger.error(`Profile ${id} not found`);
            return false;
        }

        if (this.profiles.has(newId)) {
            this.logger.error(`Profile ${newId} already exists`);
            return false;
        }

        const duplicatedProfile: TradingProfile = {
            ...originalProfile,
            id: newId,
            name: newName,
            description: `${originalProfile.description} (Copy)`
        };

        this.profiles.set(newId, duplicatedProfile);
        this.saveProfiles();
        this.logger.info(`📋 Duplicated profile: ${originalProfile.name} -> ${newName}`);
        return true;
    }

    getProfileSummary(): string {
        const currentProfile = this.getCurrentProfile();
        const allProfiles = this.getAllProfiles();
        
        let summary = `\n📊 === TRADING PROFILES ===\n`;
        summary += `🎯 Current Profile: ${currentProfile.name}\n`;
        summary += `📝 Description: ${currentProfile.description}\n\n`;
        
        summary += `⚖️ Strategy Weights:\n`;
        summary += `   Arbitrage: ${(currentProfile.strategyWeights.arbitrage * 100).toFixed(1)}%\n`;
        summary += `   Momentum: ${(currentProfile.strategyWeights.momentum * 100).toFixed(1)}%\n`;
        summary += `   Volume: ${(currentProfile.strategyWeights.volume * 100).toFixed(1)}%\n`;
        summary += `   Trend: ${(currentProfile.strategyWeights.trend * 100).toFixed(1)}%\n`;
        summary += `   Bollinger Bands: ${(currentProfile.strategyWeights.bollingerBands * 100).toFixed(1)}%\n`;
        summary += `   Fibonacci: ${(currentProfile.strategyWeights.fibonacci * 100).toFixed(1)}%\n`;
        summary += `   DCA: ${(currentProfile.strategyWeights.dca * 100).toFixed(1)}%\n\n`;
        
        summary += `🛡️ Risk Settings:\n`;
        summary += `   Max Position: ${currentProfile.riskSettings.maxPositionSize}\n`;
        summary += `   Min Confidence: ${(currentProfile.riskSettings.minConfidenceThreshold * 100).toFixed(1)}%\n`;
        summary += `   Max Daily Loss: $${currentProfile.riskSettings.maxDailyLoss}\n`;
        summary += `   Max Drawdown: $${currentProfile.riskSettings.maxDrawdown}\n`;
        summary += `   Cooldown: ${currentProfile.riskSettings.tradeCooldownMinutes}min\n\n`;
        
        summary += `⚙️ Trading Settings:\n`;
        summary += `   Scan Interval: ${currentProfile.tradingSettings.scanIntervalMs / 1000}s\n`;
        summary += `   Min Profit: ${(currentProfile.tradingSettings.minProfitThreshold * 100).toFixed(2)}%\n`;
        summary += `   Max Slippage: ${(currentProfile.tradingSettings.maxSlippage * 100).toFixed(1)}%\n`;
        summary += `   Dry Run: ${currentProfile.tradingSettings.enableDryRun ? 'Yes' : 'No'}\n\n`;
        
        summary += `📋 Available Profiles (${allProfiles.length}):\n`;
        allProfiles.forEach(profile => {
            const isCurrent = profile.id === this.currentProfileId;
            summary += `   ${isCurrent ? '🎯' : '  '} ${profile.name} (${profile.id})\n`;
        });
        
        summary += `=====================================\n`;
        
        return summary;
    }

    listProfiles(): void {
        console.log(this.getProfileSummary());
    }
}
