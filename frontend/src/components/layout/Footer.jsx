import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrophyIcon,
  QuestionMarkCircleIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  NewspaperIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  CreditCardIcon,
  LockClosedIcon,
  ArrowTopRightOnSquareIcon,
  HashtagIcon
} from '@heroicons/react/24/outline';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  const footerSections = [
    {
      title: "Platform",
      icon: TrophyIcon,
      links: [
        { name: "Tournaments", path: "/tournaments" },
        { name: "Leaderboard", path: "/leaderboard" },
        { name: "How It Works", path: "/how-it-works" },
        { name: "Supported Games", path: "/games" }
      ]
    },
    {
      title: "Company",
      icon: ArrowTrendingUpIcon,
      links: [
        { name: "About Us", path: "/about" },
        { name: "Blog", path: "/blog" },
        { name: "Careers", path: "/careers" },
        { name: "Press Kit", path: "/press" }
      ]
    },
    {
      title: "Support",
      icon: QuestionMarkCircleIcon,
      links: [
        { name: "Help Center", path: "/help" },
        { name: "Community", path: "/community" },
        { name: "Contact Us", path: "/contact" },
        { name: "System Status", path: "/status" }
      ]
    },
    {
      title: "Legal",
      icon: ShieldCheckIcon,
      links: [
        { name: "Privacy Policy", path: "/privacy" },
        { name: "Terms of Service", path: "/terms" },
        { name: "Cookie Policy", path: "/cookies" },
        { name: "Refund Policy", path: "/refunds" }
      ]
    }
  ];

  const socialLinks = [
    { 
      name: "Twitter", 
      icon: HashtagIcon, 
      path: "https://twitter.com/otarena",
      color: "text-blue-400 hover:text-blue-300"
    },
    { 
      name: "Discord", 
      icon: ChatBubbleLeftRightIcon, 
      path: "https://discord.gg/otarena",
      color: "text-indigo-400 hover:text-indigo-300"
    },
    { 
      name: "YouTube", 
      icon: ArrowTopRightOnSquareIcon, 
      path: "https://youtube.com/@otarena",
      color: "text-red-400 hover:text-red-300"
    },
    { 
      name: "Instagram", 
      icon: SparklesIcon, 
      path: "https://instagram.com/otarena",
      color: "text-pink-400 hover:text-pink-300"
    }
  ];

  const paymentMethods = [
    { name: "Visa/Mastercard", icon: CreditCardIcon, color: "text-blue-600 dark:text-blue-400" },
    { name: "Mobile Money", icon: DevicePhoneMobileIcon, color: "text-green-600 dark:text-green-400" },
    { name: "Secure SSL", icon: LockClosedIcon, color: "text-green-600 dark:text-green-400" },
    { name: "Global", icon: GlobeAltIcon, color: "text-purple-600 dark:text-purple-400" }
  ];

  return (
    <footer className="relative z-10 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Brand Section */}
            <BrandSection currentYear={currentYear} />
            
            {/* Footer Links */}
            {footerSections.map((section, index) => (
              <FooterSection 
                key={section.title}
                section={section}
                index={index}
              />
            ))}
          </div>
          
          {/* Newsletter & Social Section */}
          <NewsletterSection socialLinks={socialLinks} />
        </div>
        
        {/* Bottom Bar */}
        <BottomBar 
          currentYear={currentYear} 
          paymentMethods={paymentMethods} 
        />
      </div>
    </footer>
  );
}

function BrandSection({ currentYear }) {
  return (
    <div className="lg:col-span-2 space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-r from-primary-600 to-primary-500 rounded-lg flex items-center justify-center shadow-sm">
          <TrophyIcon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            OT Arena
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Competitive Gaming Platform
          </p>
        </div>
      </div>
      
      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed max-w-md">
        The premier platform for competitive gaming tournaments. Join thousands of players 
        in professional competitions and showcase your skills.
      </p>
      
      <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-500 text-sm">
        <CheckCircleIcon className="h-4 w-4 text-green-500" />
        <span>Secure • Verified • Professional</span>
      </div>
    </div>
  );
}

function FooterSection({ section, index }) {
  const Icon = section.icon;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="p-2 bg-gray-100 dark:bg-neutral-800 rounded-lg">
          <Icon className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
          {section.title}
        </h4>
      </div>
      <ul className="space-y-2.5">
        {section.links.map((link) => (
          <li key={link.name}>
            <Link 
              to={link.path}
              className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 text-sm group flex items-center"
            >
              <span className="group-hover:translate-x-1 transition-transform duration-200">
                {link.name}
              </span>
              {link.path.startsWith('http') && (
                <ArrowTopRightOnSquareIcon className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewsletterSection({ socialLinks }) {
  const [email, setEmail] = React.useState('');
  const [subscribed, setSubscribed] = React.useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email && email.includes('@')) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <div className="mt-12 pt-12 border-t border-gray-200 dark:border-neutral-800 lg:col-span-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Newsletter */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <EnvelopeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Tournament Updates
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get notified about new tournaments and platform features
              </p>
            </div>
          </div>
          
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-colors"
                required
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900 transition-colors text-sm whitespace-nowrap flex items-center justify-center"
            >
              {subscribed ? (
                <>
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Subscribed
                </>
              ) : (
                <>
                  Subscribe
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </>
              )}
            </button>
          </form>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </div>

        {/* Social Links */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <UserGroupIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Join Our Community
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Connect with fellow competitive gamers
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {socialLinks.map((social, index) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.name}
                  href={social.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-lg transition-colors duration-200"
                  aria-label={`Follow us on ${social.name}`}
                >
                  <Icon className={`h-4 w-4 ${social.color}`} />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                    {social.name}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function BottomBar({ currentYear, paymentMethods }) {
  return (
    <div className="py-6 border-t border-gray-200 dark:border-neutral-800 flex flex-col md:flex-row justify-between items-center gap-4">
      {/* Copyright & Legal */}
      <div className="text-center md:text-left">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          © {currentYear} OT Arena. All rights reserved.
        </p>
        <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
          <Link to="/privacy" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            Terms of Service
          </Link>
          <Link to="/cookies" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            Cookie Policy
          </Link>
          <span className="hidden sm:inline">•</span>
          <span className="text-gray-400 dark:text-gray-600">Platform Version 2.1.0</span>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="flex flex-col items-center md:items-end gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Secure Payments:</span>
          <div className="flex space-x-3">
            {paymentMethods.map((method, index) => {
              const Icon = method.icon;
              return (
                <div 
                  key={method.name}
                  className="relative group"
                  title={method.name}
                >
                  <Icon className={`h-5 w-5 ${method.color}`} />
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Industry-standard security and encryption
        </p>
      </div>
    </div>
  );
}