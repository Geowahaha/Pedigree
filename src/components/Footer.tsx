import React, { useState } from 'react';

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  const footerLinks = {
    'For Breeders': [
      { label: 'Register Pet', href: '#pedigree' },
      { label: 'Pedigree Search', href: '#search' },
      { label: 'Health Certification', href: '#' },
      { label: 'Breeder Verification', href: '#' },
      { label: 'DNA Testing', href: '#' },
    ],
    'Marketplace': [
      { label: 'All Products', href: '#marketplace' },
      { label: 'Dog Food', href: '#marketplace' },
      { label: 'Cat Food', href: '#marketplace' },
      { label: 'Toys & Accessories', href: '#marketplace' },
      { label: 'Become a Seller', href: '#' },
    ],
    'Resources': [
      { label: 'Breeding Guide', href: '#' },
      { label: 'Health Tips', href: '#' },
      { label: 'Nutrition Guide', href: '#' },
      { label: 'Community Forum', href: '#' },
      { label: 'Blog', href: '#' },
    ],
    'Company': [
      { label: 'About Us', href: '#' },
      { label: 'Contact', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
    ],
  };

  return (
    <footer className="bg-[#0A0A0A] text-[#F5F5F0] relative overflow-hidden">
      {/* Subtle gold gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#C5A059]/5 via-transparent to-transparent pointer-events-none" />

      {/* Newsletter Section */}
      <div className="border-b border-[#C5A059]/10 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-24">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="text-center lg:text-left">
              {/* Ornamental line */}
              <div className="w-12 h-px bg-[#C5A059] mb-6 mx-auto lg:mx-0" />
              <h3 className="font-['Playfair_Display',_Georgia,_serif] text-2xl lg:text-3xl text-[#F5F5F0] mb-4">
                Stay <span className="text-[#C5A059]">Informed</span>
              </h3>
              <p className="text-[#B8B8B8]/60 max-w-md text-sm tracking-wide">
                Receive exclusive updates on new features, breeding insights, and special announcements.
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="flex w-full lg:w-auto gap-0">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 lg:w-80 px-6 py-4 bg-[#1A1A1A] border border-[#C5A059]/20 border-r-0 text-[#F5F5F0] placeholder:text-[#B8B8B8]/30 focus:border-[#C5A059]/50 focus:outline-none transition-all duration-300 text-sm tracking-wide"
                required
              />
              <button
                type="submit"
                className="px-8 py-4 bg-[#C5A059] text-[#0A0A0A] text-[11px] tracking-[0.15em] uppercase font-semibold hover:bg-[#D4C4B5] transition-all duration-300 whitespace-nowrap"
              >
                {subscribed ? '✓ Done' : 'Subscribe'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-24 relative">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10 lg:gap-12">

          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <div className="flex items-center gap-4 mb-8 group cursor-pointer">
              {/* Minimal Gold Icon */}
              <div className="relative w-10 h-10 flex items-center justify-center">
                <div className="absolute inset-0 border border-[#C5A059]/40 rotate-45 group-hover:rotate-[50deg] transition-transform duration-500" />
                <svg className="w-5 h-5 text-[#C5A059]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>

              <div className="flex flex-col">
                <span className="font-['Playfair_Display',_Georgia,_serif] text-xl tracking-wide text-[#F5F5F0] group-hover:text-[#C5A059] transition-colors">
                  Pet<span className="text-[#C5A059]">degree</span>
                </span>
                <span className="text-[8px] tracking-[0.3em] text-[#C5A059]/50 uppercase">
                  Premium Bloodlines
                </span>
              </div>
            </div>
            <p className="text-[#B8B8B8]/50 text-sm mb-10 max-w-sm leading-relaxed">
              The definitive platform for breeders to preserve and celebrate their beloved companions' heritage with uncompromised elegance.
            </p>

            {/* Social Links - Minimal */}
            <div className="flex gap-4">
              {[
                {
                  name: 'Twitter', icon: (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  )
                },
                {
                  name: 'Instagram', icon: (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                    </svg>
                  )
                },
                {
                  name: 'Facebook', icon: (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                    </svg>
                  )
                },
                {
                  name: 'YouTube', icon: (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
                    </svg>
                  )
                }
              ].map((social) => (
                <a
                  key={social.name}
                  href="#"
                  className="w-10 h-10 border border-[#C5A059]/20 flex items-center justify-center text-[#B8B8B8]/50 hover:border-[#C5A059] hover:text-[#C5A059] hover:bg-[#C5A059]/10 transition-all duration-300"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-[10px] tracking-[0.2em] uppercase text-[#C5A059] mb-6">{title}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[#B8B8B8]/50 hover:text-[#C5A059] transition-all duration-300 text-sm tracking-wide inline-block"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#C5A059]/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[#B8B8B8]/30 text-xs tracking-wide">
              © 2026 Petdegree. All rights reserved.
            </p>
            <div className="flex items-center gap-8">
              <a href="#" className="text-[#B8B8B8]/30 hover:text-[#C5A059] text-xs tracking-wide transition-colors">Privacy</a>
              <a href="#" className="text-[#B8B8B8]/30 hover:text-[#C5A059] text-xs tracking-wide transition-colors">Terms</a>
              <a href="#" className="text-[#B8B8B8]/30 hover:text-[#C5A059] text-xs tracking-wide transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
