# GalaDex TypeScript Trading Bot Configuration

## Required Environment Variables

The bot requires the following environment variables to be set:

### Required Variables
- `WALLET_ADDRESS`: Your GalaDex wallet address (format: eth|...)
- `PRIVATE_KEY`: Your wallet's private key (keep this secure!)

### Optional Variables
- `MIN_PROFIT_THRESHOLD`: Minimum profit threshold (default: 0.01)
- `MAX_POSITION_SIZE`: Maximum position size (default: 1000)
- `DRY_RUN`: Enable dry run mode (default: true)
- `SCAN_INTERVAL_MS`: Scan interval in milliseconds (default: 30000)
- `LOG_LEVEL`: Log level (default: info)
- `MAX_SLIPPAGE`: Maximum slippage tolerance (default: 0.05)
- `ENABLE_TRADING`: Enable actual trading (default: false)

## Setup Instructions

### Method 1: Create .env file
Create a `.env` file in the project root with your configuration:

```env
WALLET_ADDRESS=your_wallet_address_here
PRIVATE_KEY=your_private_key_here
MIN_PROFIT_THRESHOLD=0.01
MAX_POSITION_SIZE=1000
DRY_RUN=true
SCAN_INTERVAL_MS=30000
LOG_LEVEL=info
MAX_SLIPPAGE=0.05
ENABLE_TRADING=false
```

### Method 2: Set environment variables directly
You can set environment variables in your terminal before running the bot:

**Windows (PowerShell):**
```powershell
$env:WALLET_ADDRESS="your_wallet_address_here"
$env:PRIVATE_KEY="your_private_key_here"
npm start
```

**Windows (Command Prompt):**
```cmd
set WALLET_ADDRESS=your_wallet_address_here
set PRIVATE_KEY=your_private_key_here
npm start
```

**Linux/Mac:**
```bash
export WALLET_ADDRESS="your_wallet_address_here"
export PRIVATE_KEY="your_private_key_here"
npm start
```

## Security Notes

- **NEVER** commit your private key to version control
- Keep your `.env` file secure and add it to `.gitignore`
- Consider using a hardware wallet for production trading
- Start with `DRY_RUN=true` and `ENABLE_TRADING=false` for testing

## Getting Started

1. Set your `WALLET_ADDRESS` and `PRIVATE_KEY`
2. Start with dry run mode: `DRY_RUN=true` and `ENABLE_TRADING=false`
3. Test the bot's scanning and analysis capabilities
4. Once confident, enable trading: `ENABLE_TRADING=true` and `DRY_RUN=false`
