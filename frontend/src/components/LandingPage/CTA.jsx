import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function CTA({ theme = 'dark' }) {
  return (
    <motion.section 
      className="relative z-10 py-8 sm:py-12 md:py-20"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true, margin: "-50px" }}
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Main CTA Card */}
          <CTACard theme={theme} />
          
          {/* Trust Indicators */}
          <TrustIndicators theme={theme} />
        </div>
      </div>
    </motion.section>
  );
}

function CTACard({ theme }) {
  const bgClass = theme === 'dark' 
    ? 'bg-gradient-to-br from-neutral-800/60 to-neutral-900/60 border-neutral-700' 
    : 'bg-gradient-to-br from-white/90 to-gray-100/90 border-gray-200';
  
  return (
    <motion.div
      className={`relative backdrop-blur-md rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 lg:p-16 border shadow-xl overflow-hidden ${bgClass}`}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, type: "spring" }}
      viewport={{ once: true }}
    >
      {/* Animated Border */}
      <motion.div 
        className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-purple-600 to-blue-600 opacity-20"
        animate={{ 
          rotate: [0, 360],
        }}
        transition={{ 
          duration: 20, 
          repeat: Infinity, 
          ease: "linear" 
        }}
        style={{ 
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          padding: '2px'
        }}
      />
      
      <div className="relative text-center space-y-4 sm:space-y-6 md:space-y-8">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
            Ready to Start Your{" "}
            <span className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              Competitive Journey?
            </span>
          </h3>
        </motion.div>

        {/* Description */}
        <motion.p 
          className={`text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed ${
            theme === 'dark' ? 'text-neutral-300' : 'text-gray-600'
          }`}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          Join thousands of players who are already competing, winning, and earning real rewards on OpenTournaments. 
          Your next victory is just a click away.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
        >
          {/* Primary CTA */}
          <motion.div
            whileHover={{ 
              scale: 1.05,
              transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.95 }}
            className="w-full sm:w-auto"
          >
            <Link 
              to="/signup" 
              className="block w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg sm:rounded-xl font-bold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-purple-500/25 text-sm sm:text-base text-center group relative overflow-hidden"
            >
              {/* Shine effect */}
              <div className="absolute inset-0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              
              <span className="relative text-white">Create Your Account Now - It's Free</span>
            </Link>
          </motion.div>

          {/* Secondary CTA */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full sm:w-auto"
          >
            <Link 
              to="/tournaments" 
              className={`block w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border-2 rounded-lg sm:rounded-xl font-bold transition-all duration-300 text-sm sm:text-base text-center group ${
                theme === 'dark' 
                  ? 'border-neutral-600 hover:bg-neutral-800/50 hover:border-neutral-500' 
                  : 'border-gray-300 hover:bg-gray-100 hover:border-gray-400'
              }`}
            >
              <span className={`${
                theme === 'dark' 
                  ? 'bg-gradient-to-r from-neutral-200 to-neutral-400 group-hover:from-purple-300 group-hover:to-blue-300' 
                  : 'bg-gradient-to-r from-gray-700 to-gray-900 group-hover:from-purple-600 group-hover:to-blue-600'
              } bg-clip-text text-transparent`}>
                Explore Live Tournaments
              </span>
            </Link>
          </motion.div>
        </motion.div>

        {/* Additional Info */}
        <motion.div 
          className={`flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm ${
            theme === 'dark' ? 'text-neutral-400' : 'text-gray-500'
          }`}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>No credit card required</span>
          </div>
          <div className="hidden sm:block">•</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span>Setup in 2 minutes</span>
          </div>
          <div className="hidden sm:block">•</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            <span>Instant withdrawals</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function TrustIndicators({ theme }) {
  const indicators = [
    { icon: "🔒", text: "Secure & Encrypted" },
    { icon: "⚡", text: "Instant Payouts" },
    { icon: "🏆", text: "Fair Competition" },
    { icon: "🌍", text: "Global Players" }
  ];

  const bgClass = theme === 'dark' 
    ? 'bg-neutral-800/30 border-neutral-700/50' 
    : 'bg-white/50 border-gray-200/50';

  const textClass = theme === 'dark' ? 'text-neutral-300' : 'text-gray-700';

  return (
    <motion.div 
      className="grid grid-cols-2 gap-3 sm:gap-4 mt-6 sm:mt-8 md:mt-12"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 1 }}
      viewport={{ once: true }}
    >
      {indicators.map((indicator, index) => (
        <motion.div
          key={indicator.text}
          className={`flex flex-col items-center text-center p-3 sm:p-4 rounded-lg sm:rounded-xl backdrop-blur-sm border ${bgClass}`}
          whileHover={{ 
            y: -5,
            backgroundColor: theme === 'dark' ? "rgba(38, 38, 38, 0.5)" : "rgba(255, 255, 255, 0.8)",
            transition: { duration: 0.2 }
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1 + index * 0.1 }}
          viewport={{ once: true }}
        >
          <div className="text-xl sm:text-2xl mb-1 sm:mb-2">{indicator.icon}</div>
          <span className={`text-xs sm:text-sm font-medium ${textClass}`}>{indicator.text}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}