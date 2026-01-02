import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import Footer from './Footer';

 function Layout({ children, headerProps = {} }) {
  const location = useLocation();
  const [headerHeight, setHeaderHeight] = useState(64);

  useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.querySelector('header');
      if (header) {
        setHeaderHeight(header.offsetHeight);
      }
    };

    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 flex flex-col">
      {/* Fixed Header with custom props */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header {...headerProps} />
      </div>

      {/* Main content with dynamic padding */}
      <main 
        className="flex-1"
        style={{ 
          paddingTop: `${headerHeight}px`,
          paddingBottom: '1rem'
        }}
      >
        <div className="h-full">
          {children}
        </div>
      </main>

      {/* Desktop Footer */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16">
        <MobileBottomNav />
      </div>
    </div>
  );
}
export default Layout