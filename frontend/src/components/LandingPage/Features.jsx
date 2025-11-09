import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FEATURES } from '../../constants/data';
import { useFeatureRotation } from '../../hooks/useFeatureRotation';

export default function Features() {
  const { currentFeature, setCurrentFeature } = useFeatureRotation(FEATURES);

  return (
    <section className="relative z-10 py-12 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <SectionHeader />
        
        {/* Mobile Features Carousel */}
        <MobileFeaturesCarousel 
          currentFeature={currentFeature}
          setCurrentFeature={setCurrentFeature}
        />
        
        {/* Desktop Features Grid */}
        <DesktopFeaturesGrid 
          currentFeature={currentFeature}
          setCurrentFeature={setCurrentFeature}
        />
      </div>
    </section>
  );
}

function SectionHeader() {
  return (
    <motion.div 
      className="text-center mb-12 sm:mb-16"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true, margin: "-50px" }}
    >
      <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold">
        Why Choose OpenTournaments?
      </h3>
      <p className="text-neutral-400 mt-2 sm:mt-4 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
        We've built the ultimate platform for competitive gamers who want more than just bragging rights. 
        Real rewards, real competition.
      </p>
    </motion.div>
  );
}

function MobileFeaturesCarousel({ currentFeature, setCurrentFeature }) {
  return (
    <div className="lg:hidden">
      <div className="relative h-80 sm:h-96">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentFeature}
            className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 sm:p-6"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
          >
            <motion.div 
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-r ${FEATURES[currentFeature].color} flex items-center justify-center mb-6 shadow-lg`}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <span className="text-3xl sm:text-4xl">{FEATURES[currentFeature].icon}</span>
            </motion.div>
            <h4 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 px-4">
              {FEATURES[currentFeature].title}
            </h4>
            <p className="text-neutral-300 text-sm sm:text-base leading-relaxed sm:leading-loose px-2">
              {FEATURES[currentFeature].description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Enhanced Pagination Dots */}
      <div className="flex justify-center space-x-3 mt-6 sm:mt-8">
        {FEATURES.map((_, index) => (
          <motion.button
            key={index}
            className={`relative rounded-full transition-all duration-300 ${
              index === currentFeature 
                ? "bg-gradient-to-r from-purple-500 to-blue-500" 
                : "bg-neutral-600 hover:bg-neutral-500"
            }`}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrentFeature(index)}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className={`w-3 h-3 ${index === currentFeature ? 'w-8' : ''}`} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function DesktopFeaturesGrid({ currentFeature, setCurrentFeature }) {
  return (
    <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
      {FEATURES.map((feature, index) => (
        <FeatureCard
          key={feature.title}
          feature={feature}
          index={index}
          isActive={currentFeature === index}
          onClick={() => setCurrentFeature(index)}
        />
      ))}
    </div>
  );
}

function FeatureCard({ feature, index, isActive, onClick }) {
  return (
    <motion.div
      className={`relative p-6 rounded-2xl backdrop-blur-md border transition-all duration-300 cursor-pointer group ${
        isActive 
          ? 'bg-neutral-800/70 border-purple-500/50 ring-2 ring-purple-500/20 shadow-lg shadow-purple-500/10' 
          : 'bg-neutral-800/50 border-neutral-700 hover:border-purple-500/30 hover:bg-neutral-800/70'
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
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div 
          className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        />
      )}
      
      <div className="flex items-start space-x-4">
        <motion.div 
          className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center flex-shrink-0 shadow-lg`}
          whileHover={{ 
            scale: 1.1,
            rotate: isActive ? 0 : 5
          }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <span className="text-2xl">{feature.icon}</span>
        </motion.div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-xl font-bold mb-3 text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-blue-400 group-hover:bg-clip-text">
            {feature.title}
          </h4>
          <p className="text-neutral-300 leading-relaxed text-sm sm:text-base">
            {feature.description}
          </p>
        </div>
      </div>

      {/* Hover gradient effect */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-2xl opacity-0 group-hover:opacity-100 -z-10"
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}