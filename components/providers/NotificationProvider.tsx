'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { socket } from '@/components/providers/Web3Provider';
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
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    const fetchNotifications = useCallback(async (category?: string) => {
        if (!userId) return;

        setIsLoading(true);
        try {
            const categoryParam = category && category !== 'all' ? `?category=${category}` : '';
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications${categoryParam}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setNotifications(data.data.notifications);
                setUnreadCount(data.data.unreadCount);
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
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${id}/read`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUnreadCount(data.data.unreadCount);

                // Update local state
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
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/read-all`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
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

        const handleNotification = (data: { notification: Notification; unreadCount: number }) => {
            setNotifications(prev => [data.notification, ...prev]);
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

        socket.on('notification', handleNotification);

        return () => {
            socket.off('notification', handleNotification);
        };
    }, [userId]);

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
