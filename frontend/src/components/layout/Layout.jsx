import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';

export default function Layout({ children }) {
  const location = useLocation();
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Measure header height dynamically
  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
    // Optional: recalc on window resize
    const handleResize = () => {
      if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col">
      {/* Header with ref */}
      <div ref={headerRef} className='pt-16'>
        <Header />
      </div>

      {/* Main content with dynamic padding-top for fixed header */}
      <main className="flex-1 pb-20 md:pb-0" style={{ paddingTop: headerHeight }}>
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
