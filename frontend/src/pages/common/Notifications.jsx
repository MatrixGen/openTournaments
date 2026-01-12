import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { notificationService } from "../../services/notificationService";
import Banner from "../../components/common/Banner";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  Bell,
  Check,
  CheckCircle,
  Clock,
  Trophy,
  Users,
  DollarSign,
  AlertTriangle,
  MessageSquare,
  Gamepad2,
  Settings,
  RefreshCw,
  ChevronRight,
  X,
  Filter,
} from "lucide-react";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await notificationService.getAll();
      setNotifications(response.notifications || []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError(err.response?.data?.message || "Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await notificationService.getUnreadCount();
      setUnreadCount(response.count || 0);
    } catch (err) {
      console.error("Failed to load unread count:", err);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      // Update local state
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      setError("Failed to mark notification as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      // Update all notifications to read
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      setSuccess("All notifications marked as read");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      setError("Failed to mark all notifications as read");
    }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(id);
      setNotifications(notifications.filter((n) => n.id !== id));
      // Adjust unread count if needed
      const notification = notifications.find((n) => n.id === id);
      if (notification && !notification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
      setError("Failed to delete notification");
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read first if unread
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type and related entity
    if (notification.related_entity_type && notification.related_entity_id) {
      switch (notification.related_entity_type) {
        case "match":
          navigate(`/matches/${notification.related_entity_id}`);
          break;
        case "tournament":
          navigate(`/tournaments/${notification.related_entity_id}`);
          break;
        case "dispute":
          navigate(`/disputes/${notification.related_entity_id}`);
          break;
        case "friend_request":
          navigate("/friends/requests");
          break;
        case "wallet":
          navigate("/wallet");
          break;
        default:
          console.log("Unknown entity type:", notification.related_entity_type);
      }
    } else {
      // Fallback for notifications without specific entity links
      switch (notification.type) {
        case "friend_request":
          navigate("/friends/requests");
          break;
        case "wallet_update":
          navigate("/wallet");
          break;
        default:
          // Do nothing for generic notifications
          console.log("No specific action for this notification");
      }
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "match":
        return <Gamepad2 className="h-5 w-5" />;
      case "tournament":
        return <Trophy className="h-5 w-5" />;
      case "match_reminder":
        return <Clock className="h-5 w-5" />;
      case "prize":
        return <DollarSign className="h-5 w-5" />;
      case "dispute":
        return <AlertTriangle className="h-5 w-5" />;
      case "tournament_invite":
        return <MessageSquare className="h-5 w-5" />;
      case "friend_request":
        return <Users className="h-5 w-5" />;
      case "wallet_update":
        return <DollarSign className="h-5 w-5" />;
      case "system":
        return <Settings className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "match":
        return "text-blue-500 bg-blue-500/10";
      case "tournament":
        return "text-yellow-500 bg-yellow-500/10";
      case "prize":
        return "text-emerald-500 bg-emerald-500/10";
      case "dispute":
        return "text-red-500 bg-red-500/10";
      case "friend_request":
        return "text-purple-500 bg-purple-500/10";
      case "wallet_update":
        return "text-green-500 bg-green-500/10";
      default:
        return "text-gray-500 bg-gray-500/10";
    }
  };

  const getActionText = (notification) => {
    if (notification.related_entity_type) {
      switch (notification.related_entity_type) {
        case "match":
          return "View Match";
        case "tournament":
          return "View Tournament";
        case "dispute":
          return "View Dispute";
        case "friend_request":
          return "View Requests";
        case "wallet":
          return "View Wallet";
        default:
          return "View Details";
      }
    }

    // Fallback for notifications without specific entity
    switch (notification.type) {
      case "friend_request":
        return "View Requests";
      case "wallet_update":
        return "View Wallet";
      default:
        return "View Details";
    }
  };

  const formatNotificationTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Filter notifications based on active filter
  const filteredNotifications = notifications.filter((notification) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unread") return !notification.is_read;
    if (activeFilter === "read") return notification.is_read;
    if (activeFilter === "tournament")
      return (
        notification.type === "tournament" ||
        notification.type === "tournament_invite"
      );
    if (activeFilter === "wallet")
      return (
        notification.type === "wallet_update" || notification.type === "prize"
      );
    return true;
  });

  // Notification filter options
  const filterOptions = [
    { id: "all", label: "All", count: notifications.length },
    { id: "unread", label: "Unread", count: unreadCount },
    {
      id: "tournament",
      label: "Tournaments",
      count: notifications.filter(
        (n) => n.type === "tournament" || n.type === "tournament_invite"
      ).length,
    },
    {
      id: "wallet",
      label: "Wallet",
      count: notifications.filter(
        (n) => n.type === "wallet_update" || n.type === "prize"
      ).length,
    },
  ];

  // Mobile filter drawer
  const MobileFilterDrawer = () => (
    <div
      className={`fixed inset-0 z-50 md:hidden transition-transform duration-300 ${
        showFilters ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => setShowFilters(false)}
      />
      <div className="fixed right-0 top-0 bottom-0 w-64 bg-white dark:bg-neutral-800 shadow-xl">
        <div className="p-4 border-b border-gray-200 dark:border-neutral-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
            Filter Notifications
          </h3>
          <button onClick={() => setShowFilters(false)} className="p-2">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4 space-y-2">
          {filterOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                setActiveFilter(option.id);
                setShowFilters(false);
              }}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                activeFilter === option.id
                  ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                  : "hover:bg-gray-50 dark:hover:bg-neutral-700"
              }`}
            >
              <span className="font-medium">{option.label}</span>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  activeFilter === option.id
                    ? "bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-300"
                    : "bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                {option.count}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-900">
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading notifications..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 safe-padding">
      <MobileFilterDrawer />

      <main className="mx-auto max-w-4xl py-4 md:py-8 px-3 sm:px-4 lg:px-8">
        {/* Mobile Header */}
        <div className="lg:hidden mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(true)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <Filter className="h-5 w-5" />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400 text-sm font-medium"
                >
                  Mark All Read
                </button>
              )}
            </div>
          </div>

          {/* Mobile Filter Chips */}
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setActiveFilter(option.id)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  activeFilter === option.id
                    ? "bg-primary-500 text-gray-900 dark:text-white"
                    : "bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                {option.label}
                {option.count > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                      activeFilter === option.id
                        ? "bg-white/20"
                        : "bg-gray-200 dark:bg-neutral-700"
                    }`}
                  >
                    {option.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">
              Notifications
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Stay updated with your tournament activities
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400 text-sm font-medium transition-colors"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark all as read
              </button>
            )}
            <button
              onClick={loadNotifications}
              className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 text-sm font-medium transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <Banner
            type="error"
            title="Action Failed"
            message={error}
            onClose={() => setError("")}
            className="mb-4"
          />
        )}

        {/* Success Banner */}
        {success && (
          <Banner
            type="success"
            title="Success!"
            message={success}
            onClose={() => setSuccess("")}
            className="mb-4"
          />
        )}

        {/* Unread Count Banner */}
        {unreadCount > 0 && (
          <Banner
            type="info"
            title={`You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`}
            message="Click on notifications to mark them as read and take action."
            action={{
              text: "Mark All as Read",
              onClick: markAllAsRead,
            }}
            className="mb-6"
          />
        )}

        {/* Desktop Filter Tabs */}
        <div className="hidden lg:flex space-x-1 mb-6">
          {filterOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setActiveFilter(option.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === option.id
                  ? "bg-primary-500 text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800"
              }`}
            >
              {option.label}
              {option.count > 0 && (
                <span
                  className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                    activeFilter === option.id
                      ? "bg-white/20"
                      : "bg-gray-200 dark:bg-neutral-700"
                  }`}
                >
                  {option.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Empty State */}
        {filteredNotifications.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-neutral-700 flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-2">
              {activeFilter !== "all"
                ? `No ${activeFilter} notifications`
                : "All caught up!"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto px-4">
              {activeFilter !== "all"
                ? `You don't have any ${activeFilter} notifications at the moment.`
                : "You don't have any notifications at the moment. Check back later for updates."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate("/tournaments")}
                className="bg-primary-500 hover:bg-primary-600 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Browse Tournaments
              </button>
              <button
                onClick={loadNotifications}
                className="bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 text-gray-900 dark:text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* Notifications List */}
        {filteredNotifications.length > 0 && (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`group p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                  notification.is_read
                    ? "bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600"
                    : "bg-primary-50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-500/30 hover:border-primary-300 dark:hover:border-primary-500/50"
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start">
                  <div
                    className={`p-2 rounded-lg ${getNotificationColor(notification.type)} mr-3 flex-shrink-0`}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center space-x-2">
                        <h3
                          className={`font-medium text-sm md:text-base ${
                            notification.is_read
                              ? "text-gray-900 dark:text-gray-900 dark:text-white"
                              : "text-primary-800 dark:text-primary-300"
                          }`}
                        >
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <span className="h-2 w-2 rounded-full bg-primary-500 dark:bg-primary-400 flex-shrink-0"></span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!notification.is_read) {
                              markAsRead(notification.id);
                            }
                          }}
                          className={`p-1 rounded ${
                            notification.is_read
                              ? "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              : "text-primary-500 hover:text-primary-700 dark:hover:text-primary-400"
                          }`}
                          title={
                            notification.is_read
                              ? "Mark as unread"
                              : "Mark as read"
                          }
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) =>
                            deleteNotification(notification.id, e)
                          }
                          className="p-1 text-gray-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete notification"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex justify-between items-center">
                      <p className="text-gray-500 dark:text-gray-500 text-xs">
                        {formatNotificationTime(notification.created_at)}
                      </p>
                      <span className="inline-flex items-center text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400 text-sm font-medium transition-colors">
                        {getActionText(notification)}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button (if paginated) */}
        {filteredNotifications.length > 0 && notifications.length > 10 && (
          <div className="mt-6 text-center">
            <button
              onClick={loadNotifications}
              className="inline-flex items-center bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Load More
            </button>
          </div>
        )}

        {/* Notification Tips */}
        {filteredNotifications.length > 0 && (
          <div className="mt-6 bg-gray-50 dark:bg-neutral-800 rounded-lg p-4 border border-gray-200 dark:border-neutral-700">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500 flex-shrink-0" />
              <p>
                Notifications are automatically cleared after 30 days. Important
                system notifications will always be available.
              </p>
            </div>
          </div>
        )}

        {/* Mobile Bottom Navigation Spacer */}
        <div className="h-16 md:h-0"></div>
      </main>
    </div>
  );
}
