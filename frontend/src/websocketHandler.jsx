import { useRef } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useCallback } from "react";
import websocketService from "./services/websocketService";
import { useEffect } from "react";

// ✅ Optimized WebSocket handler with connection pooling
export function WebsocketHandler() {
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
