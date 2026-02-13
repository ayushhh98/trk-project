import { useEffect, useRef, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { getToken } from '@/lib/api';

type AdminEventHandlers = {
    onStatsUpdate?: (data: any) => void;
};

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export function useAdminSocket(handlers: AdminEventHandlers = {}) {
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const socketRef = useRef<Socket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);
    const MAX_RECONNECT_ATTEMPTS = 5;
    const connectRef = useRef<() => void>(() => {});

    const resolveApiBaseUrl = () => {
        const envUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || '';
        if (typeof window === 'undefined') {
            return envUrl || 'http://localhost:5000';
        }

        const host = window.location.hostname;
        const protocol = window.location.protocol;
        const isLocalEnv = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(envUrl);
        const isLocalHost = host === 'localhost' || host === '127.0.0.1';

        if (!envUrl) {
            return `${protocol}//${host}:5000`;
        }

        if (isLocalEnv && !isLocalHost) {
            return `${protocol}//${host}:5000`;
        }

        return envUrl;
    };

    const handleReconnect = useCallback(() => {
        if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
            console.warn('⚠️ Max reconnection attempts reached');
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;

        reconnectTimeoutRef.current = setTimeout(() => {
            if (!socketRef.current?.connected) {
                connectRef.current();
            }
        }, delay);
    }, []);

    const connect = useCallback(() => {
        if (socketRef.current?.connected) return;

        setConnectionStatus('connecting');

        const apiUrl = resolveApiBaseUrl();
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
            console.log('🛡️ Admin WebSocket connected');
            setIsConnected(true);
            setConnectionStatus('connected');
            reconnectAttempts.current = 0;

            // Join admin room
            socket.emit('admin:join');
        });

        socket.on('disconnect', (reason) => {
            console.log('❌ Admin WebSocket disconnected:', reason);
            setIsConnected(false);
            setConnectionStatus('disconnected');

            if (reason === 'io server disconnect') {
                handleReconnect();
            }
        });

        socket.on('connect_error', (error) => {
            console.error('🔴 Admin WebSocket connection error:', error.message, `(${apiUrl})`);
            setConnectionStatus('disconnected');
            handleReconnect();
        });

        // Admin event listeners
        socket.on('admin:stats_update', (data) => {
            handlers.onStatsUpdate?.(data);
        });

    }, [handlers, handleReconnect]);


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

    useEffect(() => {
        connectRef.current = connect;
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        isConnected,
        connectionStatus,
        reconnect: connect,
        disconnect
    };
}
