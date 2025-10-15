// App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import websocketService from "./services/websocketService";

// Contexts
import { AuthProvider } from "./contexts/AuthContext";
//import { ChatProvider } from "./contexts/ChatContext";
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
//import PublicProfile from "./pages/Profile/PublicProfile";
//import ChatList from "./pages/Profile/ChatList";
//import TournamentChatPage from "./pages/Tournaments/TournamentChatPage";

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
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/tournaments/:id" element={<TournamentDetail />} />
        <Route path="/browse-matches" element={<BrowseMatches />} />
        <Route path="/password-reset" element={<PasswordReset />} />
        <Route path="/tournaments/:id/chat" element={<TournamentChat />} />
        

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
