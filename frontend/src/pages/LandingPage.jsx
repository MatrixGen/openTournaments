import React, { useState } from "react";
import { motion } from "framer-motion";
import Footer from "../components/layout/Footer";
import Hero from "../components/LandingPage/Hero";
import Stats from "../components/LandingPage/Stats";
import Features from "../components/LandingPage/Features";
import CTA from "../components/LandingPage/CTA";
import MobileMenu from "../components/LandingPage/MobileMenu";

export default function LandingPage() {
  const [activeNav, setActiveNav] = useState(false);
  const [theme] = useState('dark'); // You can make this dynamic later
  
  return (
    <div className={`min-h-screen bg-gradient-to-br ${
      theme === 'dark' 
        ? 'from-neutral-900 via-neutral-800 to-neutral-900' 
        : 'from-gray-50 via-gray-100 to-gray-50'
    } text-gray-900 dark:text-white overflow-x-hidden`}>
      
      {/* Background Elements */}
      <BackgroundElements theme={theme} />
      
      {/* Header with Mobile Menu */}
      <MobileMenu activeNav={activeNav} setActiveNav={setActiveNav} theme={theme} />

      {/* Main Content */}
      <main>
        <Hero theme={theme} />
        <Stats theme={theme} />
        <Features theme={theme} />
        <CTA theme={theme} />
      </main>

      {/* Footer */}
      <Footer theme={theme} />
    </div>
  );
}

// Background elements component with theme support
function BackgroundElements({ theme }) {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <motion.div 
        className={`absolute -top-40 -right-40 w-80 h-80 ${
          theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-500/5'
        } rounded-full blur-3xl`}
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className={`absolute -bottom-40 -left-40 w-80 h-80 ${
          theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-500/5'
        } rounded-full blur-3xl`}
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.5, 0.3, 0.5]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}