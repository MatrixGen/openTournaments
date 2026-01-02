// App.jsx - Fixed: ALL routes wrapped in RouteLoadingWrapper
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
//const BrowseMatches = lazy(() => import("./pages/BrowseMatches"));
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

const Transactions = lazy(() => import("./pages/payment/Transactions"));
const Withdrawal = lazy(() => import("./pages/payment/Withdrawal"));

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
import { refreshExchangeRates, setPaymentService } from "./config/currencyConfig";
import paymentService from "./services/paymentService";
import { ToastContainer } from "./components/common/Toast";
import LoadingSpinner from "./components/common/LoadingSpinner";
import PublicProfile from "./pages/PublicProfile";
import UsersPage from "./pages/UsersPage";
// In your router configuration (e.g., App.jsx or routes.jsx)
import ChannelManager from './components/chat/ChannelManager';
//import { useChat } from "./contexts/ChatContext";
import Chat from "./components/chat/Chat";

// Add a route like:



// ✅ ALL routes will use this wrapper to prevent white screens
const RouteLoadingWrapper = ({ children }) => (
  <Suspense fallback={<LoadingSpinner fullPage={true} />}>{children}</Suspense>
);

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
      {/* Public routes - ALL wrapped in RouteLoadingWrapper */}
      <Route
        path="/"
        element={
          <RouteLoadingWrapper>
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      />

      <Route 
        path="/login" 
        element={
          <RouteLoadingWrapper>
            <Login />
          </RouteLoadingWrapper>
        } 
        {...commonRouteProps} 
      />

      <Route 
        path="/signup" 
        element={
          <RouteLoadingWrapper>
            <Signup />
          </RouteLoadingWrapper>
        } 
        {...commonRouteProps} 
      />

      <Route 
        path="/oauth-callback" 
        element={
          <RouteLoadingWrapper>
            <OAuthCallback />
          </RouteLoadingWrapper>
        } 
        {...commonRouteProps} 
      />

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
            <Chat /> 
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      />


      <Route
        path="/channels/:id/chat"
        element={
          <RouteLoadingWrapper>
            <Chat />
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

      {/* Protected routes - ALL wrapped in RouteLoadingWrapper */}
      <Route
        path="/dashboard"
        element={
          <RouteLoadingWrapper>
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      />

      <Route
        path="/my-profile"
        element={
          <RouteLoadingWrapper>
            <ProtectedRoute>
              <MyProfile />
            </ProtectedRoute>
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      />

      <Route
        path="/deposit"
        element={
          <RouteLoadingWrapper>
            <ProtectedRoute>
              <Deposit />
            </ProtectedRoute>
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      />

      <Route
        path="/transactions"
        element={
          <RouteLoadingWrapper>
            <ProtectedRoute>
              <Transactions />
            </ProtectedRoute>
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      />

      <Route
        path="/my-tournaments"
        element={
          <RouteLoadingWrapper>
            <ProtectedRoute>
              <MyTournaments />
            </ProtectedRoute>
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      />

      <Route
        path="/notifications"
        element={
          <RouteLoadingWrapper>
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      />

      <Route
        path="/create-tournament"
        element={
          <RouteLoadingWrapper>
            <ProtectedRoute>
              <CreateTournament />
            </ProtectedRoute>
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      />

      <Route
        path="/tournaments/:id/edit"
        element={
          <RouteLoadingWrapper>
            <ProtectedRoute>
              <EditTournament />
            </ProtectedRoute>
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      />

      <Route
        path="/matches/:id"
        element={
          <RouteLoadingWrapper>
            <ProtectedRoute>
              <MatchDetails />
            </ProtectedRoute>
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      />

      <Route
        path="/friends/requests"
        element={
          <RouteLoadingWrapper>
            <ProtectedRoute>
              <Friends />
            </ProtectedRoute>
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      />

      <Route
        path="/wallet"
        element={
          <RouteLoadingWrapper>
            <ProtectedRoute>
              <Wallet />
            </ProtectedRoute>
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      >
        {/* Default redirect to deposit */}
        <Route index element={<Navigate to="deposit" replace />} />
        
        {/* Nested routes */}
        <Route 
          path="deposit" 
          element={
            <RouteLoadingWrapper>
              <Deposit />
            </RouteLoadingWrapper>
          } 
        />
        <Route 
          path="withdrawal" 
          element={
            <RouteLoadingWrapper>
              <Withdrawal />
            </RouteLoadingWrapper>
          } 
        />
      </Route>

      <Route
        path="/disputes/:id"
        element={
          <RouteLoadingWrapper>
            <ProtectedRoute>
              <DisputeDetails />
            </ProtectedRoute>
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      />

      <Route
        path="/verify-email"
        element={
          <RouteLoadingWrapper>
            <ProtectedRoute>
              <EmailVerification />
            </ProtectedRoute>
          </RouteLoadingWrapper>
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

      <Route path="/player/:userId" element={<PublicProfile />} />
      <Route path="/users" element={<UsersPage />} />
      <Route path="/discover" element={<UsersPage />} />
      <Route path="/channels" element={<ChannelManager />} />

      {/* Optional: 404 route */}
      <Route
        path="*"
        element={
          <RouteLoadingWrapper>
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
              <div className="text-center p-8 max-w-md">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Page not found
                </p>
              </div>
            </div>
          </RouteLoadingWrapper>
        }
      />
    </Routes>
  );
});

AppRoutes.displayName = "AppRoutes";

// ✅ Optimized WebSocket handler with connection pooling
function WebsocketHandler() {
  const { isAuthenticated, user } = useAuth();
  const connectTimeoutRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 3;

  const handleConnect = useCallback(() => {
    if (!isAuthenticated || !user?.id) return;

    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
    }

    const delay = Math.min(
      1000 * Math.pow(1.5, reconnectAttemptRef.current),
      5000
    );

    connectTimeoutRef.current = setTimeout(() => {
      try {
        websocketService.connect();
        reconnectAttemptRef.current = 0;
      } catch (error) {
        console.error("WebSocket connection failed:", error);
        if (reconnectAttemptRef.current < maxReconnectAttempts) {
          reconnectAttemptRef.current++;
          handleConnect();
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

// AppContent.jsx
import { useState} from 'react';
import { useLocation } from 'react-router-dom';
//import Layout from './components/layout/Layout';
//import WebsocketHandler from './components/WebsocketHandler';
///import AppRoutes from './routes/AppRoutes';
import { getHeaderConfigForPath } from './config/headerConfig';

function AppContent() {
  const location = useLocation();
  const [headerProps, setHeaderProps] = useState({});

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
      setTimeout(measurePerformance, 1000);
    }
  }, []);

  // Update header props when route changes
  useEffect(() => {
    const config = getHeaderConfigForPath(location.pathname);
    setHeaderProps(config);
  }, [location.pathname]);

  return (
    <Layout headerProps={headerProps}>
      <WebsocketHandler />
     
      {/* Preload common routes on hover */}
      <div className="sr-only">
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