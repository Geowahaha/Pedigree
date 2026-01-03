
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
  activeSection: string;
  onNavigate: (section: string) => void;
  onAuthClick: () => void;
  onDashboardClick: () => void;
  onAdminClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ cartCount, onCartClick, activeSection, onNavigate, onAuthClick, onDashboardClick, onAdminClick }) => {
  const { user, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: t('nav.home') },
    { id: 'pedigree', label: t('nav.pedigree') },
    { id: 'search', label: t('nav.breeding') }, // Using breeding key for Search Pets for now as mapped in translation
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
    <header className="fixed top-0 left-0 right-0 z-50 glass bg-background/80 border-b border-primary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => scrollToSection('home')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-xl lg:text-2xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
              Pet<span className="text-primary">degree</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeSection === item.id
                  ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                  : 'text-foreground/70 hover:text-foreground hover:bg-primary/5'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Language Selector (Desktop) */}
          <div className="hidden md:flex items-center ml-2 mr-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent text-sm font-medium text-foreground/80 border-none focus:ring-0 cursor-pointer hover:text-primary transition-colors"
            >
              <option value="en">EN</option>
              <option value="th">TH</option>
            </select>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Cart Button */}
            <button
              onClick={onCartClick}
              className="relative p-2.5 rounded-full bg-white/50 hover:bg-white border border-primary/20 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Menu / Sign In */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-white/50 hover:bg-white border border-primary/20 transition-all duration-300 hover:shadow-md"
                >
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-medium shadow-sm">
                    {user.profile?.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-foreground max-w-[120px] truncate">
                    {user.profile?.full_name || user.email.split('@')[0]}
                  </span>
                  <svg className={`w-4 h-4 text-foreground/60 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-[#8B9D83]/20 shadow-xl z-20 py-2">
                      <div className="px-4 py-3 border-b border-[#8B9D83]/10">
                        <p className="text-sm font-medium text-[#2C2C2C]">{user.profile?.full_name || 'User'}</p>
                        <p className="text-xs text-[#2C2C2C]/60 truncate">{user.email}</p>
                        {user.profile?.account_type && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-[#8B9D83]/10 text-[#6B7D63] capitalize">
                            {user.profile.account_type}
                          </span>
                        )}
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => {
                            onAdminClick();
                            setUserMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-foreground/70 hover:bg-background transition-colors flex items-center gap-3 font-semibold text-primary"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Admin Panel
                        </button>
                        <button
                          onClick={() => {
                            onDashboardClick();
                            setUserMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-foreground/70 hover:bg-background transition-colors flex items-center gap-3 font-semibold text-primary"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                          {t('nav.breeding')} {/* Dashboard */}
                        </button>
                        <button className="w-full px-4 py-2 text-left text-sm text-[#2C2C2C]/70 hover:bg-[#F5F1E8] transition-colors flex items-center gap-3">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          My Profile
                        </button>
                        <button className="w-full px-4 py-2 text-left text-sm text-[#2C2C2C]/70 hover:bg-[#F5F1E8] transition-colors flex items-center gap-3">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          My Pets
                        </button>
                        <button className="w-full px-4 py-2 text-left text-sm text-[#2C2C2C]/70 hover:bg-[#F5F1E8] transition-colors flex items-center gap-3">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          My Orders
                        </button>
                      </div>
                      <div className="border-t border-[#8B9D83]/10 py-1">
                        <button
                          onClick={handleSignOut}
                          className="w-full px-4 py-2 text-left text-sm text-[#C97064] hover:bg-red-50 transition-colors flex items-center gap-3"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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
                className="hidden sm:flex items-center gap-2 px-6 py-2.5 rounded-full bg-foreground text-background text-sm font-bold hover:bg-foreground/80 transition-all duration-300 shadow-lg hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {t('nav.signIn')}
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-xl bg-white/80 hover:bg-white border border-[#8B9D83]/20 transition-all"
            >
              <svg className="w-5 h-5 text-[#2C2C2C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#8B9D83]/20">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`px-4 py-3 rounded-lg text-left text-sm font-medium transition-all ${activeSection === item.id
                    ? 'bg-[#8B9D83]/15 text-[#6B7D63]'
                    : 'text-[#2C2C2C]/70 hover:bg-[#8B9D83]/10'
                    }`}
                >
                  {item.label}
                </button>
              ))}
              {user ? (
                <>
                  <div className="mt-2 pt-2 border-t border-[#8B9D83]/20">
                    <div className="px-4 py-2 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#8B9D83] flex items-center justify-center text-white font-medium">
                        {user.profile?.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#2C2C2C]">{user.profile?.full_name || 'User'}</p>
                        <p className="text-xs text-[#2C2C2C]/60">{user.email}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onDashboardClick();
                      setMobileMenuOpen(false);
                    }}
                    className="mt-2 px-4 py-3 rounded-lg text-left text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                  >
                    {t('nav.breeder_dashboard')}
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="mt-2 px-4 py-3 rounded-lg text-left text-sm font-medium text-[#C97064] hover:bg-red-50 transition-colors"
                  >
                    {t('nav.sign_out')}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    onAuthClick();
                    setMobileMenuOpen(false);
                  }}
                  className="mt-2 px-4 py-3 rounded-lg bg-[#2C2C2C] text-white text-sm font-medium text-center"
                >
                  {t('nav.sign_in')}
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
