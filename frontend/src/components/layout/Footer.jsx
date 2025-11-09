import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  const footerSections = [
    {
      title: "Platform",
      links: [
        { name: "Tournaments", path: "/tournaments" },
        { name: "Leaderboard", path: "/leaderboard" },
        { name: "How It Works", path: "/how-it-works" },
        { name: "Supported Games", path: "/games" }
      ]
    },
    {
      title: "Company",
      links: [
        { name: "About Us", path: "/about" },
        { name: "Blog", path: "/blog" },
        { name: "Careers", path: "/careers" },
        { name: "Press Kit", path: "/press" }
      ]
    },
    {
      title: "Support",
      links: [
        { name: "Help Center", path: "/help" },
        { name: "Community", path: "/community" },
        { name: "Contact Us", path: "/contact" },
        { name: "Status", path: "/status" }
      ]
    },
    {
      title: "Legal",
      links: [
        { name: "Privacy Policy", path: "/privacy" },
        { name: "Terms of Service", path: "/terms" },
        { name: "Cookie Policy", path: "/cookies" },
        { name: "Refund Policy", path: "/refunds" }
      ]
    }
  ];

  const socialLinks = [
    { name: "Twitter", icon: "🐦", path: "https://twitter.com/opentournaments" },
    { name: "Discord", icon: "🎮", path: "https://discord.gg/opentournaments" },
    { name: "YouTube", icon: "📺", path: "https://youtube.com/opentournaments" },
    { name: "Instagram", icon: "📸", path: "https://instagram.com/opentournaments" }
  ];

  return (
    <motion.footer 
      className="relative z-10 bg-neutral-900/90 backdrop-blur-md border-t border-neutral-700"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
    >
      <div className="container mx-auto px-4 sm:px-6">
        {/* Main Footer Content */}
        <div className="py-12 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-12">
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
            
            {/* Social & Newsletter */}
            <NewsletterSection socialLinks={socialLinks} />
          </div>
        </div>
        
        {/* Bottom Bar */}
        <BottomBar currentYear={currentYear} />
      </div>
    </motion.footer>
  );
}

function BrandSection({ currentYear }) {
  return (
    <div className="lg:col-span-2 space-y-4">
      <motion.div 
        className="flex items-center space-x-3"
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
      >
        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">OT</span>
        </div>
        <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          OpenTournaments
        </h3>
      </motion.div>
      
      <motion.p 
        className="text-neutral-400 text-sm leading-relaxed max-w-md"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        viewport={{ once: true }}
      >
        The ultimate platform for competitive gaming. Join thousands of players 
        in thrilling tournaments and earn real rewards for your skills.
      </motion.p>
      
      <motion.div 
        className="flex items-center space-x-2 text-neutral-500 text-sm"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        viewport={{ once: true }}
      >
        <span>© {currentYear} OpenTournaments. All rights reserved.</span>
      </motion.div>
    </div>
  );
}

function FooterSection({ section, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
    >
      <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
        {section.title}
      </h4>
      <ul className="space-y-3">
        {section.links.map((link) => (
          <motion.li key={link.name}>
            <Link 
              to={link.path}
              className="text-neutral-400 hover:text-white transition-colors duration-300 text-sm group flex items-center"
            >
              <span className="group-hover:translate-x-1 transition-transform duration-300">
                {link.name}
              </span>
            </Link>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

function NewsletterSection({ socialLinks }) {
  return (
    <motion.div
      className="lg:col-span-2 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      viewport={{ once: true }}
    >
      <div>
        <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
          Stay Updated
        </h4>
        <p className="text-neutral-400 text-sm mb-4">
          Get the latest tournament updates and gaming news.
        </p>
        
        {/* Newsletter Form */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-2"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <input 
            type="email" 
            placeholder="Enter your email"
            className="flex-1 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors duration-300 text-sm"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-300 text-sm whitespace-nowrap"
          >
            Subscribe
          </motion.button>
        </motion.div>
      </div>

      {/* Social Links */}
      <div>
        <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
          Join Our Community
        </h4>
        <div className="flex space-x-4">
          {socialLinks.map((social, index) => (
            <motion.a
              key={social.name}
              href={social.path}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center hover:bg-neutral-700 transition-colors duration-300 group relative"
              whileHover={{ 
                scale: 1.1,
                y: -2
              }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
              viewport={{ once: true }}
            >
              <span className="text-lg">{social.icon}</span>
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-neutral-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                {social.name}
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function BottomBar({ currentYear }) {
  const paymentMethods = ["💳", "📱", "🌐", "🔒"]; // Simplified for demo
  
  return (
    <motion.div 
      className="py-6 border-t border-neutral-800 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.6 }}
      viewport={{ once: true }}
    >
      {/* Payment Methods */}
      <div className="flex items-center space-x-4">
        <span className="text-neutral-500 text-sm">Secure Payments:</span>
        <div className="flex space-x-2">
          {paymentMethods.map((method, index) => (
            <motion.span
              key={index}
              className="text-lg"
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.8 + index * 0.1 }}
              viewport={{ once: true }}
            >
              {method}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Additional Links */}
      <div className="flex flex-wrap justify-center items-center space-x-6 text-neutral-500 text-sm">
        <Link to="/privacy" className="hover:text-white transition-colors duration-300">
          Privacy
        </Link>
        <Link to="/terms" className="hover:text-white transition-colors duration-300">
          Terms
        </Link>
        <Link to="/cookies" className="hover:text-white transition-colors duration-300">
          Cookies
        </Link>
        <span>Made with ❤️ for gamers</span>
      </div>
    </motion.div>
  );
}