import { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/components/providers/Web3Provider';

type AdminEventHandlers = {
    onStatsUpdate?: (data: any) => void;
};

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export function useAdminSocket(handlers: AdminEventHandlers = {}) {
    const socket = useSocket();
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const handlersRef = useRef(handlers);

    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    useEffect(() => {
        if (!socket) {
            setIsConnected(false);
            setConnectionStatus('disconnected');
            return;
        }

        const handleConnect = () => {
            setIsConnected(true);
            setConnectionStatus('connected');
        };

        const handleDisconnect = () => {
            setIsConnected(false);
            setConnectionStatus('disconnected');
        };

        setIsConnected(!!socket.connected);
        setConnectionStatus(socket.connected ? 'connected' : 'connecting');

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);

        const handleStatsUpdate = (data: any) => {
            handlersRef.current.onStatsUpdate?.(data);
        };

        socket.on('admin:stats_update', handleStatsUpdate);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('admin:stats_update', handleStatsUpdate);
        };
    }, [socket]);

    return {
        isConnected,
        connectionStatus,
        reconnect: () => socket?.connect(),
        disconnect: () => socket?.disconnect()
    };
}
