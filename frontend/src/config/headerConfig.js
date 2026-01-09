// config/headerConfig.js

export const headerConfig = {
  // ======================
  // DEFAULT CONFIGURATION
  // ======================
  default: {
    showLogo: true,
    showNavigation: true,
    showUtilityItems: true,
    showUserInfo: true,
    showUserMenu: true,
    showAuthActions: true,
    navigationItems: [
      {
        name: "Browse Matches",
        href: "/tournaments",
      //  icon: "LayoutGrid",
        color: "from-blue-600 to-indigo-600",
      },
      {
        name: "My Tournaments",
        href: "/my-tournaments",
     //   icon: "Crown",
        color: "from-amber-600 to-orange-600",
      },
    ],
    logo: {
    //  icon: "OtArenaIcon",
      title: "OT Arena",
      subtitle: "Competitive Gaming",
      href: "/dashboard",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  // ======================
  // PUBLIC ROUTES
  // ======================

  // Landing & Auth Pages
  '/': {
    showLogo: true,
    showNavigation: false,
    showUtilityItems: false,
    showUserInfo: false,
    showUserMenu: false,
    showAuthActions: true,
    logo: {
    //  icon: "OtArenaIcon",
      title: "OT Arena",
      subtitle: "Competitive Gaming",
      href: "/",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  '/login': {
    showLogo: true,
    showNavigation: false,
    showUtilityItems: false,
    showUserInfo: false,
    showUserMenu: false,
    showAuthActions: false,
    logo: {
      icon: "OtArenaIcon",
      title: "Sign In",
      subtitle: "Access your account",
      href: "/",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  '/signup': {
    showLogo: true,
    showNavigation: false,
    showUtilityItems: false,
    showUserInfo: false,
    showUserMenu: false,
    showAuthActions: false,
    logo: {
    //  icon: "OtArenaIcon",
      title: "Create Account",
      subtitle: "Join OT Arena",
      href: "/",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  '/password-reset': {
    showLogo: true,
    showNavigation: false,
    showUtilityItems: false,
    showUserInfo: false,
    showUserMenu: false,
    showAuthActions: false,
    logo: {
     // icon: "OtArenaIcon",
      title: "Reset Password",
      subtitle: "Account Recovery",
      href: "/",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  '/oauth-callback': {
    showLogo: true,
    showNavigation: false,
    showUtilityItems: false,
    showUserInfo: false,
    showUserMenu: false,
    showAuthActions: false,
    logo: {
    //  icon: "OtArenaIcon",
      title: "OT Arena",
      subtitle: "Authentication",
      href: "/",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  // Public Tournament Pages
  '/tournaments': {
    showLogo: true,
    showNavigation: true,
    showUtilityItems: false,
    showUserInfo: false,
    showUserMenu: false,
    showAuthActions: true,
    
    logo: {
   //   icon: "OtArenaIcon",
      title: "Tournaments",
      subtitle: "Join & Compete",
      href: "/tournaments",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  '/browse-matches': {
    showLogo: true,
    showNavigation: true,
    showUtilityItems: false,
    showUserInfo: false,
    showUserMenu: false,
    showAuthActions: true,
    logo: {
    //  icon: "OtArenaIcon",
      title: "Browse Matches",
      subtitle: "Find your next game",
      href: "/browse-matches",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  // Public Profile Pages
  '/player/:userId': {
    showLogo: true,
    showNavigation: true,
    showUtilityItems: false,
    showUserInfo: false,
    showUserMenu: false,
    showAuthActions: true,
    logo: {
    //  icon: "OtArenaIcon",
      title: "Player Profile",
      subtitle: "View player stats",
      href: "/tournaments",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  '/users': {
    showLogo: true,
    showNavigation: true,
    showUtilityItems: false,
    showUserInfo: false,
    showUserMenu: false,
    showAuthActions: true,
    logo: {
     // icon: "OtArenaIcon",
      title: "Players",
      subtitle: "Discover gamers",
      href: "/users",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  '/discover': {
    showLogo: true,
    showNavigation: true,
    showUtilityItems: false,
    showUserInfo: false,
    showUserMenu: false,
    showAuthActions: true,
    logo: {
     // icon: "OtArenaIcon",
      title: "Discover",
      subtitle: "Find players & teams",
      href: "/discover",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  // Support Pages
  '/support': {
    showLogo: true,
    showNavigation: true,
    showUtilityItems: false,
    showUserInfo: false,
    showUserMenu: false,
    showAuthActions: true,
   
    logo: {
     // icon: "OtArenaIcon",
      title: "Support",
      subtitle: "Get help & assistance",
      href: "/support",
     // iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  // ======================
  // PROTECTED ROUTES
  // ======================

  // Dashboard
  '/dashboard': {
    showLogo: true,
    showNavigation: true,
    showUtilityItems: true,
    showUserInfo: true,
    showUserMenu: true,
    showAuthActions: false,
    logo: {
     // icon: "OtArenaIcon",
      title: "OT Arena",
      subtitle: "Competitive Gaming",
      href: "/dashboard",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  // Tournament Management
  '/my-tournaments': {
    showLogo: true,
    showNavigation: true,
    showUtilityItems: true,
    showUserInfo: true,
    showUserMenu: true,
    showAuthActions: false,
    
    logo: {
    //  icon: "OtArenaIcon",
      title: "My Tournaments",
      subtitle: "Manage your games",
      href: "/my-tournaments",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

 
  // Wallet & Transactions
  '/deposit': {
    showLogo: true,
    showNavigation: true,
    showUtilityItems: true,
    showUserInfo: true,
    showUserMenu: true,
    showAuthActions: false,
    logo: {
     // icon: "OtArenaIcon",
      title: "Add Funds",
      subtitle: "Deposit to your wallet",
      href: "/deposit",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  '/wallet': {
    showLogo: true,
    showNavigation: true,
    showUtilityItems: true,
    showUserInfo: true,
    showUserMenu: true,
    showAuthActions: false,
    navigationItems: [
      {
        name: "Deposit",
        href: "/wallet/deposit",
       // icon: "ArrowDownCircle",
        color: "from-green-600 to-emerald-600",
      },
      {
        name: "Withdraw",
        href: "/wallet/withdrawal",
        //icon: "ArrowUpCircle",
        color: "from-blue-600 to-cyan-600",
      },
      {
        name: "Transactions",
        href: "/transactions",
       // icon: "Receipt",
        color: "from-purple-600 to-indigo-600",
      },
    ],
    logo: {
    //  icon: "OtArenaIcon",
      title: "Wallet",
      subtitle: "Manage your balance",
      href: "/wallet",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  '/transactions': {
    showLogo: true,
    showNavigation: true,
    showUtilityItems: true,
    showUserInfo: true,
    showUserMenu: true,
    showAuthActions: false,
    logo: {
      //icon: "OtArenaIcon",
      title: "Transactions",
      subtitle: "View your payment history",
      href: "/transactions",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  // Profile & Settings
  '/my-profile': {
    showLogo: true,
    showNavigation: true,
    showUtilityItems: true,
    showUserInfo: true,
    showUserMenu: true,
    showAuthActions: false,
    logo: {
     // icon: "OtArenaIcon",
      title: "My Profile",
      subtitle: "Manage your account",
      href: "/my-profile",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  '/settings': {
    showLogo: true,
    showNavigation: true,
    showUtilityItems: true,
    showUserInfo: true,
    showUserMenu: true,
    showAuthActions: false,
    logo: {
    //  icon: "OtArenaIcon",
      title: "Settings",
      subtitle: "Configure your preferences",
      href: "/settings",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  '/verify-email': {
    showLogo: true,
    showNavigation: false,
    showUtilityItems: false,
    showUserInfo: true,
    showUserMenu: true,
    showAuthActions: false,
    logo: {
     // icon: "OtArenaIcon",
      title: "Verify Email",
      subtitle: "Complete your registration",
      href: "/verify-email",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  // Notifications & Social
  '/notifications': {
    showLogo: true,
    showNavigation: true,
    showUtilityItems: true,
    showUserInfo: true,
    showUserMenu: true,
    showAuthActions: false,
    logo: {
    //  icon: "OtArenaIcon",
      title: "Notifications",
      subtitle: "Stay updated",
      href: "/notifications",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  '/friends/requests': {
    showLogo: true,
    showNavigation: true,
    showUtilityItems: true,
    showUserInfo: true,
    showUserMenu: true,
    showAuthActions: false,
    logo: {
      icon: "OtArenaIcon",
      title: "Friends",
      subtitle: "Manage your connections",
      href: "/friends/requests",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  // Chat & Communication
  '/channels': {
    showLogo: true,
    showNavigation: true,
    showUtilityItems: true,
    showUserInfo: true,
    showUserMenu: true,
    showAuthActions: false,
    logo: {
     // icon: "OtArenaIcon",
      title: "Channels",
      subtitle: "Communicate with players",
      href: "/channels",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  '/tournaments/:id/chat': {
    showLogo: true,
    showNavigation: false,
    showUtilityItems: true,
    showUserInfo: true,
    showUserMenu: true,
    showAuthActions: false,
    logo: {
   //   icon: "OtArenaIcon",
      title: "Tournament Chat",
      subtitle: "Communicate with players",
      href: "/tournaments/:id",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  '/channels/:id/chat': {
    showLogo: true,
    showNavigation: false,
    showUtilityItems: true,
    showUserInfo: true,
    showUserMenu: true,
    showAuthActions: false,
    logo: {
     // icon: "OtArenaIcon",
      title: "Channel Chat",
      subtitle: "Group communication",
      href: "/channels",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  // Match & Dispute Management
  '/matches/:id': {
    showLogo: true,
    showNavigation: true,
    showUtilityItems: true,
    showUserInfo: true,
    showUserMenu: true,
    showAuthActions: false,
    logo: {
    //  icon: "OtArenaIcon",
      title: "Match Details",
      subtitle: "View match information",
      href: "/my-tournaments",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  '/disputes/:id': {
    showLogo: true,
    showNavigation: true,
    showUtilityItems: true,
    showUserInfo: true,
    showUserMenu: true,
    showAuthActions: false,
    logo: {
     // icon: "OtArenaIcon",
      title: "Dispute Details",
      subtitle: "Resolve match issues",
      href: "/my-tournaments",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },
};

// ======================
// HELPER FUNCTION
// ======================
export const getHeaderConfigForPath = (path) => {
  // Clean the path (remove query parameters, hash)
  const cleanPath = path.split('?')[0].split('#')[0];
  
  // Try exact match first
  if (headerConfig[cleanPath]) {
    return headerConfig[cleanPath];
  }

  // Try dynamic route patterns
  const matchingKey = Object.keys(headerConfig)
    .filter(key => key !== 'default')
    .find(key => {
      // Handle dynamic routes like /tournaments/:id
      if (key.includes(':')) {
        const keyParts = key.split('/');
        const pathParts = cleanPath.split('/');
        
        if (keyParts.length !== pathParts.length) return false;
        
        return keyParts.every((part, index) => {
          if (part.startsWith(':')) return true; // Dynamic segment
          return part === pathParts[index];
        });
      }
      
      // Handle prefix matches for nested routes
      return cleanPath.startsWith(key);
    });

  return headerConfig[matchingKey] || headerConfig.default;
};

// ======================
// EXPORT DEFAULT CONFIG
// ======================
export const defaultHeaderConfig = headerConfig.default;