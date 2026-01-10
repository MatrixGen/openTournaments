import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import Footer from './Footer';
import InstallButton from '../common/InstallAppButton';

function Layout({ children, headerProps = {} }) {
  const location = useLocation();
  const [headerHeight, setHeaderHeight] = useState(64);
  const [showInstall, setShowInstall] = useState(false);

  const isNativeApp =
    window.Capacitor?.isNativePlatform &&
    window.Capacitor.isNativePlatform();

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

  const handleDownloadClick = () => {
    setShowInstall(true);
  };

  const handleApkDownload = () => {
    window.location.href =
      'https://www.open-tournament.com/downloads/otarena-latest.apk';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 flex flex-col">
      {/* Fixed Header */}
      <div className="fixed right-0 left-0 top-0 z-40">
        <Header {...headerProps} />
      </div>

      {/* Main Content */}
      <main
        className="flex-1"
        style={{
          paddingTop: `${headerHeight}px`,
          //paddingBottom: isNativeApp ? '4rem' : '7rem'
        }}
      >
        {children}
      </main>

      {/* Desktop Footer */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16">
        <MobileBottomNav />
      </div>

      {/* Install App Button (WEB ONLY) */}
      {!isNativeApp && (
        <InstallButton onDownloadClick={handleDownloadClick}/>
      )}

      {/* Install Overlay */}
      {showInstall && (
        <div className="fixed inset-0 z-[100] bg-black bg-opacity-70 flex items-center justify-center">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-xl font-bold mb-2">
              Install OTArena App
            </h2>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Download the latest version of the app.
              If the app is already installed, it will update automatically.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleApkDownload}
                className="flex-1 bg-blue-600 text-white py-2 rounded"
              >
                Download APK
              </button>

              <button
                onClick={() => setShowInstall(false)}
                className="flex-1 bg-gray-300 dark:bg-neutral-700 py-2 rounded"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-3">
              You may need to allow “Install unknown apps” in Android settings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Layout;
