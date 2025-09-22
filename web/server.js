const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock trading data
let tradingStats = {
  totalTrades: 0,
  successfulTrades: 0,
  failedTrades: 0,
  winRate: 0,
  totalVolume: 0,
  totalProfit: 0
};

let balances = [
  { token: 'GALA', balance: 2750.0, usdValue: 137.50, lastUpdated: Date.now() },
  { token: 'GUSDC', balance: 125.5, usdValue: 125.50, lastUpdated: Date.now() },
  { token: 'GUSDT', balance: 50.0, usdValue: 50.00, lastUpdated: Date.now() }
];

let activeTrades = [];
let tradeHistory = [];
let isTrading = false;

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send initial data
  socket.emit('initialData', {
    stats: tradingStats,
    balances,
    activeTrades,
    tradeHistory,
    isTrading
  });

  // Handle start trading
  socket.on('startTrading', () => {
    isTrading = true;
    io.emit('tradingStatusChanged', { isTrading: true });
    console.log('Trading started');
  });

  // Handle stop trading
  socket.on('stopTrading', () => {
    isTrading = false;
    io.emit('tradingStatusChanged', { isTrading: false });
    console.log('Trading stopped');
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Simulate trading activity
setInterval(() => {
  if (isTrading) {
    // Simulate a trade
    const tokens = ['GALA', 'GUSDC', 'GUSDT'];
    const actions = ['BUY', 'SELL'];
    const token = tokens[Math.floor(Math.random() * tokens.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const amount = Math.random() * 100 + 10;
    const price = 0.05 + Math.random() * 0.01;
    const confidence = 0.5 + Math.random() * 0.5;

    const trade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      token,
      action,
      amount: Math.round(amount * 100) / 100,
      price: Math.round(price * 10000) / 10000,
      confidence: Math.round(confidence * 100) / 100,
      reason: 'Simulated trade for demo',
      timestamp: Date.now(),
      status: 'PENDING'
    };

    activeTrades.push(trade);
    
    // Simulate trade completion after 5-10 seconds
    setTimeout(() => {
      const tradeIndex = activeTrades.findIndex(t => t.id === trade.id);
      if (tradeIndex !== -1) {
        const completedTrade = activeTrades.splice(tradeIndex, 1)[0];
        completedTrade.status = Math.random() > 0.2 ? 'FILLED' : 'FAILED';
        completedTrade.txHash = `0x${Math.random().toString(16).substr(2, 8)}`;
        
        tradeHistory.unshift(completedTrade);
        if (tradeHistory.length > 50) tradeHistory.pop();

        // Update stats
        tradingStats.totalTrades++;
        if (completedTrade.status === 'FILLED') {
          tradingStats.successfulTrades++;
          tradingStats.totalProfit += Math.random() * 10 - 5; // Random profit/loss
        } else {
          tradingStats.failedTrades++;
        }
        tradingStats.winRate = (tradingStats.successfulTrades / tradingStats.totalTrades) * 100;
        tradingStats.totalVolume += completedTrade.amount * completedTrade.price;

        // Update balances
        const balanceIndex = balances.findIndex(b => b.token === token);
        if (balanceIndex !== -1) {
          if (action === 'BUY') {
            balances[balanceIndex].balance += completedTrade.amount;
            balances[balanceIndex].usdValue = balances[balanceIndex].balance * completedTrade.price;
          } else {
            balances[balanceIndex].balance -= completedTrade.amount;
            balances[balanceIndex].usdValue = balances[balanceIndex].balance * completedTrade.price;
          }
          balances[balanceIndex].lastUpdated = Date.now();
        }

        io.emit('tradeCompleted', {
          trade: completedTrade,
          stats: tradingStats,
          balances
        });
      }
    }, 5000 + Math.random() * 5000);

    io.emit('newTrade', trade);
  }
}, 10000); // New trade every 10 seconds when trading

// API endpoints
app.get('/api/stats', (req, res) => {
  res.json(tradingStats);
});

app.get('/api/balances', (req, res) => {
  res.json(balances);
});

app.get('/api/trades', (req, res) => {
  res.json({ activeTrades, tradeHistory });
});

app.post('/api/trading/start', (req, res) => {
  isTrading = true;
  io.emit('tradingStatusChanged', { isTrading: true });
  res.json({ success: true, isTrading: true });
});

app.post('/api/trading/stop', (req, res) => {
  isTrading = false;
  io.emit('tradingStatusChanged', { isTrading: false });
  res.json({ success: true, isTrading: false });
});

server.listen(PORT, () => {
  console.log(`Trading bot server running on port ${PORT}`);
});
