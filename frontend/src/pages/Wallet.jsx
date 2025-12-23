// pages/wallet/Wallet.jsx
import { useState, useEffect, useRef } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Deposit from "./payment/Deposit";
import Withdrawal from "./payment/Withdrawal";
import Transactions from "./payment/Transactions";
import {
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";

// Custom hook for scroll direction detection
const useScrollDirection = () => {
  const [scrollDirection, setScrollDirection] = useState("up");
  const [isAtTop, setIsAtTop] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const updateScrollDirection = () => {
      const scrollY = window.pageYOffset;
      
      // Check if at top
      setIsAtTop(scrollY < 10);
      
      // Determine scroll direction
      if (scrollY > lastScrollY.current) {
        setScrollDirection("down");
      } else if (scrollY < lastScrollY.current) {
        setScrollDirection("up");
      }
      
      lastScrollY.current = scrollY > 0 ? scrollY : 0;
    };

    window.addEventListener("scroll", updateScrollDirection, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", updateScrollDirection);
    };
  }, []);

  return { scrollDirection, isAtTop };
};

// Tab Navigation Component
const WalletTabs = ({ activeTab, onTabChange, showTabs }) => {
  const tabs = [
    {
      id: "deposit",
      label: "Deposit",
      icon: ArrowDownTrayIcon,
      path: "/wallet/deposit",
    },
    {
      id: "withdrawal",
      label: "Withdrawal",
      icon: ArrowUpTrayIcon,
      path: "/wallet/withdrawal",
    },
    {
      id: "transactions",
      label: "History",
      icon: ClockIcon,
      path: "/transactions",
    },
  ];

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transform transition-transform duration-300 ease-in-out ${
        showTabs ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-900/95 pt-safe-top">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">Wallet</h1>
            </div>
            <div className="flex items-center space-x-2">
              {/* Optional: Add mobile menu button if needed */}
            </div>
          </div>
          
          <div className="flex space-x-1 pb-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex-1 min-w-0 flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-primary-500 text-white shadow-lg"
                      : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
                  }`}
                >
                  <Icon className={`h-5 w-5 mb-1 ${isActive ? "text-white" : "text-neutral-400"}`} />
                  <span className="text-xs font-medium truncate w-full text-center">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Floating Action Button for Mobile
const MobileFAB = ({ activeTab, onTabChange, showFAB }) => {
  const tabs = [
    {
      id: "deposit",
      label: "Deposit",
      icon: ArrowDownTrayIcon,
      path: "/wallet/deposit",
    },
    {
      id: "withdrawal",
      label: "Withdraw",
      icon: ArrowUpTrayIcon,
      path: "/wallet/withdrawal",
    },
    {
      id: "transactions",
      label: "History",
      icon: ClockIcon,
      path: "/transactions",
    },
  ];

  const [isOpen, setIsOpen] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.fab-container')) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="fixed bottom-6 right-6 z-50 fab-container md:hidden">
      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full bg-primary-500 text-white shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen ? "rotate-45 bg-red-500" : "rotate-0"
        } ${showFAB ? "scale-100" : "scale-0"}`}
      >
        <Bars3Icon className="h-6 w-6" />
      </button>
      
      {/* Floating Menu Items */}
      <div className="absolute bottom-16 right-0 space-y-2">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => {
                onTabChange(tab.id);
                setIsOpen(false);
              }}
              className={`flex items-center justify-end space-x-2 transform transition-all duration-300 ${
                isOpen 
                  ? "translate-x-0 opacity-100 scale-100" 
                  : "translate-x-10 opacity-0 scale-0"
              }`}
              style={{
                transitionDelay: isOpen ? `${index * 100}ms` : '0ms',
              }}
            >
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                isActive
                  ? "bg-primary-500 text-white"
                  : "bg-neutral-800 text-neutral-300"
              }`}>
                {tab.label}
              </span>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isActive
                  ? "bg-primary-500 text-white"
                  : "bg-neutral-800 text-neutral-300"
              }`}>
                <Icon className="h-5 w-5" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default function Wallet() {
  const location = useLocation();
  const navigate = useNavigate();
  const { scrollDirection, isAtTop } = useScrollDirection();
  const [showFAB, setShowFAB] = useState(true);
  
  // Determine active tab from URL
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes("/wallet/deposit")) return "deposit";
    if (path.includes("/wallet/withdrawal")) return "withdrawal";
    if (path.includes("/transactions")) return "transactions";
    return "deposit";
  };

  const activeTab = getActiveTab();

  // Handle tab change
  const handleTabChange = (tabId) => {
    switch (tabId) {
      case "deposit":
        navigate("/wallet/deposit");
        break;
      case "withdrawal":
        navigate("/wallet/withdrawal");
        break;
      case "transactions":
        navigate("/transactions");
        break;
      default:
        navigate("/wallet/deposit");
    }
    
    // Scroll to top when changing tabs
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Show tabs when scrolling up, hide when scrolling down
  const showTabs = scrollDirection === "up" && !isAtTop;

  // Control FAB visibility based on scroll
  useEffect(() => {
    let lastScrollY = window.pageYOffset;
    let ticking = false;

    const updateFABVisibility = () => {
      const scrollY = window.pageYOffset;
      
      // Show FAB when at top or scrolling up, hide when scrolling down significantly
      if (scrollY < 100 || scrollY < lastScrollY) {
        setShowFAB(true);
      } else if (scrollY > lastScrollY + 50) {
        setShowFAB(false);
      }
      
      lastScrollY = scrollY;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateFABVisibility);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-800">
      {/* Desktop Tabs (Hidden on mobile) */}
      <div className="hidden md:block">
        <WalletTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          showTabs={showTabs}
        />
      </div>
      
      {/* Mobile FAB */}
      <MobileFAB
        activeTab={activeTab}
        onTabChange={handleTabChange}
        showFAB={showFAB}
      />
      
      {/* Mobile Tabs (Only shown at top) */}
      <div className="md:hidden sticky top-0 z-40 bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-900/95 pt-safe-top">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-white">Wallet</h1>
        </div>
        <div className="flex border-b border-neutral-700">
          {[
            { id: "deposit", label: "Deposit", icon: ArrowDownTrayIcon },
            { id: "withdrawal", label: "Withdraw", icon: ArrowUpTrayIcon },
            { id: "transactions", label: "History", icon: ClockIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 py-3 flex flex-col items-center justify-center border-b-2 transition-all ${
                  isActive
                    ? "border-primary-500 text-primary-500"
                    : "border-transparent text-neutral-400 hover:text-neutral-300"
                }`}
              >
                <Icon className={`h-5 w-5 mb-1 ${isActive ? "text-primary-500" : "text-neutral-400"}`} />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pb-20 md:pb-8">
        <Routes>
          <Route path="deposit" element={<Deposit />} />
          <Route path="withdrawal" element={<Withdrawal />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="/" element={<Navigate to="deposit" replace />} />
        </Routes>
      </div>
    </div>
  );
}