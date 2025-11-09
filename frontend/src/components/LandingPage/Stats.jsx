import React from 'react';
import { motion } from 'framer-motion';
import { STATS } from '../../constants/data';

export default function Stats() {
  return (
    <motion.section 
      className="relative z-10 py-12 sm:py-16 bg-neutral-800/30 backdrop-blur-md"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true, margin: "-50px" }}
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
          {STATS.map((stat, index) => (
            <StatItem 
              key={stat.label}
              stat={stat}
              index={index}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function StatItem({ stat, index }) {
  return (
    <motion.div 
      className="text-center p-4 group cursor-pointer"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ 
        scale: 1.05,
        transition: { duration: 0.2 }
      }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.1,
        type: "spring",
        stiffness: 100
      }}
      viewport={{ once: true, margin: "-20px" }}
    >
      {/* Animated background on hover */}
      <div className="relative">
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl opacity-0 group-hover:opacity-100"
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.3 }}
        />
        
        {/* Content */}
        <div className="relative">
          <motion.div 
            className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2"
            whileInView={{
              scale: [0.8, 1.1, 1],
              opacity: [0, 1, 1]
            }}
            transition={{
              duration: 0.6,
              delay: index * 0.1 + 0.2,
              times: [0, 0.6, 1]
            }}
            viewport={{ once: true }}
          >
            {stat.value}
          </motion.div>
          
          <motion.div 
            className="text-neutral-400 text-sm sm:text-base font-medium"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: index * 0.1 + 0.4 }}
            viewport={{ once: true }}
          >
            {stat.label}
          </motion.div>
        </div>
      </div>

      {/* Progress bar animation for mobile */}
      <motion.div 
        className="h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mt-3 opacity-0 group-hover:opacity-100 md:hidden"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
        viewport={{ once: true }}
      />
    </motion.div>
  );
}