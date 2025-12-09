import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import Footer from './Footer';

export default function Layout({ children }) {
  const location = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 flex flex-col">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header />
      </div>

      {/* Main content with fixed padding */}
      <main className="flex-1 pb-20 md:pb-0 pt-16 md:pt-20">
        {children}
      </main>

      {/* Footer */}
      <Footer />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}