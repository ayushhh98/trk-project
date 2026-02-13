import { useEffect, useRef, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { getToken } from '@/lib/api';

type JackpotEventHandlers = {
    onTicketSold?: (data: any) => void;
    onStatusUpdate?: (data: any) => void;
    onDrawComplete?: (data: any) => void;
    onWinnerAnnounced?: (data: any) => void;
    onNewRound?: (data: any) => void;
};

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export function useJackpotSocket(handlers: JackpotEventHandlers = {}) {
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const socketRef = useRef<Socket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);
    const MAX_RECONNECT_ATTEMPTS = 5;
    const connectRef = useRef<() => void>(() => {});

    // Store handlers in a ref to avoid dependency cycles
    const handlersRef = useRef(handlers);

    // Update handlers ref whenever they change
    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    const handleReconnect = useCallback(() => {
        if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
            console.warn('⚠️ Max reconnection attempts reached');
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;

        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`);

        reconnectTimeoutRef.current = setTimeout(() => {
            // Check if socket is still disconnected before trying to connect
            // and ensure we don't have an active connection attempt
            if (!socketRef.current?.connected) {
                connectRef.current();
            }
        }, delay);
    }, []);

    const connect = useCallback(() => {
        if (socketRef.current?.connected) return;

        setConnectionStatus('connecting');

        const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5000';
        const token = getToken();

        socketRef.current = io(apiUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
            timeout: 10000
        });

        const socket = socketRef.current;

        // Connection event handlers
        socket.on('connect', () => {
            console.log('🔌 Jackpot WebSocket connected');
            setIsConnected(true);
            setConnectionStatus('connected');
            reconnectAttempts.current = 0;
        });

        socket.on('disconnect', (reason) => {
            console.log('❌ Jackpot WebSocket disconnected:', reason);
            setIsConnected(false);
            setConnectionStatus('disconnected');

            // Auto-reconnect with exponential backoff
            if (reason === 'io server disconnect') {
                // Server forced disconnect, try to reconnect manually
                handleReconnect();
            }
        });

        socket.on('connect_error', (error) => {
            console.error('🔴 Jackpot WebSocket connection error:', error.message);
            setConnectionStatus('disconnected');
            handleReconnect();
        });

        // Jackpot event listeners using the ref
        socket.on('jackpot:ticket_sold', (data) => {
            handlersRef.current.onTicketSold?.(data);
        });

        socket.on('jackpot:status_update', (data) => {
            handlersRef.current.onStatusUpdate?.(data);
        });

        socket.on('jackpot:draw_complete', (data) => {
            handlersRef.current.onDrawComplete?.(data);
        });

        socket.on('jackpot:winner_announced', (data) => {
            handlersRef.current.onWinnerAnnounced?.(data);
        });

        socket.on('jackpot:new_round', (data) => {
            handlersRef.current.onNewRound?.(data);
        });

        // Legacy event for backward compatibility
        socket.on('lucky_draw_winner', (data) => {
            handlersRef.current.onWinnerAnnounced?.(data);
        });

    }, [handleReconnect]);


    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (socketRef.current) {
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        setIsConnected(false);
        setConnectionStatus('disconnected');
    }, []);

    // Auto-connect on mount
    useEffect(() => {
        connectRef.current = connect;
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    // Heartbeat to keep connection alive
    useEffect(() => {
        if (!isConnected) return;

        const heartbeat = setInterval(() => {
            if (socketRef.current?.connected) {
                socketRef.current.emit('ping');
            }
        }, 30000); // Every 30 seconds

        return () => clearInterval(heartbeat);
    }, [isConnected]);

    return {
        isConnected,
        connectionStatus,
        reconnect: connect,
        disconnect
    };
}
