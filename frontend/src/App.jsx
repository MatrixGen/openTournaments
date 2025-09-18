import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Home from './pages/Home/Home';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import Dashboard from './pages/Dashboard/Dashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Tournaments from './pages/Tournaments/Tournaments';
import CreateTournament from './pages/Tournaments/CreateTournament';
import TournamentDetail from './pages/Tournaments/TournamentDetail';
import Deposit from './pages/payment/Deposit';
import websocketService from './services/websocketService';
import { useAuth } from './contexts/AuthContext';
import { useEffect } from 'react';



function App() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      websocketService.connect();
      
      // Subscribe to notification events
      const unsubscribe = websocketService.subscribe('notification', (data) => {
        // Handle real-time notifications
        console.log('New notification:', data);
        // You could add a notification context or use a state management library
      });
      
      return () => {
        unsubscribe();
        websocketService.disconnect();
      };
    }
  }, [isAuthenticated]);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/tournaments/:id" element={<TournamentDetail />} />
          <Route path="/deposit" element={
            <ProtectedRoute>
              <Deposit />
            </ProtectedRoute>
          } />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/create-tournament" element={
            <ProtectedRoute>
              <CreateTournament />
            </ProtectedRoute>
          } />
          {/* Add more routes as we create pages */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;