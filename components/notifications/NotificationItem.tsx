'use client';

import { X, CheckCircle, Shield, Coins, Bell, ExternalLink, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export interface Notification {
    _id: string;
    type: string;
    category: 'transaction' | 'security' | 'system';
    title: string;
    message: string;
    icon?: string;
    actionUrl?: string | null;
    actionLabel?: string | null;
    metadata?: any;
    isRead: boolean;
    createdAt: string;
}

interface NotificationItemProps {
    notification: Notification;
    onMarkAsRead: (id: string) => void;
}

function getNotificationIcon(icon?: string, type?: string) {
    switch (icon) {
        case 'coins':
            return <Coins className="h-5 w-5" />;
        case 'shield':
            return <Shield className="h-5 w-5" />;
        case 'check':
            return <CheckCircle className="h-5 w-5" />;
        case 'zap':
            return <Zap className="h-5 w-5" />;
        default:
            return <Bell className="h-5 w-5" />;
    }
}

function getIconColorClass(category: string) {
    switch (category) {
        case 'transaction':
            return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400';
        case 'security':
            return 'bg-red-500/20 border-red-500/30 text-red-400';
        case 'system':
            return 'bg-blue-500/20 border-blue-500/30 text-blue-400';
        default:
            return 'bg-white/10 border-white/20 text-white';
    }
}

function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
    const handleClick = () => {
        if (!notification.isRead) {
            onMarkAsRead(notification._id);
        }
    };

    return (
        <div
            className={cn(
                "p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer relative",
                !notification.isRead && "bg-white/5"
            )}
            onClick={handleClick}
        >
            <div className="flex items-start gap-3">
                <div className={cn(
                    "h-10 w-10 rounded-xl border flex items-center justify-center flex-shrink-0",
                    getIconColorClass(notification.category)
                )}>
                    {getNotificationIcon(notification.icon, notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-bold text-white">
                            {notification.title}
                        </h4>
                        <span className="text-xs text-white/40 whitespace-nowrap">
                            {formatTimeAgo(notification.createdAt)}
                        </span>
                    </div>

                    <p className="text-xs text-white/60 mb-2">
                        {notification.message}
                    </p>

                    {notification.actionUrl && notification.actionLabel && (
                        <Link
                            href={notification.actionUrl}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                            {notification.actionLabel}
                            <ExternalLink className="h-3 w-3" />
                        </Link>
                    )}
                </div>

                {!notification.isRead && (
                    <div className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0 mt-2" />
                )}
            </div>
        </div>
    );
}
