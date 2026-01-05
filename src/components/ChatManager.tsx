import React, { useState, useEffect } from 'react';
import ChatWindow from './chat/ChatWindow';
import { supabase } from '@/lib/supabase';

interface ChatRoom {
    roomId: string;
    targetUserName: string;
    targetUserId: string;
}

const ChatManager: React.FC = () => {
    const [openChats, setOpenChats] = useState<ChatRoom[]>([]);

    useEffect(() => {
        // Listen for chat open events from notifications
        const handleOpenChat = async (event: CustomEvent) => {
            const { roomId } = event.detail;

            // Fetch room participants to get the other user's name
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // First, get the participant user_id
                const { data: participants } = await supabase
                    .from('chat_participants')
                    .select('user_id')
                    .eq('room_id', roomId)
                    .neq('user_id', user.id);

                if (participants && participants.length > 0) {
                    const targetUserId = participants[0].user_id;

                    // Then fetch the profile separately
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', targetUserId)
                        .single();

                    const targetUserName = profile?.full_name || 'User';

                    // Mark all chat_message notifications for this room as read
                    await supabase
                        .from('user_notifications')
                        .update({ is_read: true })
                        .eq('user_id', user.id)
                        .eq('type', 'chat_message')
                        .eq('payload->room_id', roomId)
                        .eq('is_read', false);

                    // Check if chat is already open
                    if (!openChats.find(chat => chat.roomId === roomId)) {
                        setOpenChats(prev => [...prev, { roomId, targetUserName, targetUserId }]);
                    }
                }
            } catch (error) {
                console.error('Error opening chat:', error);
            }
        };

        window.addEventListener('openChat', handleOpenChat as EventListener);
        return () => window.removeEventListener('openChat', handleOpenChat as EventListener);
    }, [openChats]);

    const closeChat = (roomId: string) => {
        setOpenChats(prev => prev.filter(chat => chat.roomId !== roomId));
    };

    return (
        <>
            {openChats.map((chat, index) => (
                <div
                    key={chat.roomId}
                    style={{
                        position: 'fixed',
                        bottom: '1rem',
                        right: `${1 + (index * 25)}rem`,
                        zIndex: 1000 + index
                    }}
                >
                    <ChatWindow
                        roomId={chat.roomId}
                        targetUserName={chat.targetUserName}
                        onClose={() => closeChat(chat.roomId)}
                    />
                </div>
            ))}
        </>
    );
};

export default ChatManager;
