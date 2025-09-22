import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface TradingStats {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  winRate: number;
  totalVolume: number;
  totalProfit: number;
}

interface BalanceInfo {
  token: string;
  balance: number;
  usdValue: number;
  lastUpdated: number;
}

interface TradeExecution {
  id: string;
  token: string;
  action: 'BUY' | 'SELL';
  amount: number;
  price: number;
  confidence: number;
  reason: string;
  timestamp: number;
  status: 'PENDING' | 'FILLED' | 'FAILED';
  txHash?: string;
}

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState<TradingStats>({
    totalTrades: 0,
    successfulTrades: 0,
    failedTrades: 0,
    winRate: 0,
    totalVolume: 0,
    totalProfit: 0
  });
  const [balances, setBalances] = useState<BalanceInfo[]>([]);
  const [activeTrades, setActiveTrades] = useState<TradeExecution[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeExecution[]>([]);
  const [isTrading, setIsTrading] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('initialData', (data) => {
      setStats(data.stats);
      setBalances(data.balances);
      setActiveTrades(data.activeTrades);
      setTradeHistory(data.tradeHistory);
      setIsTrading(data.isTrading);
    });

    newSocket.on('tradingStatusChanged', (data) => {
      setIsTrading(data.isTrading);
    });

    newSocket.on('newTrade', (trade) => {
      setActiveTrades(prev => [...prev, trade]);
    });

    newSocket.on('tradeCompleted', (data) => {
      setActiveTrades(prev => prev.filter(t => t.id !== data.trade.id));
      setTradeHistory(prev => [data.trade, ...prev.slice(0, 49)]);
      setStats(data.stats);
      setBalances(data.balances);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const startTrading = () => {
    if (socket) {
      socket.emit('startTrading');
    }
  };

  const stopTrading = () => {
    if (socket) {
      socket.emit('stopTrading');
    }
  };

  return {
    socket,
    isConnected,
    stats,
    balances,
    activeTrades,
    tradeHistory,
    isTrading,
    startTrading,
    stopTrading
  };
};
