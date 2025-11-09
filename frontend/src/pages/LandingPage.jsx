import React, { useState } from "react";
import { motion } from "framer-motion";
import Footer from "../components/layout/Footer"; // NEW
import { FEATURES } from "../constants/data";
import Hero from "../components/LandingPage/Hero";
import Stats from "../components/LandingPage/Stats";
import Features from "../components/LandingPage/Features";
import CTA from "../components/LandingPage/CTA";
import MobileMenu from "../components/LandingPage/MobileMenu";

export default function LandingPage() {
  const [activeNav, setActiveNav] = useState(false);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white overflow-x-hidden">
      {/* Background Elements */}
      <BackgroundElements />
      
      {/* Header with Mobile Menu */}
      <MobileMenu activeNav={activeNav} setActiveNav={setActiveNav} />

      {/* Main Content */}
      <main>
        <Hero />
        <Stats />
        <Features />
        <CTA /> {/* NEW */}
      </main>

      {/* Footer */}
      <Footer /> {/* NEW */}
    </div>
  );
}

// Background elements component (unchanged)
function BackgroundElements() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
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
  );
}