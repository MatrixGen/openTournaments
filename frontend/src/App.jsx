// App.jsx - Fixed: ALL routes wrapped in RouteLoadingWrapper
import { BrowserRouter as Router} from "react-router-dom";
import React, { useEffect, Suspense } from "react";

// Contexts
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";



const ENV = "development";

import {
  refreshExchangeRates,
  setPaymentService,
} from "./config/currencyConfig";
import paymentService from "./services/paymentService";
import { ToastContainer } from "./components/common/Toast";
import AppContent from "./AppContent";



// ✅ Error Boundary
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
          <div className="text-center p-8 max-w-md">
            <div className="text-red-500 text-6xl mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We're sorry for the inconvenience. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  useEffect(() => {
    const preconnectUrls = [
      "https://api.open-tournament.com",
      "https://ws.open-tournament.com",
      "https://chatapi.open-tournament.com",
    ];

    preconnectUrls.forEach((url) => {
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = url;
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    });

    refreshExchangeRates();
    setPaymentService(paymentService);
  }, []);

  return (
    <AppErrorBoundary>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <NotificationProvider>
            <AppContent />
            <ToastContainer />
          </NotificationProvider>
        </AuthProvider>
      </Router>
    </AppErrorBoundary>
  );
}
