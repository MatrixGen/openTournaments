// App.jsx - Fixed: ALL routes wrapped in RouteLoadingWrapper

import React, { useEffect } from "react";

// Layout
import Layout from "./components/layout/Layout";

const ENV = "development";

// AppContent.jsx
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getHeaderConfigForPath } from "./config/headerConfig";
import { App as CapacitorApp } from "@capacitor/app";

import AppRoutes from "./AppRoutes";
import { WebsocketHandler } from "./websocketHandler";
import { initPushNotifications } from "./push";
import { notificationService } from "./services/notificationService";
import { useAuth } from "./contexts/AuthContext";


function AppContent() {
  const location = useLocation();
  const [headerProps, setHeaderProps] = useState({});
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Only attempt registration if user is logged in
    if (isAuthenticated && user) {
      initPushNotifications(async (token) => {
        try {
          console.log('Registering FCM Token for User:', user.id);
          await notificationService.sendFcmToken({
            token: token,
            platform: window.Capacitor?.getPlatform() || 'web'
          });
        } catch (err) {
          console.error('Failed to sync token with server:', err);
        }
      });
    }
  }, [isAuthenticated, user]);

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

  const navigate = useNavigate();

  useEffect(() => {
    const handler = CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (location.pathname !== "/") {
        navigate(-1);
      } else {
        // Exit app ONLY on root
        CapacitorApp.exitApp();
      }
    });

    return () => {
      handler.remove();
    };
  }, [location.pathname, navigate]);

  // Update header props when route changes
  useEffect(() => {
    const config = getHeaderConfigForPath(location.pathname);
    setHeaderProps(config);
  }, [location.pathname]);

  return (
    <>
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
            onMouseEnter={() => import("./pages/common/Notifications")}
            data-preload="notifications"
          />
        </div>
        <AppRoutes />
      </Layout>
    </>
  );
}
export default AppContent