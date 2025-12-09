#!/usr/bin/env node
const { sequelize } = require('../models');
const {
  FAQCategory,
  FAQ,
  SupportChannel,
  ResourceLink
} = require('../models');

const seedSupportData = async () => {
  try {
    console.log('🌱 Seeding tournament platform support data...');

    // 1. Seed FAQ Categories (Tournament & Payment Focused)
    const faqCategories = [
      {
        name: 'Getting Started',
        slug: 'getting-started',
        description: 'Beginner guide to using the tournament platform',
        icon: 'rocket-launch',
        order: 1,
        color: '#00ff99'
      },
      {
        name: 'Tournaments & Brackets',
        slug: 'tournaments',
        description: 'Everything about creating, joining, and managing tournaments',
        icon: 'trophy',
        order: 2,
        color: '#fbbf24'
      },
      {
        name: 'Match Scoring System',
        slug: 'scoring',
        description: 'Reporting scores, auto-confirmation, and dispute handling',
        icon: 'clipboard-document-check',
        order: 3,
        color: '#3b82f6'
      },
      {
        name: 'Wallet & Mobile Money',
        slug: 'wallet',
        description: 'Deposits, withdrawals, entry fees, and prize payments',
        icon: 'wallet',
        order: 4,
        color: '#10b981'
      },
      {
        name: 'Payment Issues',
        slug: 'payment-issues',
        description: 'Failed deposits, pending payments, and reconciliation',
        icon: 'currency-dollar',
        order: 5,
        color: '#ef4444'
      },
      {
        name: 'Account & Security',
        slug: 'account',
        description: 'Profile management, verification, and security',
        icon: 'user-circle',
        order: 6,
        color: '#8b5cf6'
      },
      {
        name: 'Technical Support',
        slug: 'technical',
        description: 'Connection problems, bugs, and platform issues',
        icon: 'wrench-screwdriver',
        order: 7,
        color: '#6b7280'
      }
    ];

    const createdCategories = await FAQCategory.bulkCreate(faqCategories, { returning: true });
    console.log(`✅ Created ${createdCategories.length} FAQ categories`);

    // 2. Seed FAQs (Specific to your platform with payment system details)
    const faqs = [
      // Getting Started
      {
        question: 'How do I fund my wallet to join paid tournaments?',
        answer: 'Go to your Wallet page, click "Deposit", enter amount (minimum 1,000 TZS), provide your mobile number (format: 255XXXXXXXXX), and follow the USSD prompts. Your wallet updates automatically upon successful payment.',
        category_id: createdCategories.find(c => c.slug === 'getting-started').id,
        subcategory: 'wallet-funding',
        helpful_count: 320,
        not_helpful_count: 5,
        tags: ['wallet', 'deposit', 'mobile money', 'funding', 'clickpesa'],
        is_published: true,
        popularity_score: 98.5
      },
      {
        question: 'What is the minimum and maximum deposit amount?',
        answer: 'Minimum deposit: 1,000 TZS. Maximum deposit: 1,000,000 TZS per transaction. For larger amounts, contact support for assistance.',
        category_id: createdCategories.find(c => c.slug === 'getting-started').id,
        subcategory: 'deposit-limits',
        helpful_count: 210,
        not_helpful_count: 3,
        tags: ['deposit', 'limits', 'minimum', 'maximum', 'amount'],
        is_published: true,
        popularity_score: 96.7
      },

      // Tournaments & Brackets
      {
        question: 'How does entry fee deduction work?',
        answer: 'When you join a tournament with an entry fee, the amount is immediately deducted from your wallet balance. If the tournament is cancelled, you receive an automatic refund to your wallet.',
        category_id: createdCategories.find(c => c.slug === 'tournaments').id,
        subcategory: 'entry-fees',
        helpful_count: 450,
        not_helpful_count: 12,
        tags: ['entry fee', 'payment', 'deduction', 'wallet'],
        is_published: true,
        popularity_score: 97.9
      },
      {
        question: 'When and how are tournament prizes paid out?',
        answer: 'Prizes are automatically distributed to winners\' wallets within 1 hour of tournament completion. Prize amounts are calculated based on the distribution percentages set by the tournament creator.',
        category_id: createdCategories.find(c => c.slug === 'tournaments').id,
        subcategory: 'prize-payouts',
        helpful_count: 380,
        not_helpful_count: 8,
        tags: ['prizes', 'payout', 'winnings', 'automatic', 'distribution'],
        is_published: true,
        popularity_score: 98.2
      },

      // Match Scoring System
      {
        question: 'What happens if my opponent doesn\'t confirm the score?',
        answer: 'Scores auto-confirm after 15 minutes if no response from opponent. You\'ll get a warning notification at 10 minutes. Auto-confirmed scores are treated as legitimate results.',
        category_id: createdCategories.find(c => c.slug === 'scoring').id,
        subcategory: 'auto-confirmation',
        helpful_count: 520,
        not_helpful_count: 15,
        tags: ['auto-confirm', 'timer', '15-minutes', 'score', 'confirmation'],
        is_published: true,
        popularity_score: 99.1
      },
      {
        question: 'How do I dispute an incorrect score?',
        answer: 'Click "Dispute" on the match page before the 15-minute window ends. Provide evidence and reason. Admins will review within 24 hours. Disputed matches pause until resolution.',
        category_id: createdCategories.find(c => c.slug === 'scoring').id,
        subcategory: 'disputes',
        helpful_count: 295,
        not_helpful_count: 10,
        tags: ['dispute', 'evidence', 'admin', 'review', 'incorrect-score'],
        is_published: true,
        popularity_score: 96.4
      },

      // Wallet & Mobile Money
      {
        question: 'My deposit is pending for more than 5 minutes. What should I do?',
        answer: '1. Check your phone for USSD prompt 2. Use "Reconcile Payment" on the deposit details page 3. If still pending after 10 minutes, contact support with your Order Reference (e.g., DEPO17012345678ABCD)',
        category_id: createdCategories.find(c => c.slug === 'wallet').id,
        subcategory: 'pending-deposits',
        helpful_count: 620,
        not_helpful_count: 25,
        tags: ['pending', 'deposit', 'stuck', 'reconcile', 'order-reference'],
        is_published: true,
        popularity_score: 97.3
      },
      {
        question: 'What mobile networks are supported for deposits?',
        answer: 'All major Tanzanian networks: Vodacom (M-Pesa), Tigo (Tigo Pesa), Airtel (Airtel Money), Halotel, TTCL. Use format: 255XXXXXXXXX (e.g., 255712345678)',
        category_id: createdCategories.find(c => c.slug === 'wallet').id,
        subcategory: 'supported-networks',
        helpful_count: 410,
        not_helpful_count: 12,
        tags: ['mobile money', 'networks', 'mpesa', 'tigo', 'airtel', 'phone'],
        is_published: true,
        popularity_score: 96.8
      },
      {
        question: 'How do I withdraw my tournament winnings?',
        answer: 'Currently, winnings stay in your platform wallet for joining future tournaments. Withdrawal feature is coming soon - you\'ll be able to withdraw to mobile money.',
        category_id: createdCategories.find(c => c.slug === 'wallet').id,
        subcategory: 'withdrawals',
        helpful_count: 890,
        not_helpful_count: 45,
        tags: ['withdraw', 'winnings', 'prize', 'mobile money', 'payout'],
        is_published: true,
        popularity_score: 98.7
      },

      // Payment Issues
      {
        question: 'I received "Payment Failed" but money was deducted. What now?',
        answer: 'This is rare but can happen. 1. Check "Payment Reconciliation" in your deposit history 2. Contact support with: Order Reference, Phone Number, Transaction Time 3. Funds typically auto-refund within 2 hours',
        category_id: createdCategories.find(c => c.slug === 'payment-issues').id,
        subcategory: 'failed-payments',
        helpful_count: 380,
        not_helpful_count: 18,
        tags: ['failed', 'payment', 'deducted', 'refund', 'support'],
        is_published: true,
        popularity_score: 95.6
      },
      {
        question: 'What does "Reconcile Payment" do?',
        answer: 'Reconciliation checks the actual payment status with our payment provider (ClickPesa). Use this if your deposit shows as pending for too long. It can update the status to successful or failed based on actual transaction.',
        category_id: createdCategories.find(c => c.slug === 'payment-issues').id,
        subcategory: 'reconciliation',
        helpful_count: 275,
        not_helpful_count: 9,
        tags: ['reconcile', 'status', 'check', 'payment', 'clickpesa'],
        is_published: true,
        popularity_score: 94.9
      },
      {
        question: 'Payment says "Expired" - can I get a refund?',
        answer: 'Expired payments are automatically cancelled. No money was deducted. Simply initiate a new deposit. If money was deducted for an expired payment, use reconciliation or contact support.',
        category_id: createdCategories.find(c => c.slug === 'payment-issues').id,
        subcategory: 'expired-payments',
        helpful_count: 195,
        not_helpful_count: 7,
        tags: ['expired', 'cancelled', 'refund', 'timeout'],
        is_published: true,
        popularity_score: 93.8
      },

      // Account & Security
      {
        question: 'Can I change my phone number for deposits?',
        answer: 'Yes, you can use different phone numbers for different deposits. The system validates each number individually. Your account phone number is separate from deposit phone numbers.',
        category_id: createdCategories.find(c => c.slug === 'account').id,
        subcategory: 'phone-number',
        helpful_count: 165,
        not_helpful_count: 4,
        tags: ['phone', 'number', 'change', 'deposit', 'mobile'],
        is_published: true,
        popularity_score: 94.2
      },
      {
        question: 'Is my payment information secure?',
        answer: 'Yes. We use ClickPesa for payments - a PCI DSS compliant provider. We never store your mobile money PINs or sensitive payment details. All transactions are encrypted.',
        category_id: createdCategories.find(c => c.slug === 'account').id,
        subcategory: 'payment-security',
        helpful_count: 420,
        not_helpful_count: 6,
        tags: ['security', 'payment', 'encryption', 'pci', 'clickpesa'],
        is_published: true,
        popularity_score: 97.5
      },

      // Technical Support
      {
        question: 'I\'m getting "Invalid phone number format" error',
        answer: 'Use format: 255XXXXXXXXX (11 digits starting with 255). Examples: 255712345678, 255652123456. Remove any spaces, dashes, or plus sign.',
        category_id: createdCategories.find(c => c.slug === 'technical').id,
        subcategory: 'phone-format',
        helpful_count: 510,
        not_helpful_count: 32,
        tags: ['phone', 'format', 'error', '255', 'validation'],
        is_published: true,
        popularity_score: 96.1
      },
      {
        question: 'The USSD prompt didn\'t appear on my phone',
        answer: '1. Ensure you entered correct phone number 2. Check if you have USSD service enabled 3. Try restarting your phone 4. Use "Validate Phone Number" feature first 5. Contact your mobile network provider',
        category_id: createdCategories.find(c => c.slug === 'technical').id,
        subcategory: 'ussd-issues',
        helpful_count: 380,
        not_helpful_count: 22,
        tags: ['ussd', 'prompt', 'mobile', 'network', 'service'],
        is_published: true,
        popularity_score: 95.3
      },
      {
        question: 'Error: "You have a pending deposit"',
        answer: 'You can only have one active deposit attempt at a time. Complete or cancel your current pending deposit before starting a new one. Go to Deposit History to manage pending deposits.',
        category_id: createdCategories.find(c => c.slug === 'technical').id,
        subcategory: 'pending-limit',
        helpful_count: 290,
        not_helpful_count: 11,
        tags: ['pending', 'limit', 'one-at-a-time', 'deposit', 'queue'],
        is_published: true,
        popularity_score: 94.7
      }
    ];

    const createdFAQs = await FAQ.bulkCreate(faqs, { returning: true });
    console.log(`✅ Created ${createdFAQs.length} platform-specific FAQs`);

    // 3. Seed Support Channels (With payment priority system)
    const supportChannels = [
      {
        title: '🆘 Urgent: Active Match Dispute',
        description: 'Immediate assistance for ongoing match disputes (within 15-min window)',
        action: 'Report Now',
        action_type: 'urgent-dispute',
        variant: 'danger',
        is_available: true,
        availability_hours: '24/7 for active matches',
        response_time: 'Under 15 minutes',
        icon: 'clock',
        order: 1,
        color: '#ef4444',
        requires_auth: true,
        is_featured: true,
        metadata: { 
          priority: 'critical', 
          for: 'active_matches_only',
          sla: '15-minutes',
          tags: ['urgent', 'dispute', 'match', 'live']
        }
      },
      {
        title: '💰 Payment & Deposit Issues',
        description: 'Stuck payments, failed deposits, reconciliation problems',
        action: 'Get Payment Help',
        action_type: 'payment-support',
        variant: 'warning',
        is_available: true,
        availability_hours: 'Mon-Sun: 7 AM - 11 PM EAT',
        response_time: '30-60 minutes',
        icon: 'currency-dollar',
        order: 2,
        color: '#f59e0b',
        requires_auth: true,
        is_featured: true,
        metadata: { 
          priority: 'high',
          requires: ['order_reference', 'phone_number', 'amount']
        }
      },
      {
        title: '🏆 Tournament & Bracket Support',
        description: 'Tournament creation, bracket issues, prize distribution',
        action: 'Tournament Help',
        action_type: 'tournament-support',
        variant: 'primary',
        is_available: true,
        availability_hours: 'Mon-Sun: 8 AM - 10 PM EAT',
        response_time: '1-2 hours',
        icon: 'trophy',
        order: 3,
        color: '#3b82f6',
        requires_auth: true
      },
      {
        title: '📱 Mobile Money & Wallet FAQ',
        description: 'Self-service guide for deposits, withdrawals, and wallet management',
        action: 'Browse FAQ',
        action_type: 'knowledge-base',
        variant: 'secondary',
        is_available: true,
        availability_hours: 'Always',
        response_time: 'Instant',
        icon: 'wallet',
        order: 4,
        color: '#10b981',
        url: '/support/faq?category=wallet',
        requires_auth: false,
        is_featured: true
      },
      {
        title: '🔧 Payment Reconciliation Tool',
        description: 'Check and fix stuck or pending payments yourself',
        action: 'Reconcile Now',
        action_type: 'self-service-tool',
        variant: 'secondary',
        is_available: true,
        availability_hours: 'Always',
        response_time: 'Instant',
        icon: 'arrow-path',
        order: 5,
        color: '#8b5cf6',
        url: '/wallet/reconcile',
        requires_auth: true,
        metadata: { tool: true, automated: true }
      },
      {
        title: '💬 Tournament Community Discord',
        description: 'Get help from experienced players and organizers',
        action: 'Join Community',
        action_type: 'community',
        variant: 'secondary',
        is_available: true,
        availability_hours: 'Always',
        response_time: 'Varies',
        icon: 'chat-bubble-left',
        order: 6,
        color: '#6366f1',
        url: 'https://discord.gg/tournamentplatform',
        is_external: true,
        metadata: { members: '5000+', channels: ['#payment-help', '#tournament-help'] }
      }
    ];

    const createdChannels = await SupportChannel.bulkCreate(supportChannels, { returning: true });
    console.log(`✅ Created ${createdChannels.length} support channels`);

    // 4. Seed Resource Links (Tournament & Payment Specific)
    const resourceLinks = [
      {
        title: '📱 Mobile Money Deposit Guide',
        description: 'Step-by-step guide to depositing via mobile money',
        href: '/guides/mobile-money-deposit',
        category: 'Payment Guides',
        icon: 'device-phone-mobile',
        is_external: false,
        popularity: 99,
        order: 1,
        tags: ['deposit', 'mobile money', 'guide', 'tutorial', 'ussd'],
        is_active: true,
        metadata: { 
          reading_time: '5 min', 
          difficulty: 'beginner',
          video_available: true,
          steps: 4
        }
      },
      {
        title: '💰 Understanding Entry Fees & Prizes',
        description: 'How entry fees work and prize distribution explained',
        href: '/guides/entry-fees-prizes',
        category: 'Payment Guides',
        icon: 'trophy',
        is_external: false,
        popularity: 95,
        order: 2,
        tags: ['entry fee', 'prizes', 'distribution', 'winnings', 'calculator'],
        is_active: true,
        metadata: { reading_time: '7 min', includes_calculator: true }
      },
      {
        title: '⚠️ Common Payment Errors & Solutions',
        description: 'Troubleshooting guide for payment issues',
        href: '/troubleshooting/payment-errors',
        category: 'Troubleshooting',
        icon: 'exclamation-triangle',
        is_external: false,
        popularity: 92,
        order: 3,
        tags: ['errors', 'troubleshooting', 'payment', 'failed', 'pending'],
        is_active: true,
        metadata: { 
          common_errors: [
            'Invalid phone number format',
            'Pending deposit timeout',
            'USSD not appearing',
            'Insufficient balance'
          ]
        }
      },
      {
        title: '🏆 Tournament Creator Handbook',
        description: 'Complete guide to creating successful tournaments',
        href: '/guides/tournament-creator',
        category: 'Tournament Guides',
        icon: 'book-open',
        is_external: false,
        popularity: 88,
        order: 4,
        tags: ['tournament', 'creator', 'organizer', 'guide', 'handbook'],
        is_active: true,
        metadata: { reading_time: '15 min', difficulty: 'intermediate' }
      },
      {
        title: '⚖️ Match Scoring & Dispute Rules',
        description: 'Official rules for score reporting and disputes',
        href: '/rules/scoring-disputes',
        category: 'Rules & Policies',
        icon: 'scale',
        is_external: false,
        popularity: 90,
        order: 5,
        tags: ['scoring', 'disputes', 'rules', 'evidence', 'auto-confirm'],
        is_active: true,
        metadata: { last_updated: '2024-01-15', version: '2.1' }
      },
      {
        title: '🔒 Payment Security & Privacy',
        description: 'How we protect your payments and personal information',
        href: '/security/payment-protection',
        category: 'Security',
        icon: 'shield-check',
        is_external: false,
        popularity: 87,
        order: 6,
        tags: ['security', 'privacy', 'payment', 'encryption', 'pci'],
        is_active: true
      },
      {
        title: '📊 Deposit History & Reconciliation',
        description: 'How to view and manage your deposit history',
        href: '/guides/deposit-history',
        category: 'Payment Guides',
        icon: 'chart-bar',
        is_external: false,
        popularity: 85,
        order: 7,
        tags: ['deposit', 'history', 'reconciliation', 'records', 'tracking'],
        is_active: true
      },
      {
        title: '🎮 Supported Games & Platforms',
        description: 'Complete list of supported games and system requirements',
        href: '/games/supported',
        category: 'Game Info',
        icon: 'controller',
        is_external: false,
        popularity: 82,
        order: 8,
        tags: ['games', 'supported', 'platforms', 'requirements', 'compatibility'],
        is_active: true,
        metadata: { updated_monthly: true }
      },
      {
        title: '🔄 Automatic Tournament Features',
        description: 'Guide to auto-brackets, auto-confirm, and auto-payouts',
        href: '/features/automation',
        category: 'Platform Features',
        icon: 'arrow-path-rounded-square',
        is_external: false,
        popularity: 84,
        order: 9,
        tags: ['automation', 'auto-bracket', 'auto-confirm', 'auto-payout', 'features'],
        is_active: true
      },
      {
        title: '📞 Contact ClickPesa Support',
        description: 'Direct support for payment gateway issues',
        href: 'https://clickpesa.com/support',
        category: 'External Resources',
        icon: 'phone',
        is_external: true,
        popularity: 76,
        order: 10,
        tags: ['clickpesa', 'payment', 'gateway', 'external', 'support'],
        is_active: true,
        target: '_blank'
      }
    ];

    const createdLinks = await ResourceLink.bulkCreate(resourceLinks, { returning: true });
    console.log(`✅ Created ${createdLinks.length} platform resource links`);

    console.log('🎉 Tournament platform support data seeded successfully!');
    console.log('📊 Summary:');
    console.log(`   - ${createdCategories.length} FAQ Categories`);
    console.log(`   - ${createdFAQs.length} FAQs`);
    console.log(`   - ${createdChannels.length} Support Channels`);
    console.log(`   - ${createdLinks.length} Resource Links`);
    console.log('\n🎮 Platform-specific features covered:');
    console.log('   ✓ Mobile Money Deposits (ClickPesa)');
    console.log('   ✓ Tournament Entry Fee System');
    console.log('   ✓ Auto-Confirmation (15-min window)');
    console.log('   ✓ Prize Distribution');
    console.log('   ✓ Payment Reconciliation');
    console.log('   ✓ Match Dispute Resolution');
    console.log('   ✓ USSD Payment Integration');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding support data:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
};

// Run the seed function
seedSupportData();