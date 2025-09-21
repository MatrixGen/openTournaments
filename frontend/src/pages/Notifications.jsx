import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../contexts/AuthContext';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const response = await notificationService.getAll();
      setNotifications(response.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationService.getUnreadCount();
      setUnreadCount(response.count || 0);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      // Update local state
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      // Update all notifications to read
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read first
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Navigate based on notification type and related entity
    if (notification.related_entity_type && notification.related_entity_id) {
      switch (notification.related_entity_type) {
        case 'match':
          navigate(`/matches/${notification.related_entity_id}`);
          break;
        case 'tournament':
          navigate(`/tournaments/${notification.related_entity_id}`);
          break;
        case 'dispute':
          navigate(`/disputes/${notification.related_entity_id}`);
          break;
        case 'friend_request':
          navigate('/friends/requests');
          break;
        case 'wallet':
          navigate('/wallet');
          break;
        default:
          console.log('Unknown entity type:', notification.related_entity_type);
      }
    } else {
      // Fallback for notifications without specific entity links
      switch (notification.type) {
        case 'friend_request':
          navigate('/friends/requests');
          break;
        case 'wallet_update':
          navigate('/wallet');
          break;
        default:
          // Do nothing for generic notifications
          console.log('No specific action for this notification');
      }
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'match': return '📊';
      case 'tournament': return '🏆';
      case 'match': return '⏰';
      case 'prize': return '💰';
      case 'dispute': return '⚖️';
      case 'tournament_invite': return '📨';
      case 'friend_request': return '👤';
      case 'wallet_update': return '💳';
      default: return '🔔';
    }
  };

  const getActionText = (notification) => {
    if (notification.related_entity_type) {
      switch (notification.related_entity_type) {
        case 'match': return 'View Match →';
        case 'tournament': return 'View Tournament →';
        case 'dispute': return 'View Dispute →';
        case 'friend_request': return 'View Requests →';
        case 'wallet': return 'View Wallet →';
        default: return 'View Details →';
      }
    }
    
    // Fallback for notifications without specific entity
    switch (notification.type) {
      case 'friend_request': return 'View Requests →';
      case 'wallet_update': return 'View Wallet →';
      default: return 'View Details →';
    }
  };

  const formatNotificationTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      <Header />
      <main className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Notifications</h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-primary-500 hover:text-primary-400 text-sm font-medium"
            >
              Mark all as read
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-800/50 py-3 px-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border cursor-pointer ${
                  notification.is_read
                    ? 'bg-neutral-800 border-neutral-700'
                    : 'bg-primary-900/20 border-primary-500/30'
                } hover:bg-neutral-750 transition-colors`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start">
                  <span className="text-xl mr-3 mt-1">{getNotificationIcon(notification.type)}</span>
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{notification.title}</h3>
                    <p className="text-gray-400 mt-1">{notification.message}</p>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-gray-500 text-sm">
                        {formatNotificationTime(notification.created_at)}
                      </p>
                      <div className="flex items-center space-x-2">
                        {!notification.is_read && (
                          <span className="h-2 w-2 rounded-full bg-primary-500"></span>
                        )}
                        <span className="text-primary-500 hover:text-primary-400 text-sm font-medium">
                          {getActionText(notification)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                <span className="text-3xl">🔔</span>
              </div>
              <h3 className="text-lg font-medium text-white">No notifications yet</h3>
              <p className="mt-2 text-gray-400">
                You'll see important updates about your tournaments here.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}