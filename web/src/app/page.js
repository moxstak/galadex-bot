"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Dashboard;
const react_1 = require("react");
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const badge_1 = require("@/components/ui/badge");
const tabs_1 = require("@/components/ui/tabs");
const lucide_react_1 = require("lucide-react");
const recharts_1 = require("recharts");
const useSocket_1 = require("@/hooks/useSocket");
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
function Dashboard() {
    const { isConnected, stats, balances, activeTrades, tradeHistory, isTrading, startTrading, stopTrading } = (0, useSocket_1.useSocket)();
    const [priceHistory, setPriceHistory] = (0, react_1.useState)([]);
    // Mock price history for demonstration
    (0, react_1.useEffect)(() => {
        const mockPriceData = Array.from({ length: 24 }, (_, i) => ({
            time: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toLocaleTimeString(),
            price: 0.05 + Math.random() * 0.01
        }));
        setPriceHistory(mockPriceData);
    }, []);
    const handleStartTrading = () => {
        startTrading();
    };
    const handleStopTrading = () => {
        stopTrading();
    };
    const totalPortfolioValue = balances.reduce((sum, balance) => sum + balance.usdValue, 0);
    return (<div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <lucide_react_1.Activity className="h-8 w-8 text-blue-600"/>
              <h1 className="ml-2 text-2xl font-bold text-gray-900">GalaDex Trading Bot</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}/>
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <button_1.Button onClick={isTrading ? handleStopTrading : handleStartTrading} variant={isTrading ? 'destructive' : 'default'} className="flex items-center space-x-2">
                {isTrading ? <lucide_react_1.Pause className="h-4 w-4"/> : <lucide_react_1.Play className="h-4 w-4"/>}
                <span>{isTrading ? 'Stop Trading' : 'Start Trading'}</span>
              </button_1.Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <tabs_1.Tabs defaultValue="overview" className="space-y-6">
          <tabs_1.TabsList className="grid w-full grid-cols-4">
            <tabs_1.TabsTrigger value="overview">Overview</tabs_1.TabsTrigger>
            <tabs_1.TabsTrigger value="trading">Trading</tabs_1.TabsTrigger>
            <tabs_1.TabsTrigger value="portfolio">Portfolio</tabs_1.TabsTrigger>
            <tabs_1.TabsTrigger value="settings">Settings</tabs_1.TabsTrigger>
          </tabs_1.TabsList>

          {/* Overview Tab */}
          <tabs_1.TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <card_1.Card>
                <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <card_1.CardTitle className="text-sm font-medium">Total Profit</card_1.CardTitle>
                  <lucide_react_1.DollarSign className="h-4 w-4 text-muted-foreground"/>
                </card_1.CardHeader>
                <card_1.CardContent>
                  <div className="text-2xl font-bold text-green-600">${stats.totalProfit.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">+12.5% from last week</p>
                </card_1.CardContent>
              </card_1.Card>

              <card_1.Card>
                <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <card_1.CardTitle className="text-sm font-medium">Win Rate</card_1.CardTitle>
                  <lucide_react_1.TrendingUp className="h-4 w-4 text-muted-foreground"/>
                </card_1.CardHeader>
                <card_1.CardContent>
                  <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">{stats.successfulTrades} of {stats.totalTrades} trades</p>
                </card_1.CardContent>
              </card_1.Card>

              <card_1.Card>
                <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <card_1.CardTitle className="text-sm font-medium">Total Volume</card_1.CardTitle>
                  <lucide_react_1.Activity className="h-4 w-4 text-muted-foreground"/>
                </card_1.CardHeader>
                <card_1.CardContent>
                  <div className="text-2xl font-bold">${stats.totalVolume.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Traded volume</p>
                </card_1.CardContent>
              </card_1.Card>

              <card_1.Card>
                <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <card_1.CardTitle className="text-sm font-medium">Portfolio Value</card_1.CardTitle>
                  <lucide_react_1.Wallet className="h-4 w-4 text-muted-foreground"/>
                </card_1.CardHeader>
                <card_1.CardContent>
                  <div className="text-2xl font-bold">${totalPortfolioValue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Current value</p>
                </card_1.CardContent>
              </card_1.Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <card_1.Card>
                <card_1.CardHeader>
                  <card_1.CardTitle>Price History</card_1.CardTitle>
                  <card_1.CardDescription>GALA price over the last 24 hours</card_1.CardDescription>
                </card_1.CardHeader>
                <card_1.CardContent>
                  <recharts_1.ResponsiveContainer width="100%" height={300}>
                    <recharts_1.LineChart data={priceHistory}>
                      <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                      <recharts_1.XAxis dataKey="time"/>
                      <recharts_1.YAxis />
                      <recharts_1.Tooltip />
                      <recharts_1.Line type="monotone" dataKey="price" stroke="#8884d8" strokeWidth={2}/>
                    </recharts_1.LineChart>
                  </recharts_1.ResponsiveContainer>
                </card_1.CardContent>
              </card_1.Card>

              <card_1.Card>
                <card_1.CardHeader>
                  <card_1.CardTitle>Portfolio Distribution</card_1.CardTitle>
                  <card_1.CardDescription>Token allocation by value</card_1.CardDescription>
                </card_1.CardHeader>
                <card_1.CardContent>
                  <recharts_1.ResponsiveContainer width="100%" height={300}>
                    <recharts_1.PieChart>
                      <recharts_1.Pie data={balances} cx="50%" cy="50%" labelLine={false} label={({ token, usdValue }) => `${token}: $${usdValue.toFixed(2)}`} outerRadius={80} fill="#8884d8" dataKey="usdValue">
                        {balances.map((entry, index) => (<recharts_1.Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>))}
                      </recharts_1.Pie>
                      <recharts_1.Tooltip />
                    </recharts_1.PieChart>
                  </recharts_1.ResponsiveContainer>
                </card_1.CardContent>
              </card_1.Card>
            </div>
          </tabs_1.TabsContent>

          {/* Trading Tab */}
          <tabs_1.TabsContent value="trading" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Trades */}
              <card_1.Card>
                <card_1.CardHeader>
                  <card_1.CardTitle>Active Trades</card_1.CardTitle>
                  <card_1.CardDescription>Currently executing trades</card_1.CardDescription>
                </card_1.CardHeader>
                <card_1.CardContent>
                  <div className="space-y-4">
                    {activeTrades.map((trade) => (<div key={trade.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <badge_1.Badge variant={trade.action === 'BUY' ? 'default' : 'destructive'}>
                            {trade.action}
                          </badge_1.Badge>
                          <div>
                            <p className="font-medium">{trade.amount} {trade.token}</p>
                            <p className="text-sm text-gray-500">{trade.reason}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">${trade.price.toFixed(4)}</p>
                          <p className="text-xs text-gray-500">{(trade.confidence * 100).toFixed(0)}% confidence</p>
                        </div>
                      </div>))}
                    {activeTrades.length === 0 && (<p className="text-gray-500 text-center py-4">No active trades</p>)}
                  </div>
                </card_1.CardContent>
              </card_1.Card>

              {/* Recent Trades */}
              <card_1.Card>
                <card_1.CardHeader>
                  <card_1.CardTitle>Recent Trades</card_1.CardTitle>
                  <card_1.CardDescription>Latest trade history</card_1.CardDescription>
                </card_1.CardHeader>
                <card_1.CardContent>
                  <div className="space-y-4">
                    {tradeHistory.map((trade) => (<div key={trade.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <badge_1.Badge variant={trade.action === 'BUY' ? 'default' : 'destructive'}>
                            {trade.action}
                          </badge_1.Badge>
                          <div>
                            <p className="font-medium">{trade.amount} {trade.token}</p>
                            <p className="text-sm text-gray-500">{trade.reason}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            {trade.status === 'FILLED' ? (<lucide_react_1.CheckCircle className="h-4 w-4 text-green-500"/>) : trade.status === 'FAILED' ? (<lucide_react_1.AlertCircle className="h-4 w-4 text-red-500"/>) : (<lucide_react_1.Clock className="h-4 w-4 text-yellow-500"/>)}
                            <span className="text-sm font-medium">${trade.price.toFixed(4)}</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {new Date(trade.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>))}
                  </div>
                </card_1.CardContent>
              </card_1.Card>
            </div>
          </tabs_1.TabsContent>

          {/* Portfolio Tab */}
          <tabs_1.TabsContent value="portfolio" className="space-y-6">
            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>Portfolio Overview</card_1.CardTitle>
                <card_1.CardDescription>Your current token holdings</card_1.CardDescription>
              </card_1.CardHeader>
              <card_1.CardContent>
                <div className="space-y-4">
                  {balances.map((balance) => (<div key={balance.token} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold">{balance.token[0]}</span>
                        </div>
                        <div>
                          <p className="font-medium">{balance.token}</p>
                          <p className="text-sm text-gray-500">{balance.balance.toFixed(6)} tokens</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${balance.usdValue.toFixed(2)}</p>
                        <p className="text-sm text-gray-500">
                          ${(balance.usdValue / balance.balance).toFixed(4)} per token
                        </p>
                      </div>
                    </div>))}
                </div>
              </card_1.CardContent>
            </card_1.Card>
          </tabs_1.TabsContent>

          {/* Settings Tab */}
          <tabs_1.TabsContent value="settings" className="space-y-6">
            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>Bot Configuration</card_1.CardTitle>
                <card_1.CardDescription>Configure your trading bot settings</card_1.CardDescription>
              </card_1.CardHeader>
              <card_1.CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Trading Mode</p>
                      <p className="text-sm text-gray-500">Enable or disable automated trading</p>
                    </div>
                    <button_1.Button variant={isTrading ? 'destructive' : 'default'} size="sm">
                      {isTrading ? 'Disable' : 'Enable'}
                    </button_1.Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Dry Run Mode</p>
                      <p className="text-sm text-gray-500">Test trades without real execution</p>
                    </div>
                    <button_1.Button variant="outline" size="sm">Enable</button_1.Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Risk Management</p>
                      <p className="text-sm text-gray-500">Configure position sizing and limits</p>
                    </div>
                    <button_1.Button variant="outline" size="sm">Configure</button_1.Button>
                  </div>
                </div>
              </card_1.CardContent>
            </card_1.Card>
          </tabs_1.TabsContent>
        </tabs_1.Tabs>
      </main>
    </div>);
}
