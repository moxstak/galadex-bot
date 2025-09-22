import { ProfileManager } from '../services/profileManager';
import { createCustomProfile, validateStrategyWeights } from '../config/tradingProfiles';
import * as readline from 'readline';

export class ProfileCLI {
    private profileManager: ProfileManager;
    private rl: readline.Interface;

    constructor() {
        this.profileManager = new ProfileManager();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async start(): Promise<void> {
        console.log('\n🎯 === TRADING PROFILE MANAGER ===\n');
        
        while (true) {
            this.displayMenu();
            const choice = await this.prompt('Select option: ');
            
            switch (choice.trim()) {
                case '1':
                    this.listProfiles();
                    break;
                case '2':
                    await this.switchProfile();
                    break;
                case '3':
                    await this.createProfile();
                    break;
                case '4':
                    await this.editProfile();
                    break;
                case '5':
                    await this.duplicateProfile();
                    break;
                case '6':
                    await this.deleteProfile();
                    break;
                case '7':
                    this.showCurrentProfile();
                    break;
                case '8':
                    console.log('👋 Goodbye!');
                    this.rl.close();
                    return;
                default:
                    console.log('❌ Invalid option. Please try again.\n');
            }
        }
    }

    private displayMenu(): void {
        console.log('📋 Available Options:');
        console.log('1. List all profiles');
        console.log('2. Switch profile');
        console.log('3. Create new profile');
        console.log('4. Edit profile');
        console.log('5. Duplicate profile');
        console.log('6. Delete profile');
        console.log('7. Show current profile');
        console.log('8. Exit');
        console.log('');
    }

    private async prompt(question: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(question, resolve);
        });
    }

    private listProfiles(): void {
        this.profileManager.listProfiles();
    }

    private async switchProfile(): Promise<void> {
        const profiles = this.profileManager.getAllProfiles();
        console.log('\n📋 Available Profiles:');
        profiles.forEach((profile, index) => {
            const isCurrent = profile.id === this.profileManager.getCurrentProfile().id;
            console.log(`${index + 1}. ${profile.name} (${profile.id}) ${isCurrent ? '👈 CURRENT' : ''}`);
        });
        
        const choice = await this.prompt('\nEnter profile number: ');
        const index = parseInt(choice) - 1;
        
        if (index >= 0 && index < profiles.length) {
            const success = this.profileManager.setCurrentProfile(profiles[index].id);
            if (success) {
                console.log(`✅ Switched to ${profiles[index].name} profile\n`);
            }
        } else {
            console.log('❌ Invalid profile number\n');
        }
    }

    private async createProfile(): Promise<void> {
        console.log('\n🆕 Create New Profile');
        
        const id = await this.prompt('Profile ID (unique): ');
        const name = await this.prompt('Profile Name: ');
        const description = await this.prompt('Description: ');
        
        console.log('\n⚖️ Strategy Weights (must sum to 1.0):');
        const arbitrage = parseFloat(await this.prompt('Arbitrage (0-1): ')) || 0;
        const momentum = parseFloat(await this.prompt('Momentum (0-1): ')) || 0;
        const volume = parseFloat(await this.prompt('Volume (0-1): ')) || 0;
        const trend = parseFloat(await this.prompt('Trend (0-1): ')) || 0;
        const bollingerBands = parseFloat(await this.prompt('Bollinger Bands (0-1): ')) || 0;
        const fibonacci = parseFloat(await this.prompt('Fibonacci (0-1): ')) || 0;
        const dca = parseFloat(await this.prompt('DCA (0-1): ')) || 0;
        
        const strategyWeights = { arbitrage, momentum, volume, trend, bollingerBands, fibonacci, dca };
        
        if (!validateStrategyWeights(strategyWeights)) {
            console.log('❌ Strategy weights must sum to 1.0\n');
            return;
        }
        
        console.log('\n🛡️ Risk Settings:');
        const maxPositionSize = parseInt(await this.prompt('Max Position Size: ')) || 1000;
        const minConfidenceThreshold = parseFloat(await this.prompt('Min Confidence (0-1): ')) || 0.5;
        const maxDailyLoss = parseInt(await this.prompt('Max Daily Loss ($): ')) || 50;
        const maxDrawdown = parseInt(await this.prompt('Max Drawdown ($): ')) || 100;
        const tradeCooldownMinutes = parseInt(await this.prompt('Trade Cooldown (minutes): ')) || 5;
        
        console.log('\n⚙️ Trading Settings:');
        const scanIntervalMs = parseInt(await this.prompt('Scan Interval (ms): ')) || 30000;
        const minProfitThreshold = parseFloat(await this.prompt('Min Profit Threshold (0-1): ')) || 0.01;
        const maxSlippage = parseFloat(await this.prompt('Max Slippage (0-1): ')) || 0.05;
        const enableDryRun = (await this.prompt('Enable Dry Run (y/n): ')).toLowerCase() === 'y';
        
        console.log('\n🎯 Enabled Strategies:');
        const arbitrageEnabled = (await this.prompt('Enable Arbitrage (y/n): ')).toLowerCase() === 'y';
        const momentumEnabled = (await this.prompt('Enable Momentum (y/n): ')).toLowerCase() === 'y';
        const volumeEnabled = (await this.prompt('Enable Volume (y/n): ')).toLowerCase() === 'y';
        const trendEnabled = (await this.prompt('Enable Trend (y/n): ')).toLowerCase() === 'y';
        const bollingerEnabled = (await this.prompt('Enable Bollinger Bands (y/n): ')).toLowerCase() === 'y';
        const fibonacciEnabled = (await this.prompt('Enable Fibonacci (y/n): ')).toLowerCase() === 'y';
        const dcaEnabled = (await this.prompt('Enable DCA (y/n): ')).toLowerCase() === 'y';
        
        const profile = createCustomProfile(
            id,
            name,
            description,
            strategyWeights,
            {
                maxPositionSize,
                minConfidenceThreshold,
                maxDailyLoss,
                maxDrawdown,
                tradeCooldownMinutes
            },
            {
                scanIntervalMs,
                minProfitThreshold,
                maxSlippage,
                enableDryRun
            },
            {
                arbitrage: arbitrageEnabled,
                momentum: momentumEnabled,
                volume: volumeEnabled,
                trend: trendEnabled,
                bollingerBands: bollingerEnabled,
                fibonacci: fibonacciEnabled,
                dca: dcaEnabled
            }
        );
        
        const success = this.profileManager.createProfile(profile);
        if (success) {
            console.log(`✅ Created profile: ${name}\n`);
        } else {
            console.log('❌ Failed to create profile\n');
        }
    }

    private async editProfile(): Promise<void> {
        const profiles = this.profileManager.getAllProfiles();
        console.log('\n📋 Available Profiles:');
        profiles.forEach((profile, index) => {
            console.log(`${index + 1}. ${profile.name} (${profile.id})`);
        });
        
        const choice = await this.prompt('\nEnter profile number to edit: ');
        const index = parseInt(choice) - 1;
        
        if (index < 0 || index >= profiles.length) {
            console.log('❌ Invalid profile number\n');
            return;
        }
        
        const profile = profiles[index];
        console.log(`\n✏️ Editing Profile: ${profile.name}`);
        
        const newName = await this.prompt(`Name [${profile.name}]: `) || profile.name;
        const newDescription = await this.prompt(`Description [${profile.description}]: `) || profile.description;
        
        console.log('\n⚖️ Strategy Weights (press Enter to keep current):');
        const arbitrage = parseFloat(await this.prompt(`Arbitrage [${profile.strategyWeights.arbitrage}]: `)) || profile.strategyWeights.arbitrage;
        const momentum = parseFloat(await this.prompt(`Momentum [${profile.strategyWeights.momentum}]: `)) || profile.strategyWeights.momentum;
        const volume = parseFloat(await this.prompt(`Volume [${profile.strategyWeights.volume}]: `)) || profile.strategyWeights.volume;
        const trend = parseFloat(await this.prompt(`Trend [${profile.strategyWeights.trend}]: `)) || profile.strategyWeights.trend;
        const bollingerBands = parseFloat(await this.prompt(`Bollinger Bands [${profile.strategyWeights.bollingerBands}]: `)) || profile.strategyWeights.bollingerBands;
        const fibonacci = parseFloat(await this.prompt(`Fibonacci [${profile.strategyWeights.fibonacci}]: `)) || profile.strategyWeights.fibonacci;
        const dca = parseFloat(await this.prompt(`DCA [${profile.strategyWeights.dca}]: `)) || profile.strategyWeights.dca;
        
        const strategyWeights = { arbitrage, momentum, volume, trend, bollingerBands, fibonacci, dca };
        
        if (!validateStrategyWeights(strategyWeights)) {
            console.log('❌ Strategy weights must sum to 1.0\n');
            return;
        }
        
        const success = this.profileManager.updateProfile(profile.id, {
            name: newName,
            description: newDescription,
            strategyWeights
        });
        
        if (success) {
            console.log(`✅ Updated profile: ${newName}\n`);
        } else {
            console.log('❌ Failed to update profile\n');
        }
    }

    private async duplicateProfile(): Promise<void> {
        const profiles = this.profileManager.getAllProfiles();
        console.log('\n📋 Available Profiles:');
        profiles.forEach((profile, index) => {
            console.log(`${index + 1}. ${profile.name} (${profile.id})`);
        });
        
        const choice = await this.prompt('\nEnter profile number to duplicate: ');
        const index = parseInt(choice) - 1;
        
        if (index < 0 || index >= profiles.length) {
            console.log('❌ Invalid profile number\n');
            return;
        }
        
        const originalProfile = profiles[index];
        const newId = await this.prompt('New Profile ID: ');
        const newName = await this.prompt('New Profile Name: ');
        
        const success = this.profileManager.duplicateProfile(originalProfile.id, newId, newName);
        if (success) {
            console.log(`✅ Duplicated profile: ${originalProfile.name} -> ${newName}\n`);
        } else {
            console.log('❌ Failed to duplicate profile\n');
        }
    }

    private async deleteProfile(): Promise<void> {
        const profiles = this.profileManager.getAllProfiles();
        console.log('\n📋 Available Profiles:');
        profiles.forEach((profile, index) => {
            console.log(`${index + 1}. ${profile.name} (${profile.id})`);
        });
        
        const choice = await this.prompt('\nEnter profile number to delete: ');
        const index = parseInt(choice) - 1;
        
        if (index < 0 || index >= profiles.length) {
            console.log('❌ Invalid profile number\n');
            return;
        }
        
        const profile = profiles[index];
        const confirm = await this.prompt(`Are you sure you want to delete "${profile.name}"? (y/n): `);
        
        if (confirm.toLowerCase() === 'y') {
            const success = this.profileManager.deleteProfile(profile.id);
            if (success) {
                console.log(`✅ Deleted profile: ${profile.name}\n`);
            } else {
                console.log('❌ Failed to delete profile\n');
            }
        } else {
            console.log('❌ Deletion cancelled\n');
        }
    }

    private showCurrentProfile(): void {
        this.profileManager.listProfiles();
    }
}
