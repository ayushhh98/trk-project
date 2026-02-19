'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/components/providers/Web3Provider';
import { notificationsAPI } from '@/lib/api';
import { dedupeByKey, mergeUniqueByKey } from '@/lib/collections';
import { toast } from 'sonner';
import type { Notification } from '../notifications/NotificationItem';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    isPanelOpen: boolean;
    fetchNotifications: (category?: string) => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    openPanel: () => void;
    closePanel: () => void;
    togglePanel: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
}

interface NotificationProviderProps {
    children: React.ReactNode;
    userId?: string | null;
}

export function NotificationProvider({ children, userId }: NotificationProviderProps) {
    const socket = useSocket();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    const fetchNotifications = useCallback(async (category?: string) => {
        if (!userId) return;

        setIsLoading(true);
        try {
            const data = await notificationsAPI.getAll(category);
            if (data?.status === 'success' && data?.data) {
                const incoming = Array.isArray(data.data.notifications) ? data.data.notifications : [];
                setNotifications(dedupeByKey(incoming, (n) => (n?._id) as string));
                setUnreadCount(Number.isFinite(data.data.unreadCount) ? data.data.unreadCount : 0);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    const markAsRead = useCallback(async (id: string) => {
        if (!userId) return;

        try {
            const data = await notificationsAPI.markRead(id);
            if (data?.status === 'success' && data?.data) {
                setUnreadCount(Number.isFinite(data.data.unreadCount) ? data.data.unreadCount : 0);
                setNotifications(prev =>
                    prev.map(n => n._id === id ? { ...n, isRead: true } : n)
                );
            }
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    }, [userId]);

    const markAllAsRead = useCallback(async () => {
        if (!userId) return;

        try {
            const data = await notificationsAPI.markAllRead();
            if (data?.status === 'success') {
                setUnreadCount(0);
                setNotifications(prev =>
                    prev.map(n => ({ ...n, isRead: true }))
                );
                toast.success('All notifications marked as read');
            }
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    }, [userId]);

    const openPanel = useCallback(() => setIsPanelOpen(true), []);
    const closePanel = useCallback(() => setIsPanelOpen(false), []);
    const togglePanel = useCallback(() => setIsPanelOpen(prev => !prev), []);

    // Fetch notifications on mount and when userId changes
    useEffect(() => {
        if (userId) {
            fetchNotifications();
        }
    }, [userId, fetchNotifications]);

    // Socket.IO listener for new notifications
    useEffect(() => {
        if (!userId || !socket) return;
        const activeSocket = socket;

        const handleNotification = (data: { notification: Notification; unreadCount: number }) => {
            setNotifications(prev =>
                mergeUniqueByKey([data.notification], prev, (n) => (n?._id) as string)
            );
            setUnreadCount(data.unreadCount);

            // Show toast notification
            toast.success(data.notification.title, {
                description: data.notification.message,
                duration: 4000
            });

            // Play notification sound (optional)
            // const audio = new Audio('/notification.mp3');
            // audio.play().catch(() => {});
        };

        activeSocket.on('notification', handleNotification);

        return () => {
            if (activeSocket) {
                activeSocket.off('notification', handleNotification);
            }
        };
    }, [userId, socket]);

    const value: NotificationContextType = {
        notifications,
        unreadCount,
        isLoading,
        isPanelOpen,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        openPanel,
        closePanel,
        togglePanel
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}
