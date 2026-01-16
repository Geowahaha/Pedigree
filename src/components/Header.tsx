
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getUserNotifications, markUserNotifRead, UserNotification } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { EibpoMark } from '@/components/branding/EibpoLogo';
import LanguageToggle from '@/components/LanguageToggle';

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
  activeSection: string;
  onNavigate: (section: string) => void;
  onAuthClick: () => void;
  onDashboardClick: () => void;
  onAdminClick: () => void;
  onMyPetsClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ cartCount, onCartClick, activeSection, onNavigate, onAuthClick, onDashboardClick, onAdminClick, onMyPetsClick }) => {
  const { user, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Notification System
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);

  // Track scroll for header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user) {
      getUserNotifications(user.id).then(data => {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      });

      const channel = supabase
        .channel('user-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            getUserNotifications(user.id).then(data => {
              setNotifications(data);
              setUnreadCount(data.filter(n => !n.is_read).length);
            });
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [user]);

  const navItems = [
    { id: 'home', label: t('nav.home') },
    { id: 'pedigree', label: t('nav.pedigree') },
    { id: 'search', label: t('nav.breeding') },
    { id: 'marketplace', label: t('nav.marketplace') },
  ];

  const scrollToSection = (sectionId: string) => {
    onNavigate(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled
        ? 'bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-[#C5A059]/20'
        : 'bg-transparent border-b border-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 lg:h-24">

          {/* Logo - Luxury Style */}
          <div
            className="flex items-center gap-2 sm:gap-4 cursor-pointer group min-h-[48px]"
            onClick={() => scrollToSection('home')}
          >
            {/* Minimal Gold Icon */}
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
              <div className="absolute inset-0 border border-[#C5A059]/40 rotate-45 group-hover:rotate-[50deg] transition-transform duration-500" />
              <EibpoMark className="w-4 h-4 sm:w-5 sm:h-5 text-[#C5A059]" />
            </div>

            {/* Logo Text - Serif Typography */}
            <div className="flex flex-col">
              <span className="font-['Playfair_Display',_Georgia,_serif] text-lg sm:text-xl lg:text-2xl tracking-wide text-[#F5F5F0] group-hover:text-[#C5A059] transition-colors duration-300">
                Eibpo<span className="text-[#C5A059] hidden xs:inline"> Pedigree</span>
              </span>
              <span className="text-[7px] sm:text-[8px] lg:text-[9px] tracking-[0.2em] sm:tracking-[0.3em] text-[#C5A059]/60 uppercase font-light hidden sm:block">
                Premium Bloodlines
              </span>
            </div>
          </div>

          {/* Desktop Navigation - Minimal Luxury */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`relative px-5 py-2 text-xs tracking-[0.15em] uppercase font-medium transition-all duration-300 ${activeSection === item.id
                  ? 'text-[#C5A059]'
                  : 'text-[#B8B8B8] hover:text-[#F5F5F0]'
                  }`}
              >
                {item.label}
                {/* Active indicator - thin gold line */}
                <span
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-px bg-[#C5A059] transition-all duration-300 ${activeSection === item.id ? 'w-full opacity-100' : 'w-0 opacity-0'
                    }`}
                />
              </button>
            ))}
          </nav>

          {/* Language Toggle - Smooth Animated */}
          <div className="hidden md:flex items-center mr-4">
            <LanguageToggle compact />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4">

            {/* Notifications - Luxury Style */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowNotif(!showNotif)}
                  className="relative p-2 sm:p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#B8B8B8] hover:text-[#C5A059] transition-colors duration-300 touch-target"
                >
                  <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 sm:top-1 sm:right-1 w-2.5 h-2.5 sm:w-2 sm:h-2 bg-[#C5A059] rounded-full" />
                  )}
                </button>

                {/* Notification Dropdown - Luxury Dark */}
                {showNotif && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowNotif(false)} />
                    <div className="absolute right-0 mt-4 w-80 bg-[#1A1A1A] border border-[#C5A059]/20 shadow-2xl z-20 overflow-hidden">
                      <div className="p-4 border-b border-[#C5A059]/10 flex justify-between items-center">
                        <h3 className="text-[10px] tracking-[0.2em] uppercase font-medium text-[#C5A059]">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="px-2 py-1 bg-[#C5A059] text-[#0A0A0A] text-[9px] tracking-wider font-bold">{unreadCount} NEW</span>
                        )}
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-[#B8B8B8]/50 text-xs">
                            No notifications
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              className={`p-4 border-b border-[#C5A059]/5 hover:bg-[#C5A059]/5 cursor-pointer transition-colors ${!n.is_read ? 'bg-[#C5A059]/10' : ''}`}
                              onClick={() => {
                                if (!n.is_read) {
                                  markUserNotifRead(n.id);
                                  setNotifications(prev => prev.map(p => p.id === n.id ? { ...p, is_read: true } : p));
                                  setUnreadCount(prev => Math.max(0, prev - 1));
                                }
                                if (n.type === 'chat_message' && n.payload?.room_id) {
                                  setShowNotif(false);
                                  window.dispatchEvent(new CustomEvent('openChat', { detail: { roomId: n.payload.room_id } }));
                                }
                              }}
                            >
                              <p className={`text-sm text-[#F5F5F0] ${!n.is_read ? 'font-medium' : 'font-normal'}`}>{n.title}</p>
                              <p className="text-xs text-[#B8B8B8]/70 mt-1 line-clamp-2">{n.message}</p>
                              <p className="text-[10px] text-[#C5A059]/50 mt-2">{new Date(n.created_at).toLocaleDateString()}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Cart - Minimal Icon */}
            <button
              onClick={onCartClick}
              className="relative p-2 sm:p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#B8B8B8] hover:text-[#C5A059] transition-colors duration-300 touch-target"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 sm:-top-1 sm:-right-1 w-5 h-5 bg-[#C5A059] text-[#0A0A0A] text-[10px] font-bold flex items-center justify-center rounded-sm">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Menu / Sign In - Luxury Style */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="hidden sm:flex items-center gap-3 py-2 text-[#B8B8B8] hover:text-[#F5F5F0] transition-colors"
                >
                  {/* User Avatar */}
                  <div className="w-9 h-9 border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059] text-sm font-['Playfair_Display',_Georgia,_serif]">
                    {user.profile?.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </div>
                  <svg className={`w-3 h-3 text-[#C5A059]/60 transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* User Dropdown - Luxury Dark */}
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-4 w-60 bg-[#1A1A1A] border border-[#C5A059]/20 shadow-2xl z-20">
                      {/* User Info */}
                      <div className="p-4 border-b border-[#C5A059]/10">
                        <p className="text-sm font-medium text-[#F5F5F0]">{user.profile?.full_name || 'Member'}</p>
                        <p className="text-[10px] text-[#B8B8B8]/60 mt-0.5 truncate">{user.email}</p>
                        {user.profile?.role === 'admin' && (
                          <span className="inline-block mt-2 px-2 py-0.5 bg-[#C5A059]/20 text-[#C5A059] text-[9px] tracking-wider font-bold uppercase">
                            Admin
                          </span>
                        )}
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        {user.profile?.role === 'admin' && (
                          <button
                            onClick={() => { onAdminClick(); setUserMenuOpen(false); }}
                            className="w-full px-4 py-3 text-left text-xs tracking-wide text-[#C5A059] hover:bg-[#C5A059]/10 transition-colors flex items-center gap-3"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Admin Panel
                          </button>
                        )}
                        <button
                          onClick={() => { onDashboardClick(); setUserMenuOpen(false); }}
                          className="w-full px-4 py-3 text-left text-xs tracking-wide text-[#B8B8B8] hover:text-[#F5F5F0] hover:bg-[#C5A059]/5 transition-colors flex items-center gap-3"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                          Dashboard
                        </button>
                        <button
                          onClick={() => { onMyPetsClick(); setUserMenuOpen(false); }}
                          className="w-full px-4 py-3 text-left text-xs tracking-wide text-[#B8B8B8] hover:text-[#F5F5F0] hover:bg-[#C5A059]/5 transition-colors flex items-center gap-3"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          My Pets
                        </button>
                      </div>

                      {/* Sign Out */}
                      <div className="border-t border-[#C5A059]/10 py-2">
                        <button
                          onClick={handleSignOut}
                          className="w-full px-4 py-3 text-left text-xs tracking-wide text-[#8B4049] hover:bg-[#8B4049]/10 transition-colors flex items-center gap-3"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          {t('nav.signOut')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={onAuthClick}
                className="hidden sm:flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 min-h-[44px] border border-[#C5A059] text-[#C5A059] text-[10px] tracking-[0.15em] uppercase font-medium hover:bg-[#C5A059] hover:text-[#0A0A0A] transition-all duration-300"
              >
                {t('nav.signIn')}
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#B8B8B8] hover:text-[#C5A059] transition-colors touch-target"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu - Luxury Dark */}
        {mobileMenuOpen && (
          <div className="md:hidden py-6 border-t border-[#C5A059]/10">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`px-4 py-3 text-left text-xs tracking-[0.1em] uppercase transition-all ${activeSection === item.id
                    ? 'text-[#C5A059] border-l-2 border-[#C5A059] bg-[#C5A059]/5'
                    : 'text-[#B8B8B8] hover:text-[#F5F5F0] border-l-2 border-transparent'
                    }`}
                >
                  {item.label}
                </button>
              ))}

              {/* Mobile Language Toggle */}
              <div className="px-4 py-3 flex items-center justify-between border-t border-[#C5A059]/10 mt-2">
                <span className="text-[10px] tracking-[0.15em] uppercase text-[#B8B8B8]">
                  {language === 'en' ? 'Language' : 'ภาษา'}
                </span>
                <LanguageToggle />
              </div>

              {/* Mobile User Section */}
              {user ? (
                <div className="mt-4 pt-4 border-t border-[#C5A059]/10">
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059] font-['Playfair_Display']">
                      {user.profile?.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-[#F5F5F0]">{user.profile?.full_name || 'Member'}</p>
                      <p className="text-[10px] text-[#B8B8B8]/60">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { onDashboardClick(); setMobileMenuOpen(false); }}
                    className="w-full mt-2 px-4 py-3 text-left text-xs tracking-wide text-[#C5A059]"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-3 text-left text-xs tracking-wide text-[#8B4049]"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { onAuthClick(); setMobileMenuOpen(false); }}
                  className="mt-4 mx-4 py-4 min-h-[48px] border border-[#C5A059] text-[#C5A059] text-sm sm:text-xs tracking-[0.1em] uppercase text-center hover:bg-[#C5A059] hover:text-[#0A0A0A] active:bg-[#C5A059] active:text-[#0A0A0A] transition-all touch-target"
                >
                  {t('nav.signIn')}
                </button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
