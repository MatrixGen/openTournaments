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

  useEffect(() => {
    initForegroundMessaging();
  }, []);

  const navigate = useNavigate();

  useEffect(() => {
    const cleanup = initAndroidPushHandlers({
      onNotificationAction: (target) => {
        console.log("[Push][Android] Navigate to:", target);
        navigate(target);
      },
    });

    return () => cleanup();
  }, [navigate]);

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
export default AppContent;
