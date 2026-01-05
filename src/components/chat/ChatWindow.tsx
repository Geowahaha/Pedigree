import React, { useState, useEffect, useRef } from 'react';
import { getChatMessages, sendMessage, subscribeToChat, ChatMessage } from '@/lib/database';
import { useAuth } from '@/contexts/AuthContext';

interface ChatWindowProps {
    roomId: string;
    targetUserName: string;
    onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ roomId, targetUserName, onClose }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load initial
        getChatMessages(roomId).then(setMessages);

        // Subscribe to real-time
        const subscription = subscribeToChat(roomId, (payload) => {
            const newMsg = payload.new as ChatMessage;
            setMessages(prev => [...prev, newMsg]);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [roomId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await sendMessage(roomId, newMessage);
            setNewMessage('');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 w-80 sm:w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
            {/* Header */}
            <div className="p-4 bg-[#8B9D83] flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                        {targetUserName.charAt(0)}
                    </div>
                    <div>
                        <h4 className="font-bold text-sm">{targetUserName}</h4>
                        <p className="text-[10px] text-white/80 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            Online
                        </p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F5F1E8]/30">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 text-xs py-8">
                        Start the conversation with {targetUserName}!
                    </div>
                )}
                {messages.map(msg => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'bg-[#C97064] text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-sm'}`}>

                                {msg.message_type === 'pet_card' && msg.metadata ? (
                                    <div className="mb-2 bg-white/10 rounded-lg overflow-hidden border border-white/20 p-3">
                                        <div className="flex flex-col">
                                            <p className="text-white font-bold text-sm">{msg.metadata.petName}</p>
                                            <p className="text-white/80 text-xs">{msg.metadata.petBreed}</p>
                                        </div>
                                        <div className="mt-2 text-xs opacity-90 border-t border-white/20 pt-2">
                                            {msg.content}
                                        </div>
                                    </div>
                                ) : (
                                    <p>{msg.content}</p>
                                )}

                                {isMe && (
                                    <div className="flex items-center justify-end gap-1 mt-1">
                                        <span className="text-[10px] opacity-70">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {msg.is_read ? (
                                            <svg className="w-3 h-3 opacity-70" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                                                <path d="M12.707 5.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-3 h-3 opacity-70" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                                            </svg>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#8B9D83]/20 text-sm"
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-2.5 rounded-xl bg-[#8B9D83] text-white disabled:opacity-50 hover:bg-[#7A8C72] transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
            </form>
        </div>
    );
};

export default ChatWindow;
