'use client';

import { useState, useEffect } from 'react';
import { X, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { NotificationItem, type Notification } from './NotificationItem';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: Notification[];
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
}

export function NotificationPanel({
    isOpen,
    onClose,
    notifications,
    onMarkAsRead,
    onMarkAllAsRead
}: NotificationPanelProps) {
    const [activeFilter, setActiveFilter] = useState<'all' | 'transaction' | 'security' | 'system'>('all');

    const filteredNotifications = activeFilter === 'all'
        ? notifications
        : notifications.filter(n => n.category === activeFilter);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const filters = [
        { key: 'all' as const, label: 'All' },
        { key: 'transaction' as const, label: 'Transactions' },
        { key: 'security' as const, label: 'Security' },
        { key: 'system' as const, label: 'System' }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-full sm:w-[450px] bg-black/95 border-l border-white/10 z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-black text-white uppercase tracking-wider">
                                    Notifications
                                </h2>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={onClose}
                                    >
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Filter Tabs */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                                {filters.map((filter) => (
                                    <button
                                        key={filter.key}
                                        onClick={() => setActiveFilter(filter.key)}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all",
                                            activeFilter === filter.key
                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                : "bg-white/5 text-white/60 hover:bg-white/10 border border-transparent"
                                        )}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        {unreadCount > 0 && (
                            <div className="px-6 py-3 border-b border-white/5 bg-white/5">
                                <button
                                    onClick={onMarkAllAsRead}
                                    className="flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                                >
                                    <Volume2 className="h-3.5 w-3.5" />
                                    Mark all as read
                                </button>
                            </div>
                        )}

                        {/* Notifications List */}
                        <div className="flex-1 overflow-y-auto">
                            {filteredNotifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                    <div className="h-16 w-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                                        <Volume2 className="h-8 w-8 text-white/20" />
                                    </div>
                                    <p className="text-sm font-bold text-white/40">No notifications</p>
                                    <p className="text-xs text-white/20 mt-1">
                                        {activeFilter !== 'all'
                                            ? `No ${activeFilter} notifications yet`
                                            : "You're all caught up!"
                                        }
                                    </p>
                                </div>
                            ) : (
                                filteredNotifications.map((notification) => (
                                    <NotificationItem
                                        key={notification._id}
                                        notification={notification}
                                        onMarkAsRead={onMarkAsRead}
                                    />
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {filteredNotifications.length > 0 && (
                            <div className="p-4 border-t border-white/10 bg-white/5">
                                <button className="w-full text-xs font-bold text-white/60 hover:text-white/80 transition-colors">
                                    View all notifications →
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
