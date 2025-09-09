open-tournaments/
├─ .env.example
├─ .gitignore
├─ eslint.config.js
├─ package.json
├─ postcss.config.js
├─ tailwind.config.ts
├─ tsconfig.json
├─ vite.config.ts
├─ public/
│  ├─ favicon.svg
│  ├─ icons/                # PWA icons
│  └─ manifest.webmanifest  # PWA manifest (name, theme, icons)
└─ src/
   ├─ app/
   │  ├─ main.jsx           # App bootstrap
   │  ├─ App.jsx            # Shell/Routes container
   │  ├─ routes.jsx         # Central route map (React Router)
   │  ├─ index.css          # Tailwind + tokens import
   │  ├─ providers/         # Global providers (Query, i18n, Theme, Auth)
   │  │  ├─ I18nProvider.jsx
   │  │  ├─ QueryProvider.jsx
   │  │  ├─ ThemeProvider.jsx
   │  │  └─ AuthGate.jsx    # Protects private routes
   │  ├─ api/               # HTTP client + endpoint wrappers
   │  │  ├─ http.js         # Axios instance + interceptors
   │  │  ├─ endpoints.js    # URL constants
   │  │  └─ schema.js       # zod validators for requests/responses
   │  ├─ sockets/           # Realtime (match events, notifications)
   │  │  ├─ socket.js       # Socket.IO client
   │  │  └─ channels.js     # Channel names & helpers
   │  ├─ store/             # App state (Zustand) – non-server state
   │  │  ├─ auth.store.js
   │  │  ├─ ui.store.js     # theme, bottom-sheet, toasts
   │  │  └─ featureFlags.store.js
   │  ├─ config/
   │  │  ├─ app.js          # appName, version, feature flags
   │  │  └─ env.js          # reads VITE_* env vars safely
   │  ├─ types/             # global shared types
   │  │  └─ common.js
   │  ├─ guards/
   │  │  └─ RequireAuth.jsx
   │  ├─ utils/
   │  │  ├─ cn.js           # className combiner
   │  │  ├─ format.js       # money, time, tournament labels
   │  │  └─ crop.js         # (future) helper to define scoreboard ROI
   │  └─ constants/
   │     ├─ colors.js
   │     ├─ copy.js         # UX phrases, CTA keys
   │     └─ rules.js        # default tournament rules templates
   │
   ├─ components/
   │  ├─ layout/
   │  │  ├─ MobileShell.jsx     # header + content + bottom-nav
   │  │  ├─ AppHeader.jsx
   │  │  └─ BottomNav.jsx       # JustMarkets-style bottom nav
   │  ├─ ui/                    # Design system (Tailwind)
   │  │  ├─ Button.jsx
   │  │  ├─ Card.jsx
   │  │  ├─ Input.jsx
   │  │  ├─ Select.jsx
   │  │  ├─ Sheet.jsx           # bottom sheet
   │  │  ├─ Dialog.jsx
   │  │  ├─ Tabs.jsx
   │  │  ├─ Badge.jsx
   │  │  └─ Toast.jsx
   │  ├─ feedback/
   │  │  ├─ EmptyState.jsx
   │  │  └─ ErrorBoundary.jsx
   │  └─ charts/                # (later) simple charts e.g., winnings
   │
   ├─ features/                 # Feature-sliced architecture
   │  ├─ auth/
   │  │  ├─ pages/
   │  │  │  ├─ LoginPage.jsx
   │  │  │  ├─ RegisterPage.jsx
   │  │  │  └─ KycPage.jsx
   │  │  ├─ components/
   │  │  │  └─ AuthForm.jsx
   │  │  └─ services/
   │  │     └─ auth.api.js
   │  ├─ wallet/
   │  │  ├─ pages/
   │  │  │  ├─ WalletPage.jsx
   │  │  │  ├─ DepositPage.jsx
   │  │  │  └─ WithdrawPage.jsx
   │  │  ├─ components/
   │  │  │  ├─ BalanceCard.jsx
   │  │  │  └─ MobileMoneyForm.jsx    # M-Pesa/TigoPesa/AirtelMoney UX
   │  │  └─ services/
   │  │     └─ wallet.api.js
   │  ├─ tournaments/
   │  │  ├─ pages/
   │  │  │  ├─ CreateTournamentPage.jsx
   │  │  │  ├─ TournamentsListPage.jsx   # Promotional dashboard
   │  │  │  └─ TournamentDetailsPage.jsx
   │  │  ├─ components/
   │  │  │  ├─ TournamentCard.jsx
   │  │  │  ├─ RulesDialog.jsx
   │  │  │  └─ FiltersBar.jsx
   │  │  ├─ services/
   │  │  │  └─ tournaments.api.js
   │  │  └─ types.js
   │  ├─ challenges/
   │  │  ├─ pages/
   │  │  │  └─ MyChallengesPage.jsx
   │  │  ├─ components/
   │  │  │  ├─ ChallengeCard.jsx
   │  │  │  ├─ ReadyButton.jsx
   │  │  │  └─ RematchButton.jsx
   │  │  └─ services/
   │  │     └─ challenges.api.js
   │  ├─ matches/
   │  │  ├─ pages/
   │  │  │  └─ LiveMatchPage.jsx
   │  │  ├─ components/
   │  │  │  ├─ LiveScoreWidget.jsx
   │  │  │  └─ ResultBanner.jsx
   │  │  ├─ services/
   │  │  │  ├─ matches.api.js
   │  │  │  └─ matches.socket.js        # subscribe to live events
   │  │  └─ types.js
   │  ├─ notifications/
   │  │  ├─ components/NotificationsTray.jsx
   │  │  └─ services/notifications.socket.js
   │  └─ admin/
   │     ├─ pages/
   │     │  ├─ DisputesPage.jsx
   │     │  └─ WithdrawalsQueuePage.jsx
   │     └─ services/admin.api.ts
   │
   ├─ locales/                  # i18n: Swahili default, English fallback
   │  ├─ sw/
   │  │  ├─ common.json         # "Ingia", "Dhibiti Mkoba", etc.
   │  │  ├─ wallet.json
   │  │  ├─ tournaments.json
   │  │  └─ matches.json
   │  └─ en/
   │     ├─ common.json
   │     ├─ wallet.json
   │     ├─ tournaments.json
   │     └─ matches.json
   │
   ├─ styles/
   │  ├─ tokens.css             # spacing, radius, brand colors (JustMarkets vibe)
   │  └─ tailwind.css
   │
   ├─ pwa/
   │  ├─ service-worker.js      # offline shell, cache strategy
   │  └─ sw-reg.js              # SW registration
   │
   ├─ tests/                    # unit/integration (Vitest + RTL)
   │  └─ example.test.jsx
   └─ e2e/                      # Playwright E2E (ready/escrow/result flows)
      └─ tournaments.spec.js
