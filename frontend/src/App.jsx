// App.jsx - Optimized with lazy loading and performance features
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import React, {
  useEffect,
  Suspense,
  lazy,
  useMemo,
  useCallback,
  memo,
  useRef,
} from "react";
import { useAuth } from "./contexts/AuthContext";
import websocketService from "./services/websocketService";

// Contexts
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";

// Layout
import Layout from "./components/layout/Layout";

// Core pages (keep non-lazy for critical paths)
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";
import OAuthCallback from "./pages/Auth/OAuthCallbackPage";

// Lazy load all other pages
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const Tournaments = lazy(() => import("./pages/Tournaments/Tournaments"));
const TournamentDetail = lazy(
  () => import("./pages/Tournaments/TournamentDetail")
);
const CreateTournament = lazy(
  () => import("./pages/Tournaments/CreateTournament")
);
const EditTournament = lazy(() => import("./pages/Tournaments/EditTournament"));
const MyTournaments = lazy(() => import("./pages/Tournaments/MyTournaments"));
const BrowseMatches = lazy(() => import("./pages/BrowseMatches"));
const Notifications = lazy(() => import("./pages/Notifications"));
const MatchDetails = lazy(() => import("./pages/MatchDetails"));
const Friends = lazy(() => import("./pages/Friends"));
const Wallet = lazy(() => import("./pages/Wallet"));
const DisputeDetails = lazy(() => import("./pages/DisputeDetails"));
const EmailVerification = lazy(() => import("./pages/Auth/EmailVerification"));
const PasswordReset = lazy(() => import("./pages/Auth/PasswordReset"));
const MyProfile = lazy(() => import("./pages/Dashboard/MyProfile"));
const Deposit = lazy(() => import("./pages/payment/Deposit"));
const Settings = lazy(() => import("./pages/Settings"));
const TournamentChat = lazy(
  () => import("./components/tournament/TournamentChat")
);
const Transactions = lazy(() => import("./pages/payment/Transactions"));

// Support Pages (lazy loaded)
const Support = lazy(() => import("./pages/support/Support"));
const SupportLayout = lazy(() => import("./pages/support/SupportLayout"));
const SupportCategory = lazy(() => import("./pages/support/SupportCategory"));
const SupportTopic = lazy(() => import("./pages/support/SupportTopic"));
const TournamentSupport = lazy(
  () => import("./pages/support/categories/TournamentSupport")
);
const PaymentSupport = lazy(
  () => import("./pages/support/categories/PaymentSupport")
);
const TechnicalSupport = lazy(
  () => import("./pages/support/categories/TechnicalSupport")
);
const AccountSupport = lazy(
  () => import("./pages/support/categories/AccountSupport")
);
const BillingSupport = lazy(
  () => import("./pages/support/categories/BillingSupport")
);

const ENV = "development";

// Components
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";
import ThemeToggle from "./components/common/ThemeToggle";
import Withdrawal from "./pages/payment/Withdrawal";
import { refreshExchangeRates, setPaymentService } from "./config/currencyConfig";
import paymentService from "./services/paymentService";
import { ToastContainer } from "./components/common/Toast";

//import OAuthCallbackPage from "./pages/Auth/OAuthCallbackPage";

// Loading components
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

const RouteLoadingWrapper = ({ children }) => (
  <Suspense fallback={<PageLoadingFallback />}>{children}</Suspense>
);

// ✅ Optimized WebSocket handler with connection pooling
function WebsocketHandler() {
  const { isAuthenticated, user } = useAuth();
  const connectTimeoutRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 3;

  const handleConnect = useCallback(() => {
    if (!isAuthenticated || !user?.id) return;

    // Clear any pending connection attempts
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
    }

    // Exponential backoff for reconnection
    const delay = Math.min(
      1000 * Math.pow(1.5, reconnectAttemptRef.current),
      5000
    );

    connectTimeoutRef.current = setTimeout(() => {
      try {
        websocketService.connect();
        reconnectAttemptRef.current = 0; // Reset on successful connection
      } catch (error) {
        console.error("WebSocket connection failed:", error);
        if (reconnectAttemptRef.current < maxReconnectAttempts) {
          reconnectAttemptRef.current++;
          handleConnect(); // Retry
        }
      }
    }, delay);
  }, [isAuthenticated, user]);

  const handleDisconnect = useCallback(() => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }

    websocketService.disconnect();

    reconnectAttemptRef.current = 0;
  }, []);

  // Monitor auth changes
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      handleConnect();
    } else {
      handleDisconnect();
    }

    return () => {
      handleDisconnect();
    };
  }, [isAuthenticated, user, handleConnect, handleDisconnect]);

  // Reconnect on visibility change (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        isAuthenticated &&
        !websocketService.isConnected
      ) {
        handleConnect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isAuthenticated, handleConnect]);

  return null;
}


// ✅ Memoized routes to prevent re-renders
const AppRoutes = memo(() => {
  const commonRouteProps = useMemo(
    () => ({
      caseSensitive: false,
      end: true,
    }),
    []
  );

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/"
        element={
          <PublicRoute>
            <LandingPage />
          </PublicRoute>
        }
        {...commonRouteProps}
      />

      <Route path="/login" element={<Login />} {...commonRouteProps} />
      <Route path="/signup" element={<Signup />} {...commonRouteProps} />

      <Route path="/oauth-callback" element={<OAuthCallback />} {...commonRouteProps} />

      <Route
        path="/tournaments"
        element={
          <RouteLoadingWrapper>
            <Tournaments />
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      />
      <Route
        path="/tournaments/:id"
        element={
          <RouteLoadingWrapper>
            <TournamentDetail />
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      />
      <Route
        path="/browse-matches"
        element={
          <RouteLoadingWrapper>
            <BrowseMatches />
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      />
      <Route
        path="/password-reset"
        element={
          <RouteLoadingWrapper>
            <PasswordReset />
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      />
      <Route
        path="/tournaments/:id/chat"
        element={
          <RouteLoadingWrapper>
            <TournamentChat />
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      />

      {/* Support Routes - Nested structure */}
      <Route
        path="/support"
        element={
          <RouteLoadingWrapper>
            <SupportLayout />
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      >
        <Route
          index
          element={
            <RouteLoadingWrapper>
              <Support />
            </RouteLoadingWrapper>
          }
        />

        {/* Category routes */}
        <Route
          path=":category"
          element={
            <RouteLoadingWrapper>
              <SupportCategory />
            </RouteLoadingWrapper>
          }
        >
          <Route
            index
            element={
              <RouteLoadingWrapper>
                <SupportCategory />
              </RouteLoadingWrapper>
            }
          />
          <Route
            path=":topic"
            element={
              <RouteLoadingWrapper>
                <SupportTopic />
              </RouteLoadingWrapper>
            }
          />
        </Route>

        {/* Specific support routes for quick access */}
        <Route
          path="tournament"
          element={
            <RouteLoadingWrapper>
              <TournamentSupport />
            </RouteLoadingWrapper>
          }
        />
        <Route
          path="tournament/:topic"
          element={
            <RouteLoadingWrapper>
              <TournamentSupport />
            </RouteLoadingWrapper>
          }
        />

        <Route
          path="payment"
          element={
            <RouteLoadingWrapper>
              <PaymentSupport />
            </RouteLoadingWrapper>
          }
        />
        <Route
          path="payment/deposit"
          element={
            <RouteLoadingWrapper>
              <PaymentSupport initialTab="deposit" />
            </RouteLoadingWrapper>
          }
        />
        <Route
          path="payment/withdrawal"
          element={
            <RouteLoadingWrapper>
              <PaymentSupport initialTab="withdrawal" />
            </RouteLoadingWrapper>
          }
        />
        <Route
          path="payment/refund"
          element={
            <RouteLoadingWrapper>
              <PaymentSupport initialTab="refund" />
            </RouteLoadingWrapper>
          }
        />
        <Route
          path="payment/transaction"
          element={
            <RouteLoadingWrapper>
              <PaymentSupport initialTab="transaction" />
            </RouteLoadingWrapper>
          }
        />

        <Route
          path="technical"
          element={
            <RouteLoadingWrapper>
              <TechnicalSupport />
            </RouteLoadingWrapper>
          }
        />
        <Route
          path="technical/:topic"
          element={
            <RouteLoadingWrapper>
              <TechnicalSupport />
            </RouteLoadingWrapper>
          }
        />

        <Route
          path="account"
          element={
            <RouteLoadingWrapper>
              <AccountSupport />
            </RouteLoadingWrapper>
          }
        />
        <Route
          path="account/:topic"
          element={
            <RouteLoadingWrapper>
              <AccountSupport />
            </RouteLoadingWrapper>
          }
        />

        <Route
          path="billing"
          element={
            <RouteLoadingWrapper>
              <BillingSupport />
            </RouteLoadingWrapper>
          }
        />
        <Route
          path="billing/:topic"
          element={
            <RouteLoadingWrapper>
              <BillingSupport />
            </RouteLoadingWrapper>
          }
        />
      </Route>

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <RouteLoadingWrapper>
              <Dashboard />
            </RouteLoadingWrapper>
          </ProtectedRoute>
        }
        {...commonRouteProps}
      />

      <Route
        path="/my-profile"
        element={
          <ProtectedRoute>
            <RouteLoadingWrapper>
              <MyProfile />
            </RouteLoadingWrapper>
          </ProtectedRoute>
        }
        {...commonRouteProps}
      />
      <Route
        path="/deposit"
        element={
          <ProtectedRoute>
            <RouteLoadingWrapper>
              <Deposit />
            </RouteLoadingWrapper>
          </ProtectedRoute>
        }
        {...commonRouteProps}
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <RouteLoadingWrapper>
              <Transactions />
            </RouteLoadingWrapper>
          </ProtectedRoute>
        }
        {...commonRouteProps}
      />
      <Route
        path="/my-tournaments"
        element={
          <ProtectedRoute>
            <RouteLoadingWrapper>
              <MyTournaments />
            </RouteLoadingWrapper>
          </ProtectedRoute>
        }
        {...commonRouteProps}
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <RouteLoadingWrapper>
              <Notifications />
            </RouteLoadingWrapper>
          </ProtectedRoute>
        }
        {...commonRouteProps}
      />
      <Route
        path="/create-tournament"
        element={
          <ProtectedRoute>
            <RouteLoadingWrapper>
              <CreateTournament />
            </RouteLoadingWrapper>
          </ProtectedRoute>
        }
        {...commonRouteProps}
      />
      <Route
        path="/tournaments/:id/edit"
        element={
          <ProtectedRoute>
            <RouteLoadingWrapper>
              <EditTournament />
            </RouteLoadingWrapper>
          </ProtectedRoute>
        }
        {...commonRouteProps}
      />
      <Route
        path="/matches/:id"
        element={
          <ProtectedRoute>
            <RouteLoadingWrapper>
              <MatchDetails />
            </RouteLoadingWrapper>
          </ProtectedRoute>
        }
        {...commonRouteProps}
      />
      <Route
        path="/friends/requests"
        element={
          <ProtectedRoute>
            <RouteLoadingWrapper>
              <Friends />
            </RouteLoadingWrapper>
          </ProtectedRoute>
        }
        {...commonRouteProps}
      />
      <Route
        path="/wallet"
        element={
          <ProtectedRoute>
            <RouteLoadingWrapper>
              <Wallet />
            </RouteLoadingWrapper>
          </ProtectedRoute>
        }
        {...commonRouteProps}
      >
        {/* Default redirect to deposit */}
        <Route index element={<Navigate to="deposit" replace />} />
        
        {/* Nested routes */}
        <Route path="deposit" element={<Deposit />} />
        <Route path="withdrawal" element={<Withdrawal />} />
      </Route>
      <Route
        path="/disputes/:id"
        element={
          <ProtectedRoute>
            <RouteLoadingWrapper>
              <DisputeDetails />
            </RouteLoadingWrapper>
          </ProtectedRoute>
        }
        {...commonRouteProps}
      />
      <Route
        path="/verify-email"
        element={
          <ProtectedRoute>
            <RouteLoadingWrapper>
              <EmailVerification />
            </RouteLoadingWrapper>
          </ProtectedRoute>
        }
        {...commonRouteProps}
      />
      <Route
        path="/settings"
        element={
          <RouteLoadingWrapper>
            <Settings />
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      />
    </Routes>
  );
});

AppRoutes.displayName = "AppRoutes";

// ✅ Optimized AppContent with performance monitoring
function AppContent() {
  // Performance monitoring
  useEffect(() => {
    if (ENV === "development") {
      const measurePerformance = () => {
        if ("performance" in window) {
          const entries = performance.getEntriesByType("navigation");
          if (entries.length > 0) {
            const navEntry = entries[0];
            console.log("App Load Performance:", {
              dns: navEntry.domainLookupEnd - navEntry.domainLookupStart,
              tcp: navEntry.connectEnd - navEntry.connectStart,
              request: navEntry.responseEnd - navEntry.requestStart,
              domComplete: navEntry.domComplete,
              loadEvent: navEntry.loadEventEnd - navEntry.loadEventStart,
            });
          }
        }
      };

      // Measure after initial load
      setTimeout(measurePerformance, 1000);

      // Log route changes for debugging
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function (...args) {
        console.log("Route changed (push):", args[2]);
        return originalPushState.apply(this, args);
      };

      history.replaceState = function (...args) {
        console.log("Route changed (replace):", args[2]);
        return originalReplaceState.apply(this, args);
      };

      return () => {
        history.pushState = originalPushState;
        history.replaceState = originalReplaceState;
      };
    }
  }, []);

  return (
    <Layout>
      <WebsocketHandler />
     
      {/* Preload common routes on hover */}
      <div className="sr-only">
        {/* Invisible preload triggers */}
        <div
          onMouseEnter={() => import("./pages/Dashboard/Dashboard")}
          data-preload="dashboard"
        />
        <div
          onMouseEnter={() => import("./pages/Tournaments/Tournaments")}
          data-preload="tournaments"
        />
        <div
          onMouseEnter={() => import("./pages/Notifications")}
          data-preload="notifications"
        />
      </div>

      <AppRoutes />
    </Layout>
  );
}

// ✅ Error Boundary for the app (optional but recommended)
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
    // You can log to an error reporting service here
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
          <div className="text-center p-8 max-w-md">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We're sorry for the inconvenience. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary-500 hover:bg-primary-600 text-gray-900 dark:text-white font-medium py-2 px-6 rounded-lg transition-colors"
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
  // Preconnect to important origins
  useEffect(() => {
    // Add preconnect links for external domains
    const preconnectUrls = [
      "https://api.yourdomain.com",
      "https://ws.yourdomain.com",
      "https://cdn.yourdomain.com",
    ];

    preconnectUrls.forEach((url) => {
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = url;
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    });
    refreshExchangeRates()
    setPaymentService(paymentService);
  }, []);


  return (
    <AppErrorBoundary>
      <Router
        future={{
          v7_startTransition: true, // Enable concurrent features
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
