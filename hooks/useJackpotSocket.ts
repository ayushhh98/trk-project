import { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/components/providers/Web3Provider';

type JackpotEventHandlers = {
    onTicketSold?: (data: any) => void;
    onStatusUpdate?: (data: any) => void;
    onDrawComplete?: (data: any) => void;
    onWinnerAnnounced?: (data: any) => void;
    onNewRound?: (data: any) => void;
};

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export function useJackpotSocket(handlers: JackpotEventHandlers = {}) {
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

        const handleTicketSold = (data: any) => {
            handlersRef.current.onTicketSold?.(data);
        };
        const handleStatusUpdate = (data: any) => {
            handlersRef.current.onStatusUpdate?.(data);
        };
        const handleDrawComplete = (data: any) => {
            handlersRef.current.onDrawComplete?.(data);
        };
        const handleWinnerAnnounced = (data: any) => {
            handlersRef.current.onWinnerAnnounced?.(data);
        };
        const handleNewRound = (data: any) => {
            handlersRef.current.onNewRound?.(data);
        };
        const handleLegacyWinner = (data: any) => {
            handlersRef.current.onWinnerAnnounced?.(data);
        };

        socket.on('jackpot:ticket_sold', handleTicketSold);
        socket.on('jackpot:status_update', handleStatusUpdate);
        socket.on('jackpot:draw_complete', handleDrawComplete);
        socket.on('jackpot:winner_announced', handleWinnerAnnounced);
        socket.on('jackpot:new_round', handleNewRound);
        socket.on('lucky_draw_winner', handleLegacyWinner);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('jackpot:ticket_sold', handleTicketSold);
            socket.off('jackpot:status_update', handleStatusUpdate);
            socket.off('jackpot:draw_complete', handleDrawComplete);
            socket.off('jackpot:winner_announced', handleWinnerAnnounced);
            socket.off('jackpot:new_round', handleNewRound);
            socket.off('lucky_draw_winner', handleLegacyWinner);
        };
    }, [socket]);

    return {
        isConnected,
        connectionStatus,
        reconnect: () => socket?.connect(),
        disconnect: () => socket?.disconnect()
    };
}
