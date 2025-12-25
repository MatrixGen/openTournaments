import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GAMES } from '../../constants/data';
import { useGameCarousel } from '../../hooks/useGameCarousel';

export default function Hero({ theme = 'dark' }) {
  const textColor = theme === 'dark' ? 'text-gray-900 dark:text-white' : 'text-gray-900';
  const subtitleColor = theme === 'dark' ? 'text-neutral-300' : 'text-gray-700';

  return (
    <motion.section
      className="relative z-10 container mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-20 lg:py-28"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8 lg:gap-12">
        {/* Text Content */}
        <HeroContent theme={theme} textColor={textColor} subtitleColor={subtitleColor} />
        
        {/* Games Carousel */}
        <GamesCarousel theme={theme} />
      </div>
    </motion.section>
  );
}

function HeroContent({ theme, textColor, subtitleColor }) {
  const bgClass = theme === 'dark' ? 'bg-neutral-800/50' : 'bg-gray-100/50';

  return (
    <div className="lg:w-1/2 space-y-4 sm:space-y-6 lg:space-y-8 text-center lg:text-left">
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="relative"
      >
        <div className={`inline-block px-3 py-1 rounded-full ${bgClass} text-xs sm:text-sm mb-4`}>
           Tournament Gaming Platform
        </div>
        <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight ${textColor}`}>
          Compete, Win, and{" "}
          <span className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
            Earn Real Rewards
          </span>
        </h2>
        <p className={`text-sm sm:text-base md:text-lg ${subtitleColor} mt-3 sm:mt-4 lg:mt-6 leading-relaxed`}>
          Join the ultimate gaming platform where skill meets opportunity. 
          Compete in thrilling tournaments, challenge elite players, and 
          secure instant payouts directly to your account.
        </p>
      </motion.div>
      
      {/* CTA Buttons */}
      <CTAButtons theme={theme} />
    </div>
  );
}

function CTAButtons({ theme }) {
  const primaryBtnClass = theme === 'dark' 
    ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700' 
    : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600';
  
  const secondaryBtnClass = theme === 'dark' 
    ? 'border border-neutral-600 hover:bg-neutral-800/50' 
    : 'border border-gray-300 hover:bg-gray-100';

  return (
    <motion.div 
      className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6 }}
    >
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full sm:w-auto">
        <Link 
          to="/signup" 
          className={`block w-full px-5 sm:px-6 py-3 rounded-lg text-center font-semibold transition-all duration-300 text-sm sm:text-base text-gray-900 dark:text-white ${primaryBtnClass}`}
        >
          Start Competing Now
        </Link>
      </motion.div>
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full sm:w-auto">
        <Link 
          to="/tournaments" 
          className={`block w-full px-5 sm:px-6 py-3 rounded-lg text-center font-semibold transition-all duration-300 text-sm sm:text-base ${secondaryBtnClass} ${
            theme === 'dark' ? 'text-gray-900 dark:text-white' : 'text-gray-800'
          }`}
        >
          Browse Tournaments
        </Link>
      </motion.div>
    </motion.div>
  );
}

// Games Carousel Component
function GamesCarousel({ theme }) {
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

  const bgClass = theme === 'dark' 
    ? 'bg-neutral-800/50 border-neutral-700' 
    : 'bg-white/80 border-gray-200';
  
  const textColor = theme === 'dark' ? 'text-gray-900 dark:text-white' : 'text-gray-900';
  const subtextColor = theme === 'dark' ? 'text-neutral-400' : 'text-gray-600';

  return (
    <motion.div
      className="lg:w-1/2 w-full max-w-lg lg:max-w-none mt-8 sm:mt-0"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.4 }}
    >
      <div className="relative">
        {/* Animated Background */}
        <motion.div 
          className="absolute -inset-2 sm:-inset-3 bg-gradient-to-r from-purple-500 to-blue-500 dark:from-purple-600 dark:to-blue-600 rounded-xl sm:rounded-2xl blur-lg opacity-10 dark:opacity-20"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        
        <div 
          className={`relative backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border ${bgClass}`}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Carousel Header */}
          <div className="text-center mb-4 sm:mb-6">
            <h3 className={`text-base sm:text-lg font-bold ${textColor} mb-1`}>
              Featured Game
            </h3>
            <p className={`text-xs sm:text-sm ${subtextColor}`}>
              Discover our supported games
            </p>
          </div>

          {/* Main Carousel Content */}
          <div className="relative h-40 sm:h-48 md:h-56 mb-4 sm:mb-6">
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
                  <div className="absolute inset-0 flex items-center justify-center opacity-10 sm:opacity-20">
                    <span className="text-7xl sm:text-8xl md:text-9xl">{currentGame.logo}</span>
                  </div>
                ) : (
                  <img
                    src={currentGame.logo}
                    alt={currentGame.name}
                    className="absolute inset-0 w-full h-full object-contain opacity-10 sm:opacity-20 pointer-events-none"
                    loading="lazy"
                  />
                )}

                {/* Foreground content */}
                <div className="relative flex flex-col items-center justify-center space-y-3 sm:space-y-4">
                  {/* Game Name */}
                  <motion.h4
                    className={`text-xl sm:text-2xl md:text-3xl font-bold text-center px-4 ${textColor}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                  >
                    {currentGame.name}
                  </motion.h4>

                  {/* CTA Button */}
                  <motion.button
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-gray-900 dark:text-white text-sm sm:text-base font-medium hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg"
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
              className={`absolute left-1 sm:left-2 top-1/2 transform -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 group ${
                theme === 'dark' 
                  ? 'bg-neutral-700/80 hover:bg-neutral-600' 
                  : 'bg-gray-300/80 hover:bg-gray-400'
              }`}
              aria-label="Previous game"
            >
              <span className={`group-hover:text-purple-500 transition-colors ${
                theme === 'dark' ? 'text-gray-900 dark:text-white' : 'text-gray-700'
              }`}>←</span>
            </button>
            
            <button
              onClick={nextGame}
              className={`absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 group ${
                theme === 'dark' 
                  ? 'bg-neutral-700/80 hover:bg-neutral-600' 
                  : 'bg-gray-300/80 hover:bg-gray-400'
              }`}
              aria-label="Next game"
            >
              <span className={`group-hover:text-purple-500 transition-colors ${
                theme === 'dark' ? 'text-gray-900 dark:text-white' : 'text-gray-700'
              }`}>→</span>
            </button>
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center space-x-1.5 sm:space-x-2 mb-3 sm:mb-4">
            {GAMES.map((_, index) => (
              <button
                key={index}
                onClick={() => goToGame(index)}
                className={`relative rounded-full transition-all duration-300 focus:outline-none ${
                  index === currentGameIndex 
                    ? "bg-gradient-to-r from-purple-500 to-blue-500" 
                    : theme === 'dark' 
                      ? "bg-neutral-600 hover:bg-neutral-500" 
                      : "bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Go to game ${index + 1}`}
              >
                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 ${
                  index === currentGameIndex ? 'sm:w-5' : ''
                }`} />
                
                {/* Progress indicator for active dot */}
                {index === currentGameIndex && !isPaused && (
                  <motion.div
                    className="absolute inset-0 rounded-full border border-purple-500"
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
          <div className={`border-t pt-3 sm:pt-4 ${
            theme === 'dark' ? 'border-neutral-700' : 'border-gray-200'
          }`}>
            <p className={`text-center text-xs sm:text-sm mb-2 ${subtextColor}`}>
              All Supported Games
            </p>
            <div className="grid grid-cols-3 gap-2">
              {GAMES.slice(0, 3).map((game, index) => (
                <motion.button
                  key={game.name}
                  className={`flex items-center justify-center p-2 rounded-lg transition-all duration-300 ${
                    index === currentGameIndex 
                      ? theme === 'dark'
                        ? 'bg-neutral-700/80 ring-2 ring-purple-500/50'
                        : 'bg-gray-200 ring-2 ring-purple-500/30'
                      : theme === 'dark'
                        ? 'bg-neutral-700/40 hover:bg-neutral-700/60'
                        : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => goToGame(index)}
                  aria-label={`Switch to ${game.name}`}
                >
                  {game.logo.length <= 3 ? (
                    <span className="text-base sm:text-lg">{game.logo}</span>
                  ) : (
                    <img
                      src={game.logo}
                      alt={game.name}
                      className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-md"
                      loading="lazy"
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Auto-play Status */}
          <div 
            className={`flex items-center justify-center mt-3 text-xs ${subtextColor}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
              isPaused ? 'bg-yellow-500' : 'bg-green-500'
            }`} />
            {isPaused ? 'Paused' : 'Auto-playing'}
          </div>
        </div>
      </div>
    </motion.div>
  );
}