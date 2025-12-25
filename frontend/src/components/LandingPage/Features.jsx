import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FEATURES } from '../../constants/data';

export default function Features({ theme = 'dark' }) {
  const [currentFeature, setCurrentFeature] = useState(0);

  // Auto-rotate features on mobile
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % FEATURES.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative z-10 py-8 sm:py-12 md:py-20">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <SectionHeader theme={theme} />
        
        {/* Mobile Features Carousel */}
        <MobileFeaturesCarousel 
          currentFeature={currentFeature}
          setCurrentFeature={setCurrentFeature}
          theme={theme}
        />
        
        {/* Desktop Features Grid */}
        <DesktopFeaturesGrid 
          currentFeature={currentFeature}
          setCurrentFeature={setCurrentFeature}
          theme={theme}
        />
      </div>
    </section>
  );
}

function SectionHeader({ theme }) {
  const textClass = theme === 'dark' ? 'text-neutral-400' : 'text-gray-600';

  return (
    <motion.div 
      className="text-center mb-8 sm:mb-12 md:mb-16"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true, margin: "-50px" }}
    >
      <h3 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold ${
        theme === 'dark' ? 'text-gray-900 dark:text-white' : 'text-gray-900'
      }`}>
        Why Choose OpenTournaments?
      </h3>
      <p className={`mt-2 sm:mt-4 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed ${textClass}`}>
        We've built the ultimate platform for competitive gamers who want more than just bragging rights. 
        Real rewards, real competition.
      </p>
    </motion.div>
  );
}

function MobileFeaturesCarousel({ currentFeature, setCurrentFeature, theme }) {
  const bgClass = theme === 'dark' 
    ? 'bg-neutral-800/70 border-purple-500/50' 
    : 'bg-white/90 border-purple-500/30';
  
  const textClass = theme === 'dark' ? 'text-neutral-300' : 'text-gray-700';

  return (
    <div className="lg:hidden">
      <div className="relative h-64 sm:h-72 md:h-80">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentFeature}
            className={`absolute inset-0 flex flex-col items-center justify-center text-center p-4 sm:p-6 rounded-2xl border ${bgClass}`}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
          >
            <motion.div 
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-r ${FEATURES[currentFeature].color} flex items-center justify-center mb-4 shadow-lg`}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <span className="text-2xl sm:text-3xl">{FEATURES[currentFeature].icon}</span>
            </motion.div>
            <h4 className={`text-lg sm:text-xl font-bold mb-2 sm:mb-3 px-4 ${
              theme === 'dark' ? 'text-gray-900 dark:text-white' : 'text-gray-900'
            }`}>
              {FEATURES[currentFeature].title}
            </h4>
            <p className={`text-sm leading-relaxed px-2 ${textClass}`}>
              {FEATURES[currentFeature].description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Enhanced Pagination Dots */}
      <div className="flex justify-center space-x-2 sm:space-x-3 mt-4 sm:mt-6">
        {FEATURES.map((_, index) => (
          <motion.button
            key={index}
            className={`relative rounded-full transition-all duration-300 focus:outline-none ${
              index === currentFeature 
                ? "bg-gradient-to-r from-purple-500 to-blue-500" 
                : theme === 'dark' 
                  ? "bg-neutral-600 hover:bg-neutral-500" 
                  : "bg-gray-300 hover:bg-gray-400"
            }`}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrentFeature(index)}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 }}
            aria-label={`View feature ${index + 1}`}
          >
            <div className={`w-2 h-2 sm:w-3 sm:h-3 ${index === currentFeature ? 'w-6 sm:w-8' : ''}`} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function DesktopFeaturesGrid({ currentFeature, setCurrentFeature, theme }) {
  return (
    <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
      {FEATURES.map((feature, index) => (
        <FeatureCard
          key={feature.title}
          feature={feature}
          index={index}
          isActive={currentFeature === index}
          onClick={() => setCurrentFeature(index)}
          theme={theme}
        />
      ))}
    </div>
  );
}

function FeatureCard({ feature, index, isActive, onClick, theme }) {
  const activeClass = theme === 'dark' 
    ? 'bg-neutral-800/70 border-purple-500/50 ring-2 ring-purple-500/20 shadow-lg shadow-purple-500/10' 
    : 'bg-white/80 border-purple-500/30 ring-2 ring-purple-500/10 shadow-lg shadow-purple-500/5';
  
  const inactiveClass = theme === 'dark' 
    ? 'bg-neutral-800/50 border-neutral-700 hover:border-purple-500/30 hover:bg-neutral-800/70' 
    : 'bg-white/60 border-gray-200 hover:border-purple-500/20 hover:bg-white/80';

  const textColor = theme === 'dark' ? 'text-gray-900 dark:text-white' : 'text-gray-900';
  const descColor = theme === 'dark' ? 'text-neutral-300' : 'text-gray-700';

  return (
    <motion.div
      className={`relative p-4 sm:p-6 rounded-xl md:rounded-2xl backdrop-blur-sm border transition-all duration-300 cursor-pointer group ${
        isActive ? activeClass : inactiveClass
      }`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ 
        y: -8,
        transition: { duration: 0.3, type: "spring", stiffness: 200 }
      }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.1,
        type: "spring",
        stiffness: 100
      }}
      viewport={{ once: true, margin: "-50px" }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`View feature: ${feature.title}`}
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div 
          className="absolute -top-2 -right-2 w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        />
      )}
      
      <div className="flex items-start space-x-3 sm:space-x-4">
        <motion.div 
          className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center flex-shrink-0 shadow-lg`}
          whileHover={{ 
            scale: 1.1,
            rotate: isActive ? 0 : 5
          }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <span className="text-xl sm:text-2xl">{feature.icon}</span>
        </motion.div>
        
        <div className="flex-1 min-w-0">
          <h4 className={`text-base sm:text-lg md:text-xl font-bold mb-2 sm:mb-3 ${textColor} group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-500 group-hover:to-blue-500 group-hover:bg-clip-text`}>
            {feature.title}
          </h4>
          <p className={`text-sm sm:text-base leading-relaxed ${descColor}`}>
            {feature.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}