import React from 'react';
import { Link } from 'react-router-dom';
import { motion,AnimatePresence } from 'framer-motion';
import { GAMES } from '../../constants/data';
import { useGameCarousel } from '../../hooks/useGameCarousel';

export default function Hero() {
  return (
    <motion.section
      className="relative z-10 container mx-auto px-4 sm:px-6 py-12 md:py-24 lg:py-32"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
        {/* Text Content */}
        <HeroContent />
        
        {/* Games Carousel - REPLACED GamesGrid */}
        <GamesCarousel />
      </div>
    </motion.section>
  );
}

function HeroContent() {
  return (
    <div className="lg:w-1/2 space-y-6 lg:space-y-8 text-center lg:text-left">
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
          Compete, Win, and{" "}
          <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Earn Real Rewards
          </span>
        </h2>
        <p className="text-base sm:text-lg md:text-xl text-neutral-300 mt-4 lg:mt-6 leading-relaxed">
          Join the ultimate gaming platform where skill meets opportunity. 
          Compete in thrilling tournaments, challenge elite players, and 
          secure instant payouts directly to your account.
        </p>
      </motion.div>
      
      {/* CTA Buttons */}
      <CTAButtons />
    </div>
  );
}

function CTAButtons() {
  return (
    <motion.div 
      className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6 }}
    >
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Link 
          to="/signup" 
          className="block px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-center font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 text-sm sm:text-base"
        >
          Start Competing Now
        </Link>
      </motion.div>
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Link 
          to="/tournaments" 
          className="block px-6 sm:px-8 py-3 sm:py-4 border border-neutral-600 rounded-lg text-center font-semibold hover:bg-neutral-800/50 transition-all duration-300 text-sm sm:text-base"
        >
          Browse Tournaments
        </Link>
      </motion.div>
    </motion.div>
  );
}


// Replace the existing GamesGrid function with this:
function GamesCarousel() {
  const { 
    currentGameIndex, 
    currentGame, 
    direction,
    nextGame, 
    prevGame, 
    goToGame, 
    isPaused, 
    setIsPaused 
  } = useGameCarousel(GAMES, 3000);

  return (
    <motion.div
      className="lg:w-1/2 w-full max-w-lg lg:max-w-none"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.4 }}
    >
      <div className="relative">
        {/* Animated Background */}
        <motion.div 
          className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur-lg opacity-20"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        
        <div 
          className="relative bg-neutral-800/50 backdrop-blur-md rounded-2xl p-6 sm:p-8 lg:p-10 border border-neutral-700"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Carousel Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
              Featured Game
            </h3>
            <p className="text-neutral-400 text-sm">
              Discover our supported games
            </p>
          </div>

          {/* Main Carousel Content */}
          <div className="relative h-48 sm:h-56 lg:h-64 mb-6 sm:mb-8">
            <AnimatePresence mode="wait" custom={direction}>
  <motion.div
    key={currentGameIndex}
    custom={direction}
    initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
    transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
    className="absolute inset-0 flex flex-col items-center justify-center"
  >
    {/* Background Logo/Image */}
    {currentGame.logo.length <= 3 ? (
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
        <span className="text-9xl sm:text-[12rem] lg:text-[14rem]">{currentGame.logo}</span>
      </div>
    ) : (
      <img
        src={currentGame.logo}
        alt={currentGame.name}
        className="absolute inset-0 w-full h-full object-contain opacity-20 pointer-events-none"
      />
    )}

    {/* Foreground content */}
    <div className="relative flex flex-col items-center justify-center space-y-4 sm:space-y-6">
      {/* Game Name */}
      <motion.h4
        className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white text-center px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        {currentGame.name}
      </motion.h4>

      {/* CTA Button */}
      <motion.button
        className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white text-base sm:text-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        View Tournaments
      </motion.button>
    </div>
  </motion.div>
</AnimatePresence>



            {/* Navigation Arrows */}
            <button
              onClick={prevGame}
              className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-neutral-700/80 hover:bg-neutral-600 rounded-full flex items-center justify-center transition-all duration-300 group"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <span className="text-white group-hover:text-purple-400 transition-colors">←</span>
            </button>
            
            <button
              onClick={nextGame}
              className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-neutral-700/80 hover:bg-neutral-600 rounded-full flex items-center justify-center transition-all duration-300 group"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <span className="text-white group-hover:text-purple-400 transition-colors">→</span>
            </button>
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center space-x-2 sm:space-x-3 mb-4">
            {GAMES.map((_, index) => (
              <button
                key={index}
                onClick={() => goToGame(index)}
                className={`relative rounded-full transition-all duration-300 ${
                  index === currentGameIndex 
                    ? "bg-gradient-to-r from-purple-500 to-blue-500" 
                    : "bg-neutral-600 hover:bg-neutral-500"
                }`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              >
                <div className={`w-2 h-2 sm:w-3 sm:h-3 ${index === currentGameIndex ? 'sm:w-6' : ''}`} />
                
                {/* Progress indicator for active dot */}
                {index === currentGameIndex && !isPaused && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-purple-500"
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* All Games Grid (Mini Preview) */}
          <div className="border-t border-neutral-700 pt-4 sm:pt-6">
            <p className="text-center text-neutral-400 text-xs sm:text-sm mb-3">
              All Supported Games
            </p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {GAMES.slice(0, 3).map((game, index) => (
                <motion.div
                    key={game.name}
                    className={`flex items-center justify-center p-2 sm:p-3 rounded-lg cursor-pointer transition-all duration-300 ${
                        index === currentGameIndex 
                        ? 'bg-neutral-700/80 ring-2 ring-purple-500/50' 
                        : 'bg-neutral-700/40 hover:bg-neutral-700/60'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => goToGame(index)}
                    >
                    {game.logo.length <= 3 ? (
                        <span className="text-lg sm:text-xl">{game.logo}</span>
                    ) : (
                        <img
                        src={game.logo}
                        alt={game.name}
                        className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-md"
                        />
                    )}
                </motion.div>

              ))}
            </div>
          </div>

          {/* Auto-play Status */}
          <motion.div 
            className="flex items-center justify-center mt-4 text-neutral-500 text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className={`w-2 h-2 rounded-full mr-2 ${isPaused ? 'bg-yellow-500' : 'bg-green-500'}`} />
            {isPaused ? 'Paused' : 'Auto-playing'}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function GameCard({ game, index }) {
  return (
    <motion.div
      className="bg-neutral-700/50 rounded-lg p-3 sm:p-4 text-center hover:bg-neutral-600/50 transition-colors duration-300 cursor-pointer"
      whileHover={{ y: -5 }}
      whileTap={{ y: 0 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
    >
      <div className="text-xl sm:text-2xl mb-1 sm:mb-2">🎮</div>
      <span className="text-xs sm:text-sm font-medium">{game}</span>
    </motion.div>
  );
}