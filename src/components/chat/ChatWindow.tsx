import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getChatMessages, sendMessage, subscribeToChat, ChatMessage, markMessagesAsRead } from '@/lib/database';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';

interface ChatWindowProps {
    roomId: string;
    targetUserName: string;
    initialMessage?: string;
    petInfo?: { id: string; name: string; breed: string; image: string };
    onClose: () => void;
}

type SuggestionCatalog = {
    id: string;
    keywords: { th: string[]; en: string[] };
    templates: { th: string[]; en: string[] };
};

const THAI_CHAR_REGEX = /[ก-๙]/;

const normalizeText = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9ก-๙\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const levenshtein = (a: string, b: string) => {
    const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i += 1) {
        for (let j = 1; j <= b.length; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[a.length][b.length];
};

const isSimilarToken = (token: string, keyword: string) => {
    if (token === keyword) return true;
    if (token.length < 3 || keyword.length < 3) return false;
    if (token.startsWith(keyword) || keyword.startsWith(token)) return true;
    return levenshtein(token, keyword) <= 2;
};

const SUGGESTION_CATALOG: SuggestionCatalog[] = [
    {
        id: 'availability',
        keywords: {
            th: ['ยังมี', 'มีไหม', 'ว่างไหม', 'พร้อมไหม', 'ขายไหม'],
            en: ['available', 'avail', 'availble', 'avaiable', 'in stock', 'still available']
        },
        templates: {
            th: ['{pet} ยังว่างไหมครับ?', 'ขอจอง {pet} ได้ไหมครับ?'],
            en: ['Is {pet} still available?', 'Can I reserve {pet}?']
        }
    },
    {
        id: 'price',
        keywords: {
            th: ['ราคา', 'เท่าไหร่', 'ค่าตัว', 'เรท'],
            en: ['price', 'cost', 'how much', 'prcie', 'prize']
        },
        templates: {
            th: ['ขอราคา/เงื่อนไขได้ไหมครับ?', 'ราคา {pet} เท่าไหร่ครับ?'],
            en: ['What is the price and conditions?', 'How much is {pet}?']
        }
    },
    {
        id: 'health',
        keywords: {
            th: ['วัคซีน', 'สุขภาพ', 'ตรวจสุขภาพ', 'ฉีดวัคซีน', 'ใบตรวจ'],
            en: ['vaccine', 'vaccination', 'vaccin', 'health', 'medical', 'shots']
        },
        templates: {
            th: ['มีใบตรวจสุขภาพ/วัคซีนไหมครับ?', 'สุขภาพทั่วไปเป็นอย่างไรบ้างครับ?'],
            en: ['Do you have vaccination or health records?', 'How is {pet}\'s health?']
        }
    },
    {
        id: 'documents',
        keywords: {
            th: ['ใบเพ็ด', 'ทะเบียน', 'เอกสาร', 'ใบรับรอง'],
            en: ['pedigree', 'papers', 'certificate', 'registration', 'register', 'cert']
        },
        templates: {
            th: ['มีใบเพ็ดหรือเลขทะเบียนไหมครับ?', 'ขอดูเอกสารประกอบได้ไหมครับ?'],
            en: ['Do you have pedigree papers or registration?', 'Can I see the documents?']
        }
    },
    {
        id: 'location',
        keywords: {
            th: ['อยู่ที่ไหน', 'นัดดู', 'นัดรับ', 'ส่งไหม', 'ที่ไหน'],
            en: ['location', 'where', 'pickup', 'address', 'ship', 'delivery']
        },
        templates: {
            th: ['สะดวกนัดดูที่ไหนครับ?', 'มีบริการส่งไหมครับ?'],
            en: ['Where are you located for pickup?', 'Do you offer delivery?']
        }
    },
    {
        id: 'reservation',
        keywords: {
            th: ['จอง', 'มัดจำ', 'คิว', 'จองคิว'],
            en: ['reserve', 'booking', 'deposit', 'hold']
        },
        templates: {
            th: ['ถ้าจองต้องมัดจำเท่าไหร่ครับ?', 'ขั้นตอนการจองเป็นอย่างไรครับ?'],
            en: ['What is the deposit to reserve?', 'How does the reservation process work?']
        }
    }
];

const detectSuggestionLanguage = (input: string, fallback: 'th' | 'en') => {
    if (THAI_CHAR_REGEX.test(input)) return 'th';
    if (/[a-z]/i.test(input)) return 'en';
    return fallback;
};

const buildSuggestions = (
    input: string,
    petInfo: ChatWindowProps['petInfo'],
    fallbackLanguage: 'th' | 'en'
) => {
    const cleaned = normalizeText(input);
    const language = detectSuggestionLanguage(input, fallbackLanguage);
    const petLabel = petInfo?.name || (language === 'th' ? 'น้อง' : 'this pet');

    const applyTemplates = (templates: string[]) =>
        templates.map(template => template.replace('{pet}', petLabel));

    if (!cleaned) {
        return language === 'th'
            ? applyTemplates(['สวัสดีครับ สนใจ {pet} ครับ', 'ขอดูรูป/วิดีโอเพิ่มเติมได้ไหมครับ?', 'สะดวกติดต่อทางไหนได้บ้างครับ?'])
            : applyTemplates(['Hi! I\'m interested in {pet}.', 'Can I see more photos or videos?', 'What is the best way to contact you?']);
    }

    const tokens = cleaned.split(' ').filter(Boolean);
    const matches = (keywords: SuggestionCatalog['keywords']) => {
        if (language === 'th') {
            return keywords.th.some(keyword => {
                if (cleaned.includes(keyword)) return true;
                if (!keyword) return false;
                if (tokens.some(token => isSimilarToken(token, keyword))) return true;
                if (cleaned.length >= keyword.length - 4 && cleaned.length <= keyword.length + 4) {
                    return isSimilarToken(cleaned, keyword);
                }
                return false;
            });
        }
        return keywords.en.some(keyword => {
            if (cleaned.includes(keyword)) return true;
            if (keyword.includes(' ')) return false;
            return tokens.some(token => isSimilarToken(token, keyword));
        });
    };

    const suggestions: string[] = [];
    SUGGESTION_CATALOG.forEach(item => {
        if (matches(item.keywords)) {
            suggestions.push(...applyTemplates(item.templates[language]));
        }
    });

    if (suggestions.length === 0) {
        suggestions.push(
            ...(language === 'th'
                ? applyTemplates(['ขอข้อมูลเพิ่มเติมเกี่ยวกับ {pet} ได้ไหมครับ?', 'สะดวกนัดดูตัวได้ไหมครับ?'])
                : applyTemplates(['Could you share more details about {pet}?', 'Is it possible to schedule a viewing?']))
        );
    }

    return Array.from(new Set(suggestions)).slice(0, 4);
};

const ChatWindow: React.FC<ChatWindowProps> = ({ roomId, targetUserName, initialMessage, petInfo, onClose }) => {
    const { user } = useAuth();
    const { language } = useLanguage();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [hasSentInitial, setHasSentInitial] = useState(false);
    const [hasLoadedMessages, setHasLoadedMessages] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const smartSuggestions = useMemo(
        () => buildSuggestions(newMessage, petInfo, language === 'en' ? 'en' : 'th'),
        [newMessage, petInfo, language]
    );

    const markChatRead = useCallback(async () => {
        if (!user) return;
        await markMessagesAsRead(roomId);
        await supabase
            .from('user_notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('type', 'chat_message')
            .eq('payload->room_id', roomId)
            .eq('is_read', false);
    }, [roomId, user]);

    useEffect(() => {
        let isMounted = true;
        // Load initial
        getChatMessages(roomId).then((data) => {
            if (!isMounted) return;
            setMessages(data);
            setHasLoadedMessages(true);
        });

        // Subscribe to real-time
        const subscription = subscribeToChat(roomId, (payload) => {
            const newMsg = payload.new as ChatMessage;
            setMessages(prev => [...prev, newMsg]);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [roomId]);

    useEffect(() => {
        if (!hasLoadedMessages) return;
        markChatRead();
    }, [hasLoadedMessages, markChatRead]);

    useEffect(() => {
        if (!user || messages.length === 0) return;
        const latest = messages[messages.length - 1];
        if (latest.sender_id !== user.id) {
            markChatRead();
        }
    }, [messages, user, markChatRead]);

    // Auto-send initial message about pet
    useEffect(() => {
        if (initialMessage && !hasSentInitial && hasLoadedMessages && messages.length === 0) {
            const timer = setTimeout(async () => {
                try {
                    await sendMessage(roomId, initialMessage, petInfo ? 'pet_card' : 'text',
                        petInfo ? { petId: petInfo.id, petName: petInfo.name, petBreed: petInfo.breed, petImage: petInfo.image } : undefined
                    );
                    setHasSentInitial(true);
                } catch (error) {
                    console.error('Failed to send initial message:', error);
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [initialMessage, hasSentInitial, hasLoadedMessages, messages.length, roomId, petInfo]);

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

    const handleSuggestionSend = async (suggestion: string) => {
        if (!suggestion.trim()) return;
        try {
            await sendMessage(roomId, suggestion);
            setNewMessage('');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 w-80 sm:w-96 h-[500px] bg-[#0D0D0D] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[#C5A059]/20 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
            {/* Header */}
            <div className="p-4 bg-[#1A1A1A] border-b border-[#C5A059]/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C5A059] to-[#8B7355] flex items-center justify-center text-[#0A0A0A] font-bold">
                        {targetUserName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h4 className="font-medium text-[#F5F5F0] text-sm">{targetUserName}</h4>
                        <p className="text-[10px] text-[#C5A059] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            Online
                        </p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-[#B8B8B8] hover:text-[#F5F5F0] hover:bg-[#C5A059]/10 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Pet Info Banner (if present) */}
            {petInfo && (
                <div className="px-4 py-2 bg-[#C5A059]/10 border-b border-[#C5A059]/20 flex items-center gap-3">
                    {petInfo.image && (
                        <img src={petInfo.image} alt={petInfo.name} className="w-10 h-10 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#C5A059]/60 uppercase tracking-wider">Asking about</p>
                        <p className="text-sm font-bold text-[#C5A059] truncate">{petInfo.name}</p>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0A0A0A]">
                {messages.length === 0 && !initialMessage && (
                    <div className="text-center text-[#B8B8B8]/50 text-xs py-8">
                        Start the conversation with {targetUserName}!
                    </div>
                )}
                {messages.map(msg => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${isMe
                                ? 'bg-[#C5A059] text-[#0A0A0A] rounded-tr-none'
                                : 'bg-[#1A1A1A] text-[#F5F5F0] border border-[#C5A059]/10 rounded-tl-none'
                                }`}>

                                {msg.message_type === 'pet_card' && msg.metadata ? (
                                    <div className={`mb-2 rounded-lg overflow-hidden border p-3 ${isMe ? 'bg-[#0A0A0A]/20 border-[#0A0A0A]/30' : 'bg-[#C5A059]/10 border-[#C5A059]/20'}`}>
                                        <div className="flex items-center gap-2">
                                            {msg.metadata.petImage && (
                                                <img src={msg.metadata.petImage} alt={msg.metadata.petName} className="w-8 h-8 rounded-lg object-cover" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-bold text-sm truncate ${isMe ? 'text-[#0A0A0A]' : 'text-[#C5A059]'}`}>{msg.metadata.petName}</p>
                                                <p className={`text-xs truncate ${isMe ? 'text-[#0A0A0A]/70' : 'text-[#B8B8B8]'}`}>{msg.metadata.petBreed}</p>
                                            </div>
                                        </div>
                                        <div className={`mt-2 text-xs border-t pt-2 ${isMe ? 'border-[#0A0A0A]/20' : 'border-[#C5A059]/20'}`}>
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
            <div className="bg-[#1A1A1A] border-t border-[#C5A059]/10">
                {smartSuggestions.length > 0 && (
                    <div className="px-4 pt-3 pb-1">
                        <p className="text-[10px] text-[#C5A059]/60 uppercase tracking-wider mb-2">
                            {language === 'th' ? 'คำแนะนำ' : 'Suggestions'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {smartSuggestions.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => handleSuggestionSend(suggestion)}
                                    className="px-3 py-1.5 text-xs rounded-full bg-[#0A0A0A] border border-[#C5A059]/20 text-[#F5F5F0] hover:border-[#C5A059]/50 hover:text-white transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <form onSubmit={handleSend} className="p-3 flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2.5 rounded-full bg-[#0A0A0A] border border-white/5 text-[#F5F5F0] placeholder:text-[#B8B8B8]/30 focus:border-white/10 focus:shadow-[0_0_20px_rgba(197,160,89,0.1)] focus:outline-none focus-visible:!shadow-none text-sm caret-[#C5A059] transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="p-2.5 rounded-full bg-[#C5A059] text-[#0A0A0A] disabled:opacity-30 hover:bg-[#D4C4B5] transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatWindow;
