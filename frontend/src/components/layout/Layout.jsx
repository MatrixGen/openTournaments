import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';

export default function Layout({ children }) {
  const location = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col">
      {/* Header - Hidden on mobile when we have bottom nav */}
      <div className="hidden md:block">
        <Header />
      </div>
      
      {/* Main content with padding for bottom nav */}
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}