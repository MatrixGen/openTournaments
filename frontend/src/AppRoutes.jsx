import { memo } from "react";
import { useMemo } from "react";

// App.jsx - Fixed: ALL routes wrapped in RouteLoadingWrapper
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  
} from "react-router-dom";
import React, {
 
  lazy,
  
  
} from "react";

// Core pages (keep non-lazy for critical paths)
import LandingPage from "./pages/common/LandingPage";
import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";
import OAuthCallback from "./pages/Auth/OAuthCallbackPage";

// Lazy load all other pages
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const Tournaments = lazy(() => import("./pages/Tournaments/Tournaments"));
const TournamentDetail = lazy(() =>
  import("./pages/Tournaments/TournamentDetail")
);
const CreateTournament = lazy(() =>
  import("./pages/Tournaments/CreateTournament")
);
const EditTournament = lazy(() => import("./pages/Tournaments/EditTournament"));
const MyTournaments = lazy(() => import("./pages/Tournaments/MyTournaments"));
//const BrowseMatches = lazy(() => import("./pages/BrowseMatches"));
const Notifications = lazy(() => import("./pages/common/Notifications"));
const MatchPage = lazy(() => import("./pages/Match/MatchPage"));
const Friends = lazy(() => import("./pages/Friends"));
const Wallet = lazy(() => import("./pages/Wallet"));
const DisputeDetails = lazy(() => import("./pages/DisputeDetails"));
const EmailVerification = lazy(() => import("./pages/Auth/EmailVerification"));
const PasswordReset = lazy(() => import("./pages/Auth/PasswordReset"));
const MyProfile = lazy(() => import("./pages/Dashboard/MyProfile"));
const Deposit = lazy(() => import("./pages/payment/Deposit"));
const Settings = lazy(() => import("./pages/common/Settings"));
const AdminGames = lazy(() => import("./pages/admin/AdminGames"));

const Transactions = lazy(() => import("./pages/payment/Transactions"));
const Withdrawal = lazy(() => import("./pages/payment/Withdrawal"));

// Support Pages (lazy loaded)
const Support = lazy(() => import("./pages/support/Support"));
const SupportLayout = lazy(() => import("./pages/support/SupportLayout"));
const SupportCategory = lazy(() => import("./pages/support/SupportCategory"));
const SupportTopic = lazy(() => import("./pages/support/SupportTopic"));
const TournamentSupport = lazy(() =>
  import("./pages/support/categories/TournamentSupport")
);
const PaymentSupport = lazy(() =>
  import("./pages/support/categories/PaymentSupport")
);
const TechnicalSupport = lazy(() =>
  import("./pages/support/categories/TechnicalSupport")
);
const AccountSupport = lazy(() =>
  import("./pages/support/categories/AccountSupport")
);
const BillingSupport = lazy(() =>
  import("./pages/support/categories/BillingSupport")
);

const ENV = "development";

// Components
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";

import PublicProfile from "./pages/PublicProfile";
import UsersPage from "./pages/UsersPage";
// In your router configuration (e.g., App.jsx or routes.jsx)
import ChannelManager from "./pages/squads/ChannelManager";
import CreateSquad from "./pages/squads/CreateSquad";
//import { useChat } from "./contexts/ChatContext";
import Chat from "./components/chat/Chat";
import RouteLoadingWrapper from "./components/common/RouteLoadingWrapper";
import RecordingsPage from './pages/RecordingsPage'

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
        path="/squads/:id/chat"
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
              <MatchPage />
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

      <Route
        path="/admin/games"
        element={
          <RouteLoadingWrapper>
            <ProtectedRoute>
              <AdminGames />
            </ProtectedRoute>
          </RouteLoadingWrapper>
        }
        {...commonRouteProps}
      />

      <Route path="/player/:userId" element={<PublicProfile />} />
      <Route path="/users" element={<UsersPage />} />
      <Route path="/discover" element={<UsersPage />} />
      <Route path="/squads" element={<ChannelManager />} />
      <Route path="/squads/create" element={<CreateSquad />} />
      <Route path="/recordings" element={<RecordingsPage />} />

      {/* Optional: 404 route */}
      <Route
        path="*"
        element={
          <RouteLoadingWrapper>
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
              <div className="text-center p-8 max-w-md">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  404
                </h1>
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

export default AppRoutes

AppRoutes.displayName = "AppRoutes";
