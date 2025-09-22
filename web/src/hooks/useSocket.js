"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSocket = void 0;
const react_1 = require("react");
const socket_io_client_1 = require("socket.io-client");
const useSocket = () => {
    const [socket, setSocket] = (0, react_1.useState)(null);
    const [isConnected, setIsConnected] = (0, react_1.useState)(false);
    const [stats, setStats] = (0, react_1.useState)({
        totalTrades: 0,
        successfulTrades: 0,
        failedTrades: 0,
        winRate: 0,
        totalVolume: 0,
        totalProfit: 0
    });
    const [balances, setBalances] = (0, react_1.useState)([]);
    const [activeTrades, setActiveTrades] = (0, react_1.useState)([]);
    const [tradeHistory, setTradeHistory] = (0, react_1.useState)([]);
    const [isTrading, setIsTrading] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const newSocket = (0, socket_io_client_1.io)('http://localhost:3001');
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
exports.useSocket = useSocket;
