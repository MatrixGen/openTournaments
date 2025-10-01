import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function LandingPage() {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [activeNav, setActiveNav] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      title: "Easy Tournament Joining",
      description: "Sign up in minutes and explore tournaments across different games with one-click registration.",
      icon: "🎮",
      color: "from-purple-500/20 to-blue-500/20"
    },
    {
      title: "Secure Payment System",
      description: "Deposit, play, and withdraw securely using our integrated ClickPesa payment gateway.",
      icon: "💳",
      color: "from-green-500/20 to-blue-500/20"
    },
    {
      title: "Fair Competition",
      description: "Transparent rules and anti-cheat measures ensure fair play for all participants.",
      icon: "⚖️",
      color: "from-orange-500/20 to-red-500/20"
    },
    {
      title: "Live Tracking",
      description: "Real-time match tracking and live standings so you never miss the action.",
      icon: "📊",
      color: "from-cyan-500/20 to-blue-500/20"
    }
  ];

  const stats = [
    { value: "10K+", label: "Active Players" },
    { value: "50+", label: "Tournaments" },
    { value: "$50K+", label: "In Prizes" },
    { value: "24/7", label: "Support" }
  ];

  const games = [
    "FIFA 24", 
    "DLS 25",
    "EFootball", 
    "EA SPORTS FC",
    "Football League 2025",
    "Football Strike:Online Soccer"
  ];

  // Mobile menu component
  const MobileMenu = () => (
    <AnimatePresence>
      {activeNav && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden absolute top-full left-0 right-0 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-700"
        >
          <div className="container mx-auto px-6 py-4">
            <nav className="flex flex-col space-y-4">
              {["Home", "Tournaments", "How It Works", "Leaderboard"].map((item) => (
                <Link 
                  key={item}
                  to={item === "Home" ? "/" : `/${item.toLowerCase().replace(" ", "-")}`}
                  className="text-neutral-300 hover:text-white transition-colors duration-300 font-medium py-2"
                  onClick={() => setActiveNav(false)}
                >
                  {item}
                </Link>
              ))}
              <div className="pt-4 border-t border-neutral-700">
                <Link 
                  to="/signup" 
                  className="block w-full text-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 mb-3"
                  onClick={() => setActiveNav(false)}
                >
                  Get Started
                </Link>
                <Link 
                  to="/login" 
                  className="block w-full text-center px-6 py-3 border border-neutral-600 rounded-lg hover:bg-neutral-800/50 transition-all duration-300"
                  onClick={() => setActiveNav(false)}
                >
                  Sign In
                </Link>
              </div>
            </nav>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white overflow-x-hidden">
      {/* Enhanced Background Elements */}
      <div className="fixed inset-0 overflow-hidden">
        <motion.div 
          className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Enhanced Navbar */}
      <motion.header 
        className="relative z-50 w-full bg-neutral-900/80 backdrop-blur-md border-b border-neutral-700 sticky top-0"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="container mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              OpenTournaments
            </h1>
          </motion.div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-6 lg:space-x-8">
            {["Home", "Tournaments", "How It Works", "Leaderboard"].map((item) => (
              <motion.div key={item} whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
                <Link 
                  to={item === "Home" ? "/" : `/${item.toLowerCase().replace(" ", "-")}`}
                  className="text-neutral-300 hover:text-white transition-colors duration-300 font-medium text-sm lg:text-base"
                >
                  {item}
                </Link>
              </motion.div>
            ))}
          </nav>
          
          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/login" className="px-4 py-2 text-neutral-300 hover:text-white transition-colors duration-300 text-sm lg:text-base">
                Sign In
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link 
                to="/signup" 
                className="px-4 lg:px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-purple-500/25 text-sm lg:text-base"
              >
                Get Started
              </Link>
            </motion.div>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            className="md:hidden p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveNav(!activeNav)}
          >
            <div className="w-6 h-6 flex flex-col justify-center">
              <span className={`block h-0.5 w-6 bg-white transition-all duration-300 ${activeNav ? 'rotate-45 translate-y-0.5' : '-translate-y-1'}`} />
              <span className={`block h-0.5 w-6 bg-white transition-all duration-300 ${activeNav ? 'opacity-0' : 'opacity-100'}`} />
              <span className={`block h-0.5 w-6 bg-white transition-all duration-300 ${activeNav ? '-rotate-45 -translate-y-0.5' : 'translate-y-1'}`} />
            </div>
          </motion.button>
        </div>

        {/* Mobile Menu */}
        <MobileMenu />
      </motion.header>

      {/* Enhanced Hero Section */}
      <motion.section
        className="relative z-10 container mx-auto px-4 sm:px-6 py-12 md:py-24 lg:py-32"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
          {/* Text Content */}
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
          </div>

          {/* Games Grid */}
          <motion.div
            className="lg:w-1/2 w-full max-w-lg lg:max-w-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="relative">
              <motion.div 
                className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur-lg opacity-20"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative bg-neutral-800/50 backdrop-blur-md rounded-2xl p-4 sm:p-6 lg:p-8 border border-neutral-700">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {games.map((game, index) => (
                    <motion.div
                      key={game}
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
                  ))}
                </div>
                <motion.div 
                  className="mt-4 sm:mt-6 text-center text-neutral-400 text-xs sm:text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                >
                  And more games support coming soon
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Enhanced Stats Section */}
      <motion.section 
        className="relative z-10 py-12 sm:py-16 bg-neutral-800/30 backdrop-blur-md"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true, margin: "-50px" }}
      >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {stats.map((stat, index) => (
              <motion.div 
                key={stat.label}
                className="text-center p-4"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-neutral-400 mt-2 text-sm sm:text-base">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Enhanced Features Section */}
      <section className="relative z-10 py-12 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div 
            className="text-center mb-12 sm:mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold">Why Choose OpenTournaments?</h3>
            <p className="text-neutral-400 mt-2 sm:mt-4 max-w-2xl mx-auto text-sm sm:text-base">
              We've built the ultimate platform for competitive gamers who want more than just bragging rights.
            </p>
          </motion.div>

          {/* Mobile Features Carousel */}
          <div className="lg:hidden">
            <div className="relative h-80">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentFeature}
                  className="absolute inset-0 flex flex-col items-center justify-center text-center p-4"
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-r ${features[currentFeature].color} flex items-center justify-center mb-6`}>
                    <span className="text-3xl">{features[currentFeature].icon}</span>
                  </div>
                  <h4 className="text-xl font-bold mb-3">{features[currentFeature].title}</h4>
                  <p className="text-neutral-300 text-sm leading-relaxed">{features[currentFeature].description}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            
            <div className="flex justify-center space-x-3 mt-6">
              {features.map((_, index) => (
                <button
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentFeature ? "bg-purple-500 w-6" : "bg-neutral-600"
                  }`}
                  onClick={() => setCurrentFeature(index)}
                />
              ))}
            </div>
          </div>

          {/* Desktop Features Grid */}
          <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className={`p-6 rounded-2xl bg-neutral-800/50 backdrop-blur-md border border-neutral-700 hover:border-purple-500/30 transition-all duration-300 ${
                  features[currentFeature].title === feature.title ? 'ring-2 ring-purple-500/20' : ''
                }`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                onClick={() => setCurrentFeature(index)}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4`}>
                  <span className="text-2xl">{feature.icon}</span>
                </div>
                <h4 className="text-xl font-bold mb-3">{feature.title}</h4>
                <p className="text-neutral-300 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <motion.section 
        className="relative z-10 py-12 sm:py-20"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">Ready to Start Your Journey?</h3>
            <p className="text-neutral-300 text-sm sm:text-lg mb-6 sm:mb-8">
              Join thousands of players who are already competing and winning on OpenTournaments.
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link 
                to="/signup" 
                className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-purple-500/25 text-sm sm:text-base"
              >
                Create Your Account Now
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Enhanced Footer */}
      <motion.footer 
        className="relative z-10 bg-neutral-900/80 backdrop-blur-md border-t border-neutral-700 py-8"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <motion.div whileHover={{ scale: 1.05 }} className="text-center md:text-left">
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                OpenTournaments
              </h1>
            </motion.div>
            
            <div className="flex flex-wrap justify-center space-x-4 sm:space-x-6">
              {["Privacy", "Terms", "Support", "Contact"].map((item) => (
                <motion.div key={item} whileHover={{ y: -2 }}>
                  <Link 
                    to={`/${item.toLowerCase()}`} 
                    className="text-neutral-400 hover:text-white transition-colors duration-300 text-sm"
                  >
                    {item}
                  </Link>
                </motion.div>
              ))}
            </div>
            
            <div className="text-neutral-400 text-sm text-center md:text-right">
              © {new Date().getFullYear()} OpenTournaments. All rights reserved.
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}