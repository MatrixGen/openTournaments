// components/dashboard/DashboardBannerCarousel.jsx
import { AlertCircle, ShieldAlert, DollarSign, Gift, Zap, Trophy, Star } from 'lucide-react';
import BannerCarousel from '../common/BannerCarousel';
import { useAuth } from '../../contexts/AuthContext';

const DashboardBannerCarousel = () => {
  const { user } = useAuth();

  const hasLowBalance = parseFloat(user?.wallet_balance || 0) < 5;
  const isVerified = user?.email_verified;
  const registrationDate = new Date(user?.created_at || Date.now());
  const daysSinceRegistration = Math.floor((Date.now() - registrationDate) / (1000 * 60 * 60 * 24));
  const isNewUser = daysSinceRegistration < 7; // User is "new" for 7 days

  // Enhanced banners with images/backgrounds
  const allBanners = [
    // Verification Banner - Clickable card
    !isVerified && {
      id: 'verification',
      title: 'Verify Your Email',
      description: 'Complete your registration to unlock all features and secure your account.',
      icon: ShieldAlert,
      background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', // Purple gradient
      bgImage: '/images/verification-bg.svg',
      action: {
        text: 'Verify Now',
        to: '/verify-email',
        icon: ShieldAlert
      },
      additionalInfo: ['Required', 'Account Security']
    },
    
    // Low Balance Banner - Clickable card
    hasLowBalance && {
      id: 'low-balance',
      title: 'Low Balance Alert!',
      description: `Your balance is low. Add funds to join tournaments and win big prizes!`,
      icon: DollarSign,
      background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', 
      bgImage: '/images/low-balance-bg.svg',
      action: {
        text: 'Add Funds',
        to: '/deposit',
        icon: DollarSign
      },
      secondaryAction: {
        text: 'Learn about pricing',
        to: '/pricing'
      },
      additionalInfo: ['Urgent', 'Tournament Access']
    },
    
    // Welcome Banner for New Users - Clickable card 
    isNewUser && {
      id: 'welcome',
      title: 'Gaming, Reimagined',
      description: 'Start with a profile. Grow into a champion. OT Arena is where gamers rise. .',
      icon: Trophy,
      background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', 
     // bgImage: '/images/createProfileBanner.png',
      href: '/tournaments', 
      action: {
        text: 'Get Started',
        to: '/channel',
        icon: Zap
      },
    //  additionalInfo: ['New User', 'Bonus Available']
    },

    {
      id: 'reminder',
      title: 'Tournament Starting Soon',
      description: 'The "Epic Showdown" tournament begins in 2 hours. Don\'t miss out!',
      icon: AlertCircle,
      background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)', 
      bgImage: '/images/soonBanner.gif',
      href: '/tournaments',
      action: {
        text: 'Join Tournament',
        to: '/tournaments',
        icon: Zap
      },
      additionalInfo: ['Starting Soon', 'Limited Slots']
    }
  ].filter(Boolean); // Remove false values

  // Priority order: verification > low balance > welcome > others
  const priorityOrder = ['verification', 'low-balance', 'welcome'];
  
  // Sort banners by priority
  const sortedBanners = allBanners.sort((a, b) => {
    const aPriority = priorityOrder.indexOf(a.id);
    const bPriority = priorityOrder.indexOf(b.id);
    
    // If both have priority, sort by priority order
    if (aPriority !== -1 && bPriority !== -1) {
      return aPriority - bPriority;
    }
    
    // If only one has priority, it comes first
    if (aPriority !== -1) return -1;
    if (bPriority !== -1) return 1;
    
    // Otherwise maintain original order
    return 0;
  });

  // Take max 3 banners to keep carousel manageable
  const activeBanners = sortedBanners.slice(0, 3);

  if (activeBanners.length === 0) return null;

  // Determine if we should show action buttons or make cards clickable
  // For urgent/important banners, make the whole card clickable
  const shouldShowActionButton = !hasLowBalance && isVerified && !isNewUser;

  return (
    <BannerCarousel
      banners={activeBanners}
      autoScrollInterval={6000}
      showDots={false}
      transitionDuration={400}
      pauseOnHover={true}
      showProgressBar={false}
      showActionButton={shouldShowActionButton}
      className="mb-6"
    />
  );
};

export default DashboardBannerCarousel;