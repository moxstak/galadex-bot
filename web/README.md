# 🌐 GalaDex Trading Bot Web Dashboard

A modern, responsive web interface for the GalaDex Trading Bot that provides real-time monitoring, profile management, and trading analytics.

## ✨ Features

- **Real-time Dashboard**: Live updates of trading performance, wallet status, and bot activity
- **Profile Management**: Switch between different trading profiles with a single click
- **Strategy Monitoring**: View active strategies and their weights in real-time
- **Performance Analytics**: Track trades, win rate, volume, and profit metrics
- **WebSocket Support**: Real-time data streaming for instant updates
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices

## 🚀 Quick Start

### 1. Start the Web Server

```bash
# Set environment variables
$env:WALLET_ADDRESS="your_wallet_address"
$env:PRIVATE_KEY="your_private_key"
$env:DRY_RUN="true"
$env:ENABLE_TRADING="false"

# Start the web server
npm run web
```

### 2. Open the Dashboard

Navigate to: **http://localhost:3000**

## 📊 Dashboard Sections

### Profile Management
- **Current Profile**: Shows active trading profile and risk level
- **Switch Profile**: Click "Switch Profile" to change trading strategies
- **Profile Details**: View strategy weights, risk settings, and configuration

### Wallet Status
- **Token Balances**: Real-time GALA and GUSDC balances
- **Total Value**: Portfolio value in USD
- **Connection Status**: Bot connectivity indicator

### Trading Performance
- **Total Trades**: Number of completed trades
- **Win Rate**: Percentage of profitable trades
- **Total Volume**: Trading volume in USD
- **Total Profit**: Net profit/loss
- **Max Drawdown**: Maximum loss from peak
- **Sharpe Ratio**: Risk-adjusted return metric

### Active Strategies
- **Strategy Status**: Enabled/disabled indicators
- **Strategy Weights**: Percentage allocation for each strategy
- **Real-time Updates**: Live status updates via WebSocket

### Recent Activity
- **Activity Log**: Real-time bot activity and trading signals
- **Timestamps**: Precise timing of all events
- **Auto-scroll**: Automatically shows latest activities

## 🔧 API Endpoints

The web server provides RESTful API endpoints:

- `GET /api/health` - Server health check
- `GET /api/profile/current` - Get current trading profile
- `GET /api/profiles` - Get all available profiles
- `POST /api/profile/switch` - Switch to a different profile
- `GET /api/wallet/status` - Get wallet balances
- `GET /api/performance` - Get trading performance metrics
- `GET /api/strategies` - Get active strategies and weights

## 🌐 WebSocket Events

Real-time updates are sent via WebSocket:

- `profile_update` - Profile changes
- `wallet_update` - Balance updates
- `performance_update` - Performance metrics
- `strategy_update` - Strategy status changes
- `activity_log` - New activity messages
- `trading_signal` - Trading signal notifications

## 🎨 Customization

### Styling
- Edit `web/public/styles.css` to customize the appearance
- Modern gradient backgrounds and glass-morphism effects
- Responsive grid layout that adapts to screen size

### Functionality
- Modify `web/public/app.js` to add new features
- Update `web/server.js` to add new API endpoints
- Extend WebSocket handlers for additional real-time features

## 🔒 Security Notes

- The web interface runs on localhost by default
- No sensitive data is exposed in the frontend
- All API calls are made to the local server
- WebSocket connections are secured within the local network

## 📱 Mobile Support

The dashboard is fully responsive and works on:
- Desktop computers
- Tablets (iPad, Android tablets)
- Mobile phones (iOS, Android)
- Touch-enabled devices

## 🛠️ Development

### File Structure
```
web/
├── public/
│   ├── index.html      # Main dashboard page
│   ├── styles.css      # CSS styling
│   └── app.js          # Frontend JavaScript
├── server.js           # Express server with WebSocket
└── README.md           # This file
```

### Adding New Features

1. **Frontend**: Update `app.js` and `index.html`
2. **Backend**: Add routes to `server.js`
3. **Real-time**: Add WebSocket handlers for live updates
4. **Styling**: Modify `styles.css` for visual changes

## 🚀 Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use a reverse proxy (nginx, Apache)
3. Enable HTTPS for secure connections
4. Configure proper CORS settings
5. Set up monitoring and logging

## 📞 Support

For issues or questions about the web dashboard:
- Check the browser console for JavaScript errors
- Verify the bot is running and connected
- Ensure all environment variables are set correctly
- Check the server logs for backend errors

---

**Happy Trading! 🚀📈**
