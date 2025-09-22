// GalaDex Trading Bot Dashboard JavaScript
class TradingDashboard {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.updateInterval = null;
        this.currentProfile = null;
        this.profiles = [];
        
        // Chart properties
        this.chart = null;
        this.priceData = [];
        this.tradeSignals = [];
        this.chartType = 'line'; // 'line' or 'candlestick'
        this.timeRange = '1d';
        
        this.init();
    }

    init() {
        this.connectWebSocket();
        this.setupEventListeners();
        this.startPeriodicUpdates();
        this.initializeChart();
        this.loadInitialData();
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.updateStatus('Connected', 'connected');
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
            this.updateStatus('Disconnected', 'disconnected');
            
            // Attempt to reconnect after 5 seconds
            setTimeout(() => {
                this.connectWebSocket();
            }, 5000);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateStatus('Error', 'disconnected');
        };
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'profile_update':
                this.updateProfileDisplay(data.profile);
                break;
            case 'wallet_update':
                this.updateWalletDisplay(data.wallet);
                break;
            case 'performance_update':
                this.updatePerformanceDisplay(data.performance);
                break;
            case 'strategy_update':
                this.updateStrategiesDisplay(data.strategies);
                break;
            case 'activity_log':
                this.addActivityLog(data.message, data.timestamp);
                break;
            case 'trading_signal':
                this.addActivityLog(`Trading Signal: ${data.signal}`, new Date());
                this.addTradeSignal(data);
                break;
            case 'price_update':
                this.updatePriceData(data.price, data.timestamp);
                break;
        }
    }

    setupEventListeners() {
        // Profile modal event listeners
        window.showProfileModal = () => {
            document.getElementById('profileModal').style.display = 'block';
            this.loadProfiles();
        };

        window.hideProfileModal = () => {
            document.getElementById('profileModal').style.display = 'none';
        };

        // Close modal when clicking outside
        window.onclick = (event) => {
            const modal = document.getElementById('profileModal');
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };

        // Chart controls
        document.getElementById('timeRange').addEventListener('change', (e) => {
            this.timeRange = e.target.value;
            this.updateChartTimeRange();
        });

        // Chart type toggle
        window.toggleChartType = () => {
            this.chartType = this.chartType === 'line' ? 'candlestick' : 'line';
            this.updateChartType();
        };
    }

    startPeriodicUpdates() {
        // Update data every 5 seconds
        this.updateInterval = setInterval(() => {
            if (this.isConnected) {
                this.requestUpdate();
            }
        }, 5000);
    }

    requestUpdate() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'request_update' }));
        }
    }

    async loadInitialData() {
        try {
            // Load current profile
            const profileResponse = await fetch('/api/profile/current');
            if (profileResponse.ok) {
                const profile = await profileResponse.json();
                this.updateProfileDisplay(profile);
            }

            // Load wallet status
            const walletResponse = await fetch('/api/wallet/status');
            if (walletResponse.ok) {
                const wallet = await walletResponse.json();
                this.updateWalletDisplay(wallet);
            }

            // Load performance data
            const performanceResponse = await fetch('/api/performance');
            if (performanceResponse.ok) {
                const performance = await performanceResponse.json();
                this.updatePerformanceDisplay(performance);
            }

            // Load strategies
            const strategiesResponse = await fetch('/api/strategies');
            if (strategiesResponse.ok) {
                const strategies = await strategiesResponse.json();
                this.updateStrategiesDisplay(strategies);
            }

        } catch (error) {
            console.error('Error loading initial data:', error);
            this.addActivityLog('Error loading initial data', new Date());
        }
    }

    async loadProfiles() {
        try {
            const response = await fetch('/api/profiles');
            if (response.ok) {
                this.profiles = await response.json();
                this.displayProfiles();
            }
        } catch (error) {
            console.error('Error loading profiles:', error);
        }
    }

    displayProfiles() {
        const profileList = document.getElementById('profileList');
        profileList.innerHTML = '';

        this.profiles.forEach(profile => {
            const profileElement = document.createElement('div');
            profileElement.className = 'profile-option';
            if (profile.id === this.currentProfile?.id) {
                profileElement.classList.add('selected');
            }

            profileElement.innerHTML = `
                <h3>${profile.name}</h3>
                <p>${profile.description}</p>
                <div class="profile-weights">
                    Max Position: ${profile.riskSettings.maxPositionSize} | 
                    Min Confidence: ${(profile.riskSettings.minConfidenceThreshold * 100).toFixed(1)}% | 
                    Risk Level: ${this.getRiskLevel(profile)}
                </div>
            `;

            profileElement.onclick = () => this.switchProfile(profile.id);
            profileList.appendChild(profileElement);
        });
    }

    async switchProfile(profileId) {
        try {
            const response = await fetch('/api/profile/switch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ profileId })
            });

            if (response.ok) {
                const result = await response.json();
                this.updateProfileDisplay(result.profile);
                this.addActivityLog(`Switched to profile: ${result.profile.name}`, new Date());
                this.hideProfileModal();
            } else {
                throw new Error('Failed to switch profile');
            }
        } catch (error) {
            console.error('Error switching profile:', error);
            this.addActivityLog('Error switching profile', new Date());
        }
    }

    updateStatus(text, status) {
        document.getElementById('statusText').textContent = text;
        const statusDot = document.getElementById('statusDot');
        statusDot.className = `status-dot ${status}`;
    }

    updateProfileDisplay(profile) {
        this.currentProfile = profile;
        
        document.getElementById('currentProfileName').textContent = profile.name;
        document.getElementById('currentProfileDesc').textContent = profile.description;
        
        const riskLevel = this.getRiskLevel(profile);
        const riskElement = document.getElementById('riskLevel');
        riskElement.textContent = riskLevel;
        riskElement.className = `risk-badge ${riskLevel.toLowerCase().replace(' ', '')}`;
    }

    updateWalletDisplay(wallet) {
        document.getElementById('galaBalance').textContent = wallet.galaBalance.toFixed(6);
        document.getElementById('gusdcBalance').textContent = wallet.gusdcBalance.toFixed(6);
        document.getElementById('totalValue').textContent = wallet.totalValue.toFixed(2);
    }

    updatePerformanceDisplay(performance) {
        document.getElementById('totalTrades').textContent = performance.totalTrades || 0;
        document.getElementById('winRate').textContent = `${(performance.winRate || 0).toFixed(1)}%`;
        document.getElementById('totalVolume').textContent = `$${(performance.totalVolume || 0).toFixed(2)}`;
        document.getElementById('totalProfit').textContent = `$${(performance.totalProfit || 0).toFixed(2)}`;
        document.getElementById('maxDrawdown').textContent = `$${(performance.maxDrawdown || 0).toFixed(2)}`;
        document.getElementById('sharpeRatio').textContent = (performance.sharpeRatio || 0).toFixed(2);
    }

    updateStrategiesDisplay(strategies) {
        const strategiesGrid = document.getElementById('strategiesGrid');
        strategiesGrid.innerHTML = '';

        strategies.forEach(strategy => {
            const strategyElement = document.createElement('div');
            strategyElement.className = `strategy-item ${strategy.enabled ? 'enabled' : 'disabled'}`;
            
            strategyElement.innerHTML = `
                <div>
                    <div class="strategy-name">${strategy.name}</div>
                    <div class="strategy-weight">${(strategy.weight * 100).toFixed(1)}% weight</div>
                </div>
                <div class="strategy-status ${strategy.enabled ? 'enabled' : 'disabled'}">
                    <i class="fas ${strategy.enabled ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                </div>
            `;
            
            strategiesGrid.appendChild(strategyElement);
        });
    }

    addActivityLog(message, timestamp) {
        const activityLog = document.getElementById('activityLog');
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        
        const timeString = timestamp.toLocaleTimeString();
        activityItem.innerHTML = `
            <span class="activity-time">${timeString}</span>
            <span class="activity-message">${message}</span>
        `;
        
        activityLog.insertBefore(activityItem, activityLog.firstChild);
        
        // Keep only last 50 activity items
        while (activityLog.children.length > 50) {
            activityLog.removeChild(activityLog.lastChild);
        }
    }

    getRiskLevel(profile) {
        const totalRisk = profile.riskSettings.maxPositionSize + 
                         profile.riskSettings.maxDailyLoss + 
                         profile.riskSettings.maxDrawdown;
        
        if (totalRisk < 200) return 'Conservative';
        if (totalRisk < 500) return 'Balanced';
        return 'Aggressive';
    }

    // Chart Methods
    initializeChart() {
        const ctx = document.getElementById('tradingChart').getContext('2d');
        
        // Generate initial mock data
        this.generateMockData();
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.priceData.map(point => point.time),
                datasets: [
                    {
                        label: 'GALA Price',
                        data: this.priceData.map(point => point.price),
                        borderColor: '#4fc1ff',
                        backgroundColor: 'rgba(79, 193, 255, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Buy Signals',
                        data: this.tradeSignals.filter(signal => signal.type === 'BUY').map(signal => ({
                            x: signal.time,
                            y: signal.price
                        })),
                        type: 'scatter',
                        backgroundColor: '#3fb950',
                        borderColor: '#3fb950',
                        pointRadius: 8,
                        pointHoverRadius: 10,
                        showLine: false
                    },
                    {
                        label: 'Sell Signals',
                        data: this.tradeSignals.filter(signal => signal.type === 'SELL').map(signal => ({
                            x: signal.time,
                            y: signal.price
                        })),
                        type: 'scatter',
                        backgroundColor: '#f85149',
                        borderColor: '#f85149',
                        pointRadius: 8,
                        pointHoverRadius: 10,
                        showLine: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#d4d4d4',
                            font: {
                                family: 'JetBrains Mono, monospace'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#252526',
                        titleColor: '#ffffff',
                        bodyColor: '#d4d4d4',
                        borderColor: '#3e3e42',
                        borderWidth: 1,
                        callbacks: {
                            title: function(context) {
                                return new Date(context[0].label).toLocaleString();
                            },
                            label: function(context) {
                                if (context.datasetIndex === 0) {
                                    return `Price: $${context.parsed.y.toFixed(6)}`;
                                } else {
                                    return `${context.dataset.label}: $${context.parsed.y.toFixed(6)}`;
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute',
                            displayFormats: {
                                minute: 'HH:mm',
                                hour: 'MMM dd HH:mm'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Time',
                            color: '#d4d4d4',
                            font: {
                                family: 'JetBrains Mono, monospace'
                            }
                        },
                        ticks: {
                            color: '#cccccc',
                            font: {
                                family: 'JetBrains Mono, monospace'
                            }
                        },
                        grid: {
                            color: '#3e3e42'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Price (USD)',
                            color: '#d4d4d4',
                            font: {
                                family: 'JetBrains Mono, monospace'
                            }
                        },
                        ticks: {
                            color: '#cccccc',
                            font: {
                                family: 'JetBrains Mono, monospace'
                            },
                            callback: function(value) {
                                return '$' + value.toFixed(6);
                            }
                        },
                        grid: {
                            color: '#3e3e42'
                        }
                    }
                }
            }
        });
    }

    generateMockData() {
        const now = new Date();
        const basePrice = 0.016385;
        const dataPoints = 100;
        
        this.priceData = [];
        this.tradeSignals = [];
        
        for (let i = 0; i < dataPoints; i++) {
            const time = new Date(now.getTime() - (dataPoints - i) * 60000); // 1 minute intervals
            const priceVariation = (Math.random() - 0.5) * 0.002; // ±0.1% variation
            const price = basePrice + priceVariation;
            
            this.priceData.push({
                time: time.toISOString(),
                price: price
            });
            
            // Randomly add some trade signals
            if (Math.random() < 0.1) { // 10% chance
                this.tradeSignals.push({
                    time: time.toISOString(),
                    price: price,
                    type: Math.random() < 0.5 ? 'BUY' : 'SELL',
                    confidence: Math.random() * 0.5 + 0.5
                });
            }
        }
        
        // Update chart stats
        this.updateChartStats();
    }

    updatePriceData(price, timestamp) {
        const time = new Date(timestamp || Date.now());
        
        // Add new price point
        this.priceData.push({
            time: time.toISOString(),
            price: price
        });
        
        // Keep only last 200 data points
        if (this.priceData.length > 200) {
            this.priceData.shift();
        }
        
        // Update chart
        this.updateChart();
        this.updateChartStats();
    }

    addTradeSignal(signalData) {
        const time = new Date();
        const signal = {
            time: time.toISOString(),
            price: signalData.price || this.priceData[this.priceData.length - 1]?.price || 0,
            type: signalData.action || 'BUY',
            confidence: signalData.confidence || 0.5
        };
        
        this.tradeSignals.push(signal);
        
        // Keep only last 50 signals
        if (this.tradeSignals.length > 50) {
            this.tradeSignals.shift();
        }
        
        this.updateChart();
    }

    updateChart() {
        if (!this.chart) return;
        
        this.chart.data.labels = this.priceData.map(point => point.time);
        this.chart.data.datasets[0].data = this.priceData.map(point => point.price);
        this.chart.data.datasets[1].data = this.tradeSignals
            .filter(signal => signal.type === 'BUY')
            .map(signal => ({ x: signal.time, y: signal.price }));
        this.chart.data.datasets[2].data = this.tradeSignals
            .filter(signal => signal.type === 'SELL')
            .map(signal => ({ x: signal.time, y: signal.price }));
        
        this.chart.update('none');
    }

    updateChartStats() {
        if (this.priceData.length === 0) return;
        
        const currentPrice = this.priceData[this.priceData.length - 1].price;
        const previousPrice = this.priceData.length > 1 ? this.priceData[this.priceData.length - 2].price : currentPrice;
        const change = ((currentPrice - previousPrice) / previousPrice) * 100;
        
        document.getElementById('currentPrice').textContent = `$${currentPrice.toFixed(6)}`;
        
        const changeElement = document.getElementById('priceChange');
        changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        changeElement.className = `stat-value ${change >= 0 ? 'positive' : 'negative'}`;
        
        // Calculate volume (simplified)
        const volume = this.tradeSignals.length * 100; // Mock volume calculation
        document.getElementById('chartVolume').textContent = volume.toLocaleString();
    }

    updateChartTimeRange() {
        // This would filter data based on time range
        // For now, we'll just regenerate mock data
        this.generateMockData();
        this.updateChart();
    }

    updateChartType() {
        if (!this.chart) return;
        
        // Toggle between line and candlestick (simplified)
        const newType = this.chartType === 'line' ? 'line' : 'line'; // Chart.js doesn't have built-in candlestick
        this.chart.config.type = newType;
        this.chart.update();
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TradingDashboard();
});

// Utility functions for global access
window.showProfileModal = () => {
    document.getElementById('profileModal').style.display = 'block';
    if (window.dashboard) {
        window.dashboard.loadProfiles();
    }
};

window.hideProfileModal = () => {
    document.getElementById('profileModal').style.display = 'none';
};
