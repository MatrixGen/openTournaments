// config/headerConfig.js

export const headerConfig = {
  
  // ======================
  // STATIC ROUTE CONFIGS
  // (For exact path matches)
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
      title: "Browse Matches",
      subtitle: "Find your next game",
      href: "/browse-matches",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },

  // Public Profile Pages
  '/users': {
    showLogo: true,
    showNavigation: true,
    showUtilityItems: false,
    showUserInfo: false,
    showUserMenu: false,
    showAuthActions: true,
    logo: {
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
      title: "Support",
      subtitle: "Get help & assistance",
      href: "/support",
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
        color: "from-green-600 to-emerald-600",
      },
      {
        name: "Withdraw",
        href: "/wallet/withdrawal",
        color: "from-blue-600 to-cyan-600",
      },
      {
        name: "Transactions",
        href: "/transactions",
        color: "from-purple-600 to-indigo-600",
      },
    ],
    logo: {
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
      title: "Channels",
      subtitle: "Communicate with players",
      href: "/channels",
      iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
      titleClassName: "text-xl font-bold",
      subtitleClassName: "text-xs",
    },
  },
};

// ======================
// DYNAMIC ROUTE CONFIG GENERATOR
// ======================
export const getHeaderConfigForPath = (pathname) => {
  // Clean the path (remove query parameters, hash)
  const cleanPath = pathname.split('?')[0].split('#')[0];
  
  // 1. Check for exact matches first
  if (headerConfig[cleanPath]) {
    return headerConfig[cleanPath];
  }

  // 2. Handle dynamic route patterns
  
  // Tournament Chat Route: /tournaments/:id/chat
  const tournamentChatMatch = cleanPath.match(/^\/tournaments\/([^/]+)\/chat$/);
  if (tournamentChatMatch) {
    const tournamentId = tournamentChatMatch[1];
    return {
      showLogo: true,
      
      showHeader: false,
      showNavigation: false,
      showUtilityItems: true,
      showUserInfo: true,
      showUserMenu: true,
      showAuthActions: false,
      logo: {
        title: "Tournament Chat",
        subtitle: "Communicate with players",
        href: `/tournaments/${tournamentId}`,
        iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
        titleClassName: "text-xl font-bold",
        subtitleClassName: "text-xs",
      },
    };
  }

  // Channel Chat Route: /channels/:id/chat
  const channelChatMatch = cleanPath.match(/^\/channels\/([^/]+)\/chat$/);
  if (channelChatMatch) {
    return {
      showLogo: true,
      showHeader: false,
      showNavigation: false,
      showUtilityItems: true,
      showUserInfo: true,
      showUserMenu: true,
      showAuthActions: false,
      logo: {
        title: "Channel Chat",
        subtitle: "Group communication",
        href: "/channels",
        iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
        titleClassName: "text-xl font-bold",
        subtitleClassName: "text-xs",
      },
    };
  }

  // Player Profile Route: /player/:userId
  const playerProfileMatch = cleanPath.match(/^\/player\/([^/]+)$/);
  if (playerProfileMatch) {
    return {
      showLogo: true,
      showNavigation: true,
      showUtilityItems: false,
      showUserInfo: false,
      showUserMenu: false,
      showAuthActions: true,
      logo: {
        title: "Player Profile",
        subtitle: "View player stats",
        href: "/tournaments",
        iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
        titleClassName: "text-xl font-bold",
        subtitleClassName: "text-xs",
      },
    };
  }

  // Match Details Route: /matches/:id
  const matchDetailsMatch = cleanPath.match(/^\/matches\/([^/]+)$/);
  if (matchDetailsMatch) {
    return {
      showLogo: true,
      showNavigation: true,
      showUtilityItems: true,
      showUserInfo: true,
      showUserMenu: true,
      showAuthActions: false,
      logo: {
        title: "Match Details",
        subtitle: "View match information",
        href: "/my-tournaments",
        iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
        titleClassName: "text-xl font-bold",
        subtitleClassName: "text-xs",
      },
    };
  }

  // Dispute Details Route: /disputes/:id
  const disputeDetailsMatch = cleanPath.match(/^\/disputes\/([^/]+)$/);
  if (disputeDetailsMatch) {
    return {
      showLogo: true,
      showNavigation: true,
      showUtilityItems: true,
      showUserInfo: true,
      showUserMenu: true,
      showAuthActions: false,
      logo: {
        title: "Dispute Details",
        subtitle: "Resolve match issues",
        href: "/my-tournaments",
        iconClassName: "w-9 h-9 text-[#370052] dark:text-[#a855f7]",
        titleClassName: "text-xl font-bold",
        subtitleClassName: "text-xs",
      },
    };
  }

  // 3. Check for prefix matches (for nested routes)
  const matchingPrefix = Object.keys(headerConfig)
    .filter(key => key !== 'default')
    .find(key => cleanPath.startsWith(key + '/') || cleanPath === key);

  if (matchingPrefix) {
    return headerConfig[matchingPrefix];
  }

  // 4. Return default config if no match found
  return headerConfig.default;
};

// ======================
// EXPORT DEFAULT CONFIG
// ======================
export const defaultHeaderConfig = headerConfig.default;