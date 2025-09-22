'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  Wallet, 
  Settings,
  Play,
  Pause,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useSocket } from '@/hooks/useSocket';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function Dashboard() {
  const {
    isConnected,
    stats,
    balances,
    activeTrades,
    tradeHistory,
    isTrading,
    startTrading,
    stopTrading
  } = useSocket();

  const [priceHistory, setPriceHistory] = useState<any[]>([]);

  // Mock price history for demonstration
  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">GalaDex Trading Bot</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <Button
                onClick={isTrading ? handleStopTrading : handleStartTrading}
                variant={isTrading ? 'destructive' : 'default'}
                className="flex items-center space-x-2"
              >
                {isTrading ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span>{isTrading ? 'Stop Trading' : 'Start Trading'}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trading">Trading</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">${stats.totalProfit.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">+12.5% from last week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">{stats.successfulTrades} of {stats.totalTrades} trades</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.totalVolume.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Traded volume</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalPortfolioValue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Current value</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Price History</CardTitle>
                  <CardDescription>GALA price over the last 24 hours</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={priceHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="price" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Distribution</CardTitle>
                  <CardDescription>Token allocation by value</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={balances}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ token, usdValue }) => `${token}: $${usdValue.toFixed(2)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="usdValue"
                      >
                        {balances.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Trading Tab */}
          <TabsContent value="trading" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Trades */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Trades</CardTitle>
                  <CardDescription>Currently executing trades</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activeTrades.map((trade) => (
                      <div key={trade.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant={trade.action === 'BUY' ? 'default' : 'destructive'}>
                            {trade.action}
                          </Badge>
                          <div>
                            <p className="font-medium">{trade.amount} {trade.token}</p>
                            <p className="text-sm text-gray-500">{trade.reason}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">${trade.price.toFixed(4)}</p>
                          <p className="text-xs text-gray-500">{(trade.confidence * 100).toFixed(0)}% confidence</p>
                        </div>
                      </div>
                    ))}
                    {activeTrades.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No active trades</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Trades */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Trades</CardTitle>
                  <CardDescription>Latest trade history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tradeHistory.map((trade) => (
                      <div key={trade.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant={trade.action === 'BUY' ? 'default' : 'destructive'}>
                            {trade.action}
                          </Badge>
                          <div>
                            <p className="font-medium">{trade.amount} {trade.token}</p>
                            <p className="text-sm text-gray-500">{trade.reason}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            {trade.status === 'FILLED' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : trade.status === 'FAILED' ? (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-500" />
                            )}
                            <span className="text-sm font-medium">${trade.price.toFixed(4)}</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {new Date(trade.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Overview</CardTitle>
                <CardDescription>Your current token holdings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {balances.map((balance) => (
                    <div key={balance.token} className="flex items-center justify-between p-4 border rounded-lg">
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
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Bot Configuration</CardTitle>
                <CardDescription>Configure your trading bot settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Trading Mode</p>
                      <p className="text-sm text-gray-500">Enable or disable automated trading</p>
                    </div>
                    <Button variant={isTrading ? 'destructive' : 'default'} size="sm">
                      {isTrading ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Dry Run Mode</p>
                      <p className="text-sm text-gray-500">Test trades without real execution</p>
                    </div>
                    <Button variant="outline" size="sm">Enable</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Risk Management</p>
                      <p className="text-sm text-gray-500">Configure position sizing and limits</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
