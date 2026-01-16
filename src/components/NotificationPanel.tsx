/**
 * NotificationPanel - Display user notifications
 * Dribbble Light Theme
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    reference_id?: string;
    payload?: Record<string, any>;
}

const NotificationPanel: React.FC = () => {
    const { user } = useAuth();
    const { language } = useLanguage();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadNotifications();
        }
    }, [user]);

    const loadNotifications = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('user_notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setNotifications(data || []);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId: string) => {
        try {
            await supabase
                .from('user_notifications')
                .update({ is_read: true })
                .eq('id', notificationId);

            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            );
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const markAllAsRead = async () => {
        if (!user) return;

        try {
            await supabase
                .from('user_notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }
        if (notification.type === 'chat_message' && notification.payload?.room_id) {
            const event = new CustomEvent('openChat', {
                detail: {
                    roomId: notification.payload.room_id,
                    targetUserName: notification.title
                }
            });
            window.dispatchEvent(event);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'chat_message':
                return (
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                );
            case 'like':
                return (
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </div>
                );
            case 'new_user':
                return (
                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                );
            case 'breeding_match':
                return (
                    <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-[#ea4c89]">
                        <span className="text-lg">❤️</span>
                    </div>
                );
            case 'puppy_born':
                return (
                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                        <span className="text-lg">🐾</span>
                    </div>
                );
            default:
                return (
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                );
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return language === 'th' ? 'เมื่อกี้' : 'Just now';
        if (minutes < 60) return language === 'th' ? `${minutes} นาทีที่แล้ว` : `${minutes}m ago`;
        if (hours < 24) return language === 'th' ? `${hours} ชั่วโมงที่แล้ว` : `${hours}h ago`;
        if (days < 7) return language === 'th' ? `${days} วันที่แล้ว` : `${days}d ago`;
        return date.toLocaleDateString();
    };

    if (!user) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-[#0d0c22] mb-2">
                    {language === 'th' ? 'กรุณาเข้าสู่ระบบ' : 'Sign in required'}
                </h3>
                <p className="text-gray-500 text-sm">
                    {language === 'th' ? 'เข้าสู่ระบบเพื่อดูการแจ้งเตือนของคุณ' : 'Sign in to view your notifications'}
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#0d0c22]">
                    {language === 'th' ? 'การแจ้งเตือน' : 'Notifications'}
                </h2>
                {notifications.some(n => !n.is_read) && (
                    <button
                        onClick={markAllAsRead}
                        className="text-sm font-bold text-[#ea4c89] hover:underline transition-colors"
                    >
                        {language === 'th' ? 'อ่านทั้งหมด' : 'Mark all as read'}
                    </button>
                )}
            </div>

            {/* Notifications List */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-[#ea4c89] border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
            ) : notifications.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-[#0d0c22] mb-2">
                        {language === 'th' ? 'ไม่มีการแจ้งเตือน' : 'No notifications yet'}
                    </h3>
                    <p className="text-gray-500 text-sm">
                        {language === 'th' ? 'การแจ้งเตือนใหม่จะปรากฏที่นี่' : 'New notifications will appear here'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map(notification => (
                        <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`
                flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer
                ${notification.is_read
                                    ? 'bg-white border-gray-100 hover:border-gray-200'
                                    : 'bg-white border-blue-100 shadow-sm shadow-blue-50 hover:shadow-md'
                                }
              `}
                        >
                            {getNotificationIcon(notification.type)}

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className={`font-bold text-sm truncate ${notification.is_read ? 'text-gray-600' : 'text-[#0d0c22]'}`}>
                                        {notification.title}
                                    </h4>
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap font-medium">
                                        {formatTime(notification.created_at)}
                                    </span>
                                </div>
                                <p className={`text-sm mt-1 leading-relaxed ${notification.is_read ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {notification.message}
                                </p>

                                {/* Reply button for chat messages */}
                                {notification.type === 'chat_message' && notification.payload?.room_id && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleNotificationClick(notification);
                                        }}
                                        className="mt-3 px-4 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-full hover:bg-blue-100 transition-colors"
                                    >
                                        {language === 'th' ? 'ตอบกลับ' : 'Reply'}
                                    </button>
                                )}
                            </div>

                            {!notification.is_read && (
                                <div className="w-2 h-2 rounded-full bg-[#ea4c89] shrink-0 mt-2 shadow-sm shadow-pink-200"></div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NotificationPanel;
