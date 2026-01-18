import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import AutoMarqueeRow from "../common/AutoMarqueeRow";

const DEFAULT_THEME_COLOR = "#E5E7EB"; // gray-200

const SkeletonCard = () => (
  <div className="min-w-[220px] bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-3 animate-pulse">
    <div className="h-10 w-10 rounded-md bg-gray-200 dark:bg-neutral-700 mb-3" />
    <div className="h-3 w-24 bg-gray-200 dark:bg-neutral-700 rounded" />
  </div>
);

function safeColor(color) {
  // Basic safety: accept hex-like colors only, otherwise fallback
  if (typeof color !== "string") return DEFAULT_THEME_COLOR;
  const c = color.trim();
  if (/^#([0-9a-fA-F]{3}){1,2}$/.test(c)) return c;
  return DEFAULT_THEME_COLOR;
}

async function openUrl(url) {
  if (!url) return false;

  try {
    // Prefer Capacitor Browser on native
    if (Capacitor.isNativePlatform()) {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url });
      return true;
    }

    // Web fallback
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  } catch {
    try {
      window.location.href = url;
      return true;
    } catch {
      return false;
    }
  }
}

function buildAndroidIntentUrl(packageName) {
  // This is the most reliable way from a WebView when you only have a package name.
  // If you later store a proper deep link scheme, prefer that instead.
  return `intent://#Intent;package=${packageName};end`;
}

function buildPlayStoreUrl(packageName) {
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageName)}`;
}

const SupportedGamesRow = ({
  games,
  isLoading,
  onRefresh,
  onOpenFilters,
  filterButtonRef,
}) => {
  const navigate = useNavigate();
  const hasGames = Array.isArray(games) && games.length > 0;
  const [marqueePaused, setMarqueePaused] = React.useState(false);


  const handleGameClick = useCallback(
    async (game) => {
      // Web: keep your current behavior (filter tournaments by game)
      if (!Capacitor.isNativePlatform()) {
        navigate(`/tournaments?search=${encodeURIComponent(game?.name || "")}`);
        return;
      }

      const platform = Capacitor.getPlatform(); // "android" | "ios" | "web"
      const intent = (game?.game_intent || "").trim();
      const androidStoreUrl = (game?.android_store_url || "").trim();
      const iosStoreUrl = (game?.ios_store_url || "").trim();

      // ---- Native behavior ----
      // 1) Try open the app if we can.
      // For Android, if intent is a package name, use an intent:// URL.
      // For iOS, game_intent should ideally be a URL scheme (e.g. mygame://).
      if (intent) {
        try {
          const { AppLauncher } = await import("@capacitor/app-launcher");

          let openTarget = intent;

          if (platform === "android") {
            // If intent is just package name: com.foo.bar -> intent://#Intent;package=...;end
            if (!intent.includes("://")) {
              openTarget = buildAndroidIntentUrl(intent);
            }
          }

          // canOpenUrl helps avoid a hard failure where supported
          const can = await AppLauncher.canOpenUrl({ url: openTarget });
          if (can?.value) {
            await AppLauncher.openUrl({ url: openTarget });
            return;
          }

          // If canOpenUrl says "no", fall through to store
        } catch {
          // fall through to store
        }
      }

      // 2) If not installed / not openable: go to store
      if (platform === "android") {
        // prefer explicit backend url; fallback to Play Store from package
        const url =
          androidStoreUrl ||
          (intent && !intent.includes("://") ? buildPlayStoreUrl(intent) : "");
        if (url) {
          await openUrl(url);
          return;
        }
      }

      if (platform === "ios") {
        if (iosStoreUrl) {
          await openUrl(iosStoreUrl);
          return;
        }
      }

      // 3) Final fallback: filter tournaments page
      navigate(`/tournaments?search=${encodeURIComponent(game?.name || "")}`);
    },
    [navigate]
  );

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Supported Games
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenFilters}
            ref={filterButtonRef}
            className="p-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg"
            type="button"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 3H2l8 9v7l4 2v-9l8-9z" />
            </svg>
          </button>

          <button
            onClick={onRefresh}
            className="p-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg"
            type="button"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>
        </div>
      </div>

     {isLoading ? (
  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
    {Array.from({ length: 4 }).map((_, index) => (
      <SkeletonCard key={index} />
    ))}
  </div>
) : hasGames ? (
  <AutoMarqueeRow
    items={games}
    speedSeconds={22}
    resumeDelayMs={1200}
    className="pb-2"
    renderItem={(game) => {
      const themeColor = safeColor(game?.theme_color);

      return (
        <button
          key={game.id}
          type="button"
          onClick={() => handleGameClick(game)}
          className="min-w-[220px] bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* themed logo container */}
            <div
              className="h-10 w-10 rounded-md flex items-center justify-center overflow-hidden border"
              style={{
                borderColor: themeColor,
                backgroundColor: "transparent",
              }}
            >
              {game.logo_url ? (
                <img
                  src={game.logo_url}
                  alt={game.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {game.name?.slice(0, 2)?.toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {game.name}
              </p>

              {/* hint changes based on platform */}
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {Capacitor.isNativePlatform() ? "Tap to open" : "View tournaments"}
              </p>
            </div>
          </div>

          <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
        </button>
      );
    }}
  />
) : (
  <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-400">
    No supported games available right now.
  </div>
)}


    </section>
  );
};

export default SupportedGamesRow;
