// App.jsx - Updated with clean support routes
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import websocketService from "./services/websocketService";

// Contexts
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";

// Layout
import Layout from "./components/layout/Layout";

// Pages
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";
import Dashboard from "./pages/Dashboard/Dashboard";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Tournaments from "./pages/Tournaments/Tournaments";
import TournamentDetail from "./pages/Tournaments/TournamentDetail";
import CreateTournament from "./pages/Tournaments/CreateTournament";
import EditTournament from "./pages/Tournaments/EditTournament";
import MyTournaments from "./pages/Tournaments/MyTournaments";
import BrowseMatches from "./pages/BrowseMatches";
import Notifications from "./pages/Notifications";
import MatchDetails from "./pages/MatchDetails";
import Friends from "./pages/Friends";
import Wallet from "./pages/Wallet";
import DisputeDetails from "./pages/DisputeDetails";
import EmailVerification from "./pages/Auth/EmailVerification";
import PasswordReset from "./pages/Auth/PasswordReset";
import MyProfile from "./pages/Dashboard/MyProfile";
import Deposit from "./pages/payment/Deposit";
import TournamentChat from "./components/tournament/TournamentChat";
import ThemeToggle from "./components/common/ThemeToggle";
import Transactions from "./pages/payment/Transactions";

// Support Pages
import Support from "./pages/support/Support";
import SupportLayout from "./pages/support/SupportLayout";
import SupportCategory from "./pages/support/SupportCategory";
import SupportTopic from "./pages/support/SupportTopic";
import TournamentSupport from "./pages/support/categories/TournamentSupport";
import PaymentSupport from "./pages/support/categories/PaymentSupport";
import TechnicalSupport from "./pages/support/categories/TechnicalSupport";
import AccountSupport from "./pages/support/categories/AccountSupport";
import BillingSupport from "./pages/support/categories/BillingSupport";
import PublicRoute from "./components/auth/PublicRoute";

// ✅ WebSocket handler (runs only when user authenticated)
function WebsocketHandler() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      websocketService.connect();

      const unsubscribe = websocketService.subscribe("notification", (data) => {
        console.log("New notification:", data);
        // TODO: integrate with NotificationContext
      });

      return () => {
        unsubscribe();
        websocketService.disconnect();
      };
    }
  }, [isAuthenticated]);

  return null;
}

function AppContent() {
  return (
    <Layout>
      <WebsocketHandler />
      <ThemeToggle />
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          }
        />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/tournaments/:id" element={<TournamentDetail />} />
        <Route path="/browse-matches" element={<BrowseMatches />} />
        <Route path="/password-reset" element={<PasswordReset />} />
        <Route path="/tournaments/:id/chat" element={<TournamentChat />} />

        {/* Support Routes - Nested structure */}
        <Route path="/support" element={<SupportLayout />}>
          <Route index element={<Support />} />

          {/* Category routes */}
          <Route path=":category" element={<SupportCategory />}>
            <Route index element={<SupportCategory />} />
            <Route path=":topic" element={<SupportTopic />} />
          </Route>

          {/* Specific support routes for quick access */}
          <Route path="tournament" element={<TournamentSupport />} />
          <Route path="tournament/:topic" element={<TournamentSupport />} />

          <Route path="payment" element={<PaymentSupport />} />
          <Route
            path="payment/deposit"
            element={<PaymentSupport initialTab="deposit" />}
          />
          <Route
            path="payment/withdrawal"
            element={<PaymentSupport initialTab="withdrawal" />}
          />
          <Route
            path="payment/refund"
            element={<PaymentSupport initialTab="refund" />}
          />
          <Route
            path="payment/transaction"
            element={<PaymentSupport initialTab="transaction" />}
          />

          <Route path="technical" element={<TechnicalSupport />} />
          <Route path="technical/:topic" element={<TechnicalSupport />} />

          <Route path="account" element={<AccountSupport />} />
          <Route path="account/:topic" element={<AccountSupport />} />

          <Route path="billing" element={<BillingSupport />} />
          <Route path="billing/:topic" element={<BillingSupport />} />
        </Route>

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-profile"
          element={
            <ProtectedRoute>
              <MyProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deposit"
          element={
            <ProtectedRoute>
              <Deposit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <Transactions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-tournaments"
          element={
            <ProtectedRoute>
              <MyTournaments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-tournament"
          element={
            <ProtectedRoute>
              <CreateTournament />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tournaments/:id/edit"
          element={
            <ProtectedRoute>
              <EditTournament />
            </ProtectedRoute>
          }
        />
        <Route
          path="/matches/:id"
          element={
            <ProtectedRoute>
              <MatchDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/friends/requests"
          element={
            <ProtectedRoute>
              <Friends />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wallet"
          element={
            <ProtectedRoute>
              <Wallet />
            </ProtectedRoute>
          }
        />
        <Route
          path="/disputes/:id"
          element={
            <ProtectedRoute>
              <DisputeDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/verify-email"
          element={
            <ProtectedRoute>
              <EmailVerification />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}
