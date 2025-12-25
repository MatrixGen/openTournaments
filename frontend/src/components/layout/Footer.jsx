import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  CreditCardIcon,
  LockClosedIcon,
  ArrowTopRightOnSquareIcon,
  
} from '@heroicons/react/24/outline';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  


  const paymentMethods = [
    { name: "Visa/Mastercard", icon: CreditCardIcon, color: "text-blue-600 dark:text-blue-400" },
    { name: "Mobile Money", icon: DevicePhoneMobileIcon, color: "text-green-600 dark:text-green-400" },
    { name: "Secure SSL", icon: LockClosedIcon, color: "text-green-600 dark:text-green-400" },
    { name: "Global", icon: GlobeAltIcon, color: "text-purple-600 dark:text-purple-400" }
  ];

  return (
    <footer className="relative z-10 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Bottom Bar */}
        <BottomBar 
          currentYear={currentYear} 
          paymentMethods={paymentMethods} 
        />
      </div>
    </footer>
  );
}

function BottomBar({ currentYear, paymentMethods }) {
  return (
    <div className="py-6 border-t border-gray-200 dark:border-neutral-800 flex flex-col md:flex-row justify-between items-center gap-4">
      {/* Copyright & Legal */}
      <div className="text-center md:text-left">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          © {currentYear} OT Arena. All rights reserved.
        </p>
        <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
          <Link to="/privacy" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            Terms of Service
          </Link>
          <Link to="/cookies" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            Cookie Policy
          </Link>
          <span className="hidden sm:inline">•</span>
          <span className="text-gray-400 dark:text-gray-600">Platform Version 2.1.0</span>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="flex flex-col items-center md:items-end gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Secure Payments:</span>
          <div className="flex space-x-3">
            {paymentMethods.map((method, index) => {
              const Icon = method.icon;
              return (
                <div 
                  key={method.name}
                  className="relative group"
                  title={method.name}
                >
                  <Icon className={`h-5 w-5 ${method.color}`} />
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Industry-standard security and encryption
        </p>
      </div>
    </div>
  );
}