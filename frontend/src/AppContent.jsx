// App.jsx - Fixed: ALL routes wrapped in RouteLoadingWrapper

import React, { useEffect } from "react";

// Layout
import Layout from "./components/layout/Layout";

//const ENV = "development";

// AppContent.jsx
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getHeaderConfigForPath } from "./config/headerConfig";
import { App as CapacitorApp } from "@capacitor/app";

import AppRoutes from "./AppRoutes";
import { WebsocketHandler } from "./websocketHandler";
import { initForegroundMessaging } from "./utils/foregroundMessaging";
import { initAndroidPushHandlers } from "./push";

function AppContent() {
  const location = useLocation();
  const [headerProps, setHeaderProps] = useState({});
  //const { user, isAuthenticated } = useAuth();

  // Initialize foreground messaging (web only - function self-guards)
  useEffect(() => {
    initForegroundMessaging();
  }, []);

  const navigate = useNavigate();

  // Initialize Android push handlers (async, with proper cleanup)
  useEffect(() => {
    let cleanupFn = null;
    let isMounted = true;

    (async () => {
      cleanupFn = await initAndroidPushHandlers({
        onNotificationAction: (target) => {
          console.log("[Push][Android] Navigate to:", target);
          if (isMounted) {
            navigate(target);
          }
        },
      });
    })();

    return () => {
      isMounted = false;
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [navigate]);

  // Handle Android back button (await listener registration)
  useEffect(() => {
    let handler = null;
    let isMounted = true;

    (async () => {
      handler = await CapacitorApp.addListener("backButton", ({ canGoBack }) => {
        if (!isMounted) return;
        if (location.pathname !== "/") {
          navigate(-1);
        } else {
          // Exit app ONLY on root
          CapacitorApp.exitApp();
        }
      });
    })();

    return () => {
      isMounted = false;
      if (handler) {
        handler.remove();
      }
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
export default AppContent;
