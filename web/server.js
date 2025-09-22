const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');

// Import bot services
const { Bot } = require('../dist/bot');
const { Logger } = require('../dist/utils/logger');

class WebServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        this.bot = null;
        this.logger = new Logger('WebServer');
        this.clients = new Set();
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.initializeBot();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, 'public')));
    }

    setupRoutes() {
        // Serve main page
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // API Routes
        this.app.get('/api/profile/current', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(503).json({ error: 'Bot not initialized' });
                }

                const profile = this.bot.getEnhancedTradingService().getCurrentProfile();
                res.json(profile);
            } catch (error) {
                this.logger.error('Error getting current profile:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        this.app.get('/api/profiles', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(503).json({ error: 'Bot not initialized' });
                }

                const profiles = this.bot.getEnhancedTradingService().getAllProfiles();
                res.json(profiles);
            } catch (error) {
                this.logger.error('Error getting profiles:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        this.app.post('/api/profile/switch', async (req, res) => {
            try {
                const { profileId } = req.body;
                
                if (!this.bot) {
                    return res.status(503).json({ error: 'Bot not initialized' });
                }

                const success = this.bot.getEnhancedTradingService().switchProfile(profileId);
                
                if (success) {
                    const profile = this.bot.getEnhancedTradingService().getCurrentProfile();
                    
                    // Broadcast profile update to all clients
                    this.broadcast({
                        type: 'profile_update',
                        profile: profile
                    });
                    
                    res.json({ success: true, profile });
                } else {
                    res.status(400).json({ error: 'Failed to switch profile' });
                }
            } catch (error) {
                this.logger.error('Error switching profile:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        this.app.get('/api/wallet/status', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(503).json({ error: 'Bot not initialized' });
                }

                const galaDexService = this.bot.getGalaDexService();
                
                // Get GALA balance
                const galaBalance = await galaDexService.getTokenBalance({
                    symbol: 'GALA',
                    classKey: 'GALA|Unit|none|none',
                    decimals: 8,
                    name: 'Gala'
                });

                // Get GUSDC balance
                const gusdcBalance = await galaDexService.getTokenBalance({
                    symbol: 'GUSDC',
                    classKey: 'GUSDC|Unit|none|none',
                    decimals: 6,
                    name: 'Gala USD Coin'
                });

                // Calculate total value (simplified - in real implementation, you'd get current prices)
                const totalValue = gusdcBalance; // Assuming GUSDC is $1

                res.json({
                    galaBalance,
                    gusdcBalance,
                    totalValue
                });
            } catch (error) {
                this.logger.error('Error getting wallet status:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        this.app.get('/api/performance', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(503).json({ error: 'Bot not initialized' });
                }

                const performance = this.bot.getEnhancedTradingService().getTradingStatus();
                res.json(performance.performanceMetrics);
            } catch (error) {
                this.logger.error('Error getting performance data:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        this.app.get('/api/strategies', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(503).json({ error: 'Bot not initialized' });
                }

                const currentProfile = this.bot.getEnhancedTradingService().getCurrentProfile();
                const weights = currentProfile.strategyWeights;
                const enabled = currentProfile.enabledStrategies;

                const strategies = [
                    { name: 'Arbitrage Detection', weight: weights.arbitrage, enabled: enabled.arbitrage },
                    { name: 'Momentum Analysis', weight: weights.momentum, enabled: enabled.momentum },
                    { name: 'Volume Analysis', weight: weights.volume, enabled: enabled.volume },
                    { name: 'Trend Analysis', weight: weights.trend, enabled: enabled.trend },
                    { name: 'Bollinger Bands', weight: weights.bollingerBands, enabled: enabled.bollingerBands },
                    { name: 'Fibonacci Strategy', weight: weights.fibonacci, enabled: enabled.fibonacci },
                    { name: 'DCA Strategy', weight: weights.dca, enabled: enabled.dca }
                ];

                res.json(strategies);
            } catch (error) {
                this.logger.error('Error getting strategies:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                botInitialized: !!this.bot,
                connectedClients: this.clients.size,
                uptime: process.uptime()
            });
        });

        // Chart data endpoint
        this.app.get('/api/chart/data', (req, res) => {
            try {
                // Return mock price data for now
                const basePrice = 0.016385;
                const variation = (Math.random() - 0.5) * 0.002; // ±0.1% variation
                const currentPrice = basePrice + variation;
                
                res.json({
                    price: currentPrice,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                this.logger.error('Error getting chart data:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    }

    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            this.logger.info('New WebSocket client connected');
            this.clients.add(ws);

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleWebSocketMessage(ws, data);
                } catch (error) {
                    this.logger.error('Error parsing WebSocket message:', error);
                }
            });

            ws.on('close', () => {
                this.logger.info('WebSocket client disconnected');
                this.clients.delete(ws);
            });

            ws.on('error', (error) => {
                this.logger.error('WebSocket error:', error);
                this.clients.delete(ws);
            });

            // Send initial data to new client
            this.sendInitialData(ws);
        });
    }

    handleWebSocketMessage(ws, data) {
        switch (data.type) {
            case 'request_update':
                this.sendUpdateToClient(ws);
                break;
            default:
                this.logger.warn('Unknown WebSocket message type:', data.type);
        }
    }

    async sendInitialData(ws) {
        try {
            if (!this.bot) return;

            // Send current profile
            const profile = this.bot.getEnhancedTradingService().getCurrentProfile();
            ws.send(JSON.stringify({
                type: 'profile_update',
                profile: profile
            }));

            // Send wallet status
            const galaDexService = this.bot.getGalaDexService();
            const galaBalance = await galaDexService.getTokenBalance({
                symbol: 'GALA',
                classKey: 'GALA|Unit|none|none',
                decimals: 8,
                name: 'Gala'
            });
            const gusdcBalance = await galaDexService.getTokenBalance({
                symbol: 'GUSDC',
                classKey: 'GUSDC|Unit|none|none',
                decimals: 6,
                name: 'Gala USD Coin'
            });

            ws.send(JSON.stringify({
                type: 'wallet_update',
                wallet: {
                    galaBalance,
                    gusdcBalance,
                    totalValue: gusdcBalance
                }
            }));

            // Send performance data
            const performance = this.bot.getEnhancedTradingService().getTradingStatus();
            ws.send(JSON.stringify({
                type: 'performance_update',
                performance: performance.performanceMetrics
            }));

            // Send strategies
            const currentProfile = this.bot.getEnhancedTradingService().getCurrentProfile();
            const weights = currentProfile.strategyWeights;
            const enabled = currentProfile.enabledStrategies;

            const strategies = [
                { name: 'Arbitrage Detection', weight: weights.arbitrage, enabled: enabled.arbitrage },
                { name: 'Momentum Analysis', weight: weights.momentum, enabled: enabled.momentum },
                { name: 'Volume Analysis', weight: weights.volume, enabled: enabled.volume },
                { name: 'Trend Analysis', weight: weights.trend, enabled: enabled.trend },
                { name: 'Bollinger Bands', weight: weights.bollingerBands, enabled: enabled.bollingerBands },
                { name: 'Fibonacci Strategy', weight: weights.fibonacci, enabled: enabled.fibonacci },
                { name: 'DCA Strategy', weight: weights.dca, enabled: enabled.dca }
            ];

            ws.send(JSON.stringify({
                type: 'strategy_update',
                strategies: strategies
            }));

        } catch (error) {
            this.logger.error('Error sending initial data:', error);
        }
    }

    async sendUpdateToClient(ws) {
        try {
            if (!this.bot) return;

            // Send performance update
            const performance = this.bot.getEnhancedTradingService().getTradingStatus();
            ws.send(JSON.stringify({
                type: 'performance_update',
                performance: performance.performanceMetrics
            }));

        } catch (error) {
            this.logger.error('Error sending update:', error);
        }
    }

    broadcast(data) {
        const message = JSON.stringify(data);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    async initializeBot() {
        try {
            this.logger.info('Initializing bot for web server...');
            this.bot = new Bot();
            await this.bot.initialize();
            this.logger.info('Bot initialized successfully');
            
            // Start price update simulation
            this.startPriceUpdates();
        } catch (error) {
            this.logger.error('Failed to initialize bot:', error);
        }
    }

    startPriceUpdates() {
        // Simulate price updates every 30 seconds
        setInterval(() => {
            try {
                // Generate mock price data
                const basePrice = 0.016385;
                const variation = (Math.random() - 0.5) * 0.002; // ±0.1% variation
                const currentPrice = basePrice + variation;
                
                // Broadcast price update
                this.broadcast({
                    type: 'price_update',
                    price: currentPrice,
                    timestamp: new Date().toISOString()
                });

                // Simulate occasional trading signals
                if (Math.random() < 0.3) { // 30% chance every 30 seconds
                    const signalType = Math.random() < 0.5 ? 'BUY' : 'SELL';
                    const confidence = Math.random() * 0.4 + 0.6; // 60-100% confidence
                    
                    this.broadcast({
                        type: 'trading_signal',
                        action: signalType,
                        price: currentPrice,
                        confidence: confidence,
                        timestamp: new Date().toISOString()
                    });
                }

            } catch (error) {
                this.logger.error('Error in price update simulation:', error);
            }
        }, 30000); // 30 seconds
    }

    start(port = 3000) {
        this.server.listen(port, () => {
            this.logger.info(`🚀 Web server running on http://localhost:${port}`);
            this.logger.info(`📊 Dashboard available at http://localhost:${port}`);
        });
    }
}

// Start server if this file is run directly
if (require.main === module) {
    const server = new WebServer();
    server.start(process.env.PORT || 3000);
}

module.exports = WebServer;