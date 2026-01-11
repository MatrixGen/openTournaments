import { Fragment, useEffect, useState, useRef } from "react";
import { Popover, Transition } from "@headlessui/react";
import { Bars3Icon, VideoCameraIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../contexts/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import OtArenaIcon from "../icons/OtArenaIcon";

import {
  Bell,
  Trophy,
  LayoutGrid,
  User,
  Settings,
  Crown,
  CircleHelp,
  Home,
  ChevronRight,
  CreditCard,
  LogOutIcon,
} from "lucide-react";

import { useNotifications } from "../../contexts/NotificationContext";
import { formatCurrency } from "../../config/currencyConfig";

// Default configuration
const defaultNavigation = [
  {
    name: "Browse Matches",
    href: "/tournaments",
    icon: LayoutGrid,
    color: "from-blue-600 to-indigo-600",
  },
  {
    name: "My Tournaments",
    href: "/my-tournaments",
    icon: Crown,
    color: "from-amber-600 to-orange-600",
  },
];

const defaultUserMenuItems = [
  {
    icon: User,
    label: "My Profile",
    href: "/my-profile",
  },
  {
    icon: CreditCard,
    label: "Wallet",
    href: "/wallet",
  },
  {
    icon: Settings,
    label: "Settings",
    href: "/settings",
  },
   {
    icon: VideoCameraIcon,
    label: "footages",
    href: "/recordings",
  },
];

const defaultUtilityItems = [
  {
    icon: CircleHelp,
    label: "Support",
    href: "/support",
    showBadge: false,
    badgeCount: 0,
  },
  {
    icon: Bell,
    label: "Notifications",
    href: "/notifications",
    showBadge: true,
  },
];

 function Header({
  // Logo Section Props
  logoContent = null,
  showLogo = true,
  logo = {
    icon: OtArenaIcon,
    title: "OT Arena",
    subtitle: "Competitive Gaming",
    href: "/dashboard",
    iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
    titleClassName: "text-xl font-bold",
    subtitleClassName: "text-xs",
  },

  // Navigation Props
  navigationItems = defaultNavigation,
  showNavigation = true,
  navigationPosition = "center", 
  activeNavigationClass = (item) => `bg-gradient-to-r ${item.color} text-gray-900 dark:text-white shadow-sm`,
  inactiveNavigationClass = "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800",

  // User Info Props
  showUserInfo = true,
  userInfoRenderer = null,
  walletBalanceFormatter = (balance) => formatCurrency(balance || 0, "USD"),

  // User Menu Props
  userMenuItems = defaultUserMenuItems,
  showUserMenu = true,
  customUserMenuContent = null,
  showLogout = true,
  logoutHandler = null,
  logoutLabel = "Sign Out",
  //logoutIcon = LogOut,

  // Utility Items (Notifications, Support, etc.)
  utilityItems = defaultUtilityItems,
  showUtilityItems = true,
  utilityItemsPosition = "right", // 'left', 'right'

  // Auth Actions
  showAuthActions = true,
  loginHref = "/login",
  signupHref = "/signup",
  loginLabel = "Sign In",
  signupLabel = "Get Started",

  // Mobile Menu Props
  mobileMenuHeaderRenderer = null,
  mobileMenuFooterRenderer = null,
  showMobileNavigation = true,
  showMobileUserMenu = true,
 // showMobileUtilityItems = true,

  // Styling Props
  headerBackground = {
    scrolled: "bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-gray-200 dark:border-gray-800",
    default: "bg-white dark:bg-gray-900 border-transparent",
  },
  textColors = {
    primary: "text-gray-900 dark:text-gray-100",
    secondary: "text-gray-600 dark:text-gray-400",
  },
  hoverBackground = "hover:bg-gray-50 dark:hover:bg-gray-800",
  borderColor = "border-gray-200 dark:border-gray-800",
  containerMaxWidth = "max-w-7xl",

  // Behavior Props
  enableScrollEffect = true,
  enableBodyScrollLock = true,
  closeOnClickOutside = true,
  closeOnEscape = true,

  // Custom Sections
  leftSection = null,
  centerSection = null,
  rightSection = null,
  mobileMenuCustomContent = null,

  // Callbacks
  onMenuOpen = null,
  onMenuClose = null,
  onLogoutComplete = null,
  onNavigationClick = null,
  showHeader = true
}) {
  const { user, isAuthenticated, logout: authLogout } = useAuth();
  const { unreadCount } = useNotifications();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const headerRef = useRef(null);
  const menuPanelRef = useRef(null);

  // Header background based on scroll
  const headerBgClass = isScrolled
    ? headerBackground.scrolled
    : headerBackground.default;

  // Utility items with dynamic badge counts
  const getUtilityItems = () => {
    return utilityItems.map(item => {
      if (item.label === "Notifications" && item.showBadge) {
        return { ...item, badgeCount: unreadCount };
      }
      return item;
    });
  };

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (enableBodyScrollLock && isMenuOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isMenuOpen, enableBodyScrollLock]);

  // Close menu on escape key press
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (closeOnEscape && event.key === "Escape" && isMenuOpen) {
        handleMenuToggle(false);
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [isMenuOpen, closeOnEscape]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        closeOnClickOutside &&
        isMenuOpen &&
        menuPanelRef.current &&
        !menuPanelRef.current.contains(event.target) &&
        !event.target.closest("[data-menu-button]")
      ) {
        handleMenuToggle(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isMenuOpen, closeOnClickOutside]);

  // Scroll effect for header
  useEffect(() => {
    if (enableScrollEffect) {
      const handleScroll = () => {
        setIsScrolled(window.scrollY > 10);
      };
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [enableScrollEffect]);

  const isActiveRoute = (href) => {
    if (href === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(href);
  };

  const handleLogout = async () => {
    if (logoutHandler) {
      await logoutHandler();
    } else {
      await authLogout();
    }
    
    if (onLogoutComplete) {
      onLogoutComplete();
    } else {
      navigate("/");
    }
  };

  const handleMenuToggle = (open) => {
    setIsMenuOpen(open);
    if (open && onMenuOpen) onMenuOpen();
    if (!open && onMenuClose) onMenuClose();
  };

  const handleNavigationClick = (item, event) => {
    if (onNavigationClick) {
      onNavigationClick(item, event);
    }
  };

  // Render Logo Section
  const renderLogo = () => {
    if (logoContent) return logoContent;
    
    if (!showLogo) return null;

    //const LogoIcon = OtArenaIcon;//temporary
    return (
      <Link to={logo.href} className="flex items-center space-x-3 group">
        <div className="flex items-center justify-center w-9 h-9">
          <OtArenaIcon className={logo.iconClassName} />
        </div>
        <div className="flex flex-col">
          <span className={`${logo.titleClassName} ${textColors.primary}`}>
            {logo.title}
          </span>
          <span className={`${logo.subtitleClassName} ${textColors.secondary}`}>
            {logo.subtitle}
          </span>
        </div>
      </Link>
    );
  };

  // Render Navigation Items
  const renderNavigation = () => {
    if (!showNavigation || !navigationItems.length) return null;

    return navigationItems.map((item) => {
      //const Icon = item.icon;
      //console.log(Icon);
      
      const isActive = isActiveRoute(item.href);
      return (
        <Link
          key={item.name}
          to={item.href}
          onClick={(e) => handleNavigationClick(item, e)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            isActive
              ? activeNavigationClass(item)
              : `${textColors.secondary} ${inactiveNavigationClass}`
          }`}
        >
          <item.icon className="h-4 w-4" />
          {item.name}
        </Link>
      );
    });
  };

  // Render Utility Items
  const renderUtilityItems = () => {
    if (!showUtilityItems || !getUtilityItems().length) return null;

    return getUtilityItems().map((item) => {
      const Icon = item.icon;
      return (
        <Link
          key={item.label}
          to={item.href}
          className={`relative p-2 rounded-lg ${textColors.secondary} hover:text-gray-900 dark:hover:text-white ${hoverBackground} transition-colors`}
          title={item.label}
        >
          <Icon className="h-5 w-5" />
          {item.showBadge && item.badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {item.badgeCount > 9 ? "9+" : item.badgeCount}
            </span>
          )}
        </Link>
      );
    });
  };

  // Render User Info
  const renderUserInfo = () => {
    if (userInfoRenderer) {
      return userInfoRenderer(user);
    }

    if (!showUserInfo || !user) return null;

    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full">
          <span className="text-sm font-semibold text-white">
            {user?.username?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="text-left">
          <p className={`text-sm font-medium ${textColors.primary}`}>
            {user?.username}
          </p>
          <p className={`text-xs ${textColors.secondary}`}>
            {walletBalanceFormatter(user?.wallet_balance)}
          </p>
        </div>
      </div>
    );
  };

  // Default User Menu Content
  const DefaultUserMenuContent = () => (
    <>
      {/* User Info */}
      <div className={`p-4 border-b ${borderColor}`}>
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
            <span className="text-base font-bold text-white">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${textColors.primary} truncate`}>
              {user?.username}
            </p>
            <p className={`text-xs ${textColors.secondary} truncate`}>
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="p-2">
        <Link
          to="/dashboard"
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${textColors.secondary} hover:text-gray-900 dark:hover:text-white ${hoverBackground} transition-colors`}
        >
          <div className="flex items-center gap-3">
            <Home className="h-4 w-4 text-gray-500" />
            <span>Dashboard</span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-500" />
        </Link>

        {userMenuItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${textColors.secondary} hover:text-gray-900 dark:hover:text-white ${hoverBackground} transition-colors`}
          >
            <item.icon className="h-4 w-4 text-gray-500" />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Logout */}
      {showLogout && (
        <div className={`p-2 border-t ${borderColor}`}>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 ${hoverBackground} transition-colors`}
          >
            <logoutIcon className="h-4 w-4" />
            <span>{logoutLabel}</span>
          </button>
        </div>
      )}
    </>
  );

  // Default Mobile Menu Content
  const DefaultMobileMenuContent = () => (
    <>
      {/* Header */}
      {mobileMenuHeaderRenderer ? (
        mobileMenuHeaderRenderer()
      ) : (
        <div className={`flex items-center justify-between p-6 ${borderColor}`}>
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className={`text-lg font-bold ${textColors.primary}`}>
                {logo.title}
              </div>
              <div className={`text-xs ${textColors.secondary}`}>
                {logo.subtitle}
              </div>
            </div>
          </div>
          <button
            onClick={() => handleMenuToggle(false)}
            className={`p-2 rounded-lg ${textColors.secondary} hover:text-gray-900 dark:hover:text-white ${hoverBackground} transition-colors`}
            aria-label="Close menu"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto py-6 px-4">
        {/* User Info */}
        {isAuthenticated && showUserInfo && (
          <div className={`flex items-center space-x-3 p-4 mb-6 rounded-lg bg-gray-50 dark:bg-gray-800`}>
            <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-full">
              <span className="text-base font-bold text-white">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className={`font-semibold ${textColors.primary}`}>
                {user?.username}
              </div>
              <div className={`text-sm ${textColors.secondary}`}>
                {walletBalanceFormatter(user?.wallet_balance)} balance
              </div>
            </div>
          </div>
        )}

        {/* Mobile Navigation */}
        {showMobileNavigation && navigationItems.length > 0 && (
          <div className="mb-6">
            <div className={`text-xs font-semibold uppercase tracking-wider ${textColors.secondary} mb-3 px-3`}>
              Navigation
            </div>
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => handleMenuToggle(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-l-4 border-blue-600"
                        : `${textColors.secondary} hover:text-gray-900 dark:hover:text-white ${hoverBackground}`
                    } transition-colors`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Mobile User Menu */}
        {isAuthenticated && showMobileUserMenu && (
          <div className="mb-6">
            <div className={`text-xs font-semibold uppercase tracking-wider ${textColors.secondary} mb-3 px-3`}>
              Account
            </div>
            <div className="space-y-1">
              {userMenuItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={() => handleMenuToggle(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm ${textColors.secondary} hover:text-gray-900 dark:hover:text-white ${hoverBackground} transition-colors`}
                >
                  <item.icon className="h-5 w-5 text-gray-500" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Custom Mobile Content */}
        {mobileMenuCustomContent}

        {/* Auth Actions for Mobile */}
        {!isAuthenticated && showAuthActions && (
          <div className="space-y-3 p-3">
            <Link
              to={loginHref}
              onClick={() => handleMenuToggle(false)}
              className={`block w-full text-center py-3 px-4 rounded-lg border text-sm font-medium ${borderColor} ${textColors.secondary} hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}
            >
              {loginLabel}
            </Link>
            <Link
              to={signupHref}
              onClick={() => handleMenuToggle(false)}
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {signupLabel}
            </Link>
          </div>
        )}

        {/* Logout Button for Mobile */}
        {isAuthenticated && showLogout && (
          <div className={`border-t pt-6 mt-6 ${borderColor}`}>
            <button
              onClick={() => {
                handleMenuToggle(false);
                setTimeout(() => handleLogout(), 300);
              }}
              className={`flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 ${hoverBackground} transition-colors`}
            >
              <LogOutIcon className="h-5 w-5" />
              {logoutLabel}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      {mobileMenuFooterRenderer ? (
        mobileMenuFooterRenderer()
      ) : (
        <div className={`p-4 border-t ${borderColor}`}>
          <div className={`text-xs ${textColors.secondary} text-center`}>
            © {new Date().getFullYear()} {logo.title}. All rights reserved.
          </div>
        </div>
      )}
    </>
  );

  // Determine navigation position classes
  const getNavigationPositionClass = () => {
    switch (navigationPosition) {
      case 'left':
        return 'justify-start';
      case 'right':
        return 'justify-end';
      case 'center':
      default:
        return 'justify-center';
    }
  };

  
  return showHeader ? (
    <Popover
      as="header"
      ref={headerRef}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 border-b ${headerBgClass}`}
    >
      <div className={`relative mx-auto ${containerMaxWidth} px-4 sm:px-6 lg:px-8`}>
        <div className="flex items-center justify-between h-16">
          {/* Left Section */}
          <div className="flex items-center flex-1">
            {leftSection || renderLogo()}
            
            {/* Desktop Navigation - Position based on prop */}
            {centerSection || (
              <nav className={`hidden lg:flex lg:items-center lg:space-x-1 flex-1 ${getNavigationPositionClass()}`}>
                {isAuthenticated && renderNavigation()}
              </nav>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-2">
            {rightSection || (
              <>
                {/* Desktop User Menu */}
                <div className="hidden lg:flex lg:items-center lg:space-x-2">
                  {isAuthenticated ? (
                    <>
                      {/* Utility Items */}
                      {showUtilityItems && utilityItemsPosition === 'right' && (
                        <div className="flex items-center space-x-1 mr-3 border-r pr-3 border-gray-200 dark:border-gray-700">
                          {renderUtilityItems()}
                        </div>
                      )}

                      {/* User Profile Dropdown */}
                      {showUserMenu && (
                        <Popover className="relative">
                          <Popover.Button
                            className={`flex items-center space-x-3 p-1 rounded-lg ${hoverBackground} transition-all focus:outline-none`}
                          >
                            {renderUserInfo()}
                          </Popover.Button>

                          <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                          >
                            <Popover.Panel
                              className={`absolute right-0 mt-2 w-64 rounded-lg border shadow-lg z-50 bg-white dark:bg-gray-800 ${borderColor}`}
                            >
                              {customUserMenuContent || <DefaultUserMenuContent />}
                            </Popover.Panel>
                          </Transition>
                        </Popover>
                      )}
                    </>
                  ) : showAuthActions ? (
                    <div className="flex items-center space-x-4">
                      <Link
                        to={loginHref}
                        className={`${textColors.secondary} hover:text-gray-900 dark:hover:text-white font-medium transition-colors`}
                      >
                        {loginLabel}
                      </Link>
                      <Link
                        to={signupHref}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        {signupLabel}
                      </Link>
                    </div>
                  ) : null}
                </div>

                {/* Mobile menu button */}
                <div className="flex lg:hidden items-center space-x-2">
                  {isAuthenticated && showUtilityItems && renderUtilityItems()}
                  
                  <button
                    data-menu-button
                    onClick={() => handleMenuToggle(true)}
                    className={`p-2 rounded-lg ${textColors.secondary} hover:text-gray-900 dark:hover:text-white ${hoverBackground} transition-colors`}
                    aria-label="Open menu"
                  >
                    <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu - Full screen overlay */}
      <Transition
        as={Fragment}
        show={isMenuOpen}
        enter="transition ease-out duration-300"
        enterFrom="transform translate-x-full"
        enterTo="transform translate-x-0"
        leave="transition ease-in duration-200"
        leaveFrom="transform translate-x-0"
        leaveTo="transform translate-x-full"
      >
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop - Click outside to close */}
          <div
            className="fixed inset-0 transition-opacity"
            onClick={() => handleMenuToggle(false)}
            aria-hidden="true"
          />

          {/* Menu Panel */}
          <div
            ref={menuPanelRef}
            className="fixed inset-y-0 right-0 w-full max-w-xs transform transition-transform duration-300 ease-out"
          >
            <div className="h-full w-full flex flex-col shadow-2xl bg-white dark:bg-gray-900">
              <DefaultMobileMenuContent />
            </div>
          </div>
        </div>
      </Transition>
    </Popover>
  ):null;
}

export default Header