import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <div className="text-center p-8 relative z-10 max-w-2xl mx-auto px-4">
        {/* Animated 404 Icon */}
        <div className="mb-8 relative inline-block animate-in fade-in zoom-in duration-700">
          <div className="relative">
            <div className="text-[150px] sm:text-[200px] font-extrabold text-primary/10 leading-none">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-24 h-24 text-primary animate-float" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">
            Oops! Page Not Found
          </h1>
          <p className="text-lg text-foreground/60 mb-8 max-w-md mx-auto">
            The page you're looking for seems to have wandered off. Let's get you back on track!
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
            <button
              onClick={() => navigate('/')}
              className="group flex items-center gap-2 px-8 py-4 rounded-full bg-accent text-white font-bold text-lg hover:bg-accent/90 transition-all duration-300 shadow-xl shadow-accent/25 hover:shadow-2xl hover:shadow-accent/30 hover:-translate-y-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go Home
            </button>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-8 py-4 rounded-full bg-white/60 backdrop-blur-sm text-foreground font-bold text-lg border border-foreground/10 hover:bg-white hover:border-foreground/20 transition-all duration-300 hover:-translate-y-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Go Back
            </button>
          </div>

          {/* Helpful Links */}
          <div className="mt-12 pt-8 border-t border-foreground/10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-600">
            <p className="text-sm text-foreground/50 mb-4">Popular Pages:</p>
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { label: 'Browse Pedigrees', href: '#pedigree' },
                { label: 'Search Pets', href: '#search' },
                { label: 'Marketplace', href: '#marketplace' },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/' + link.href);
                  }}
                  className="text-primary hover:text-primary/80 text-sm font-medium transition-colors underline underline-offset-4"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
