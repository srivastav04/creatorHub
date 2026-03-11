<p align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg" alt="CreatorHub Logo" width="200"/>
</p>

<h1 align="center">CreatorHub — YouTube Subscription & Notification Platform</h1>

<p align="center">
  <em>A full-stack web application that lets users follow their favorite YouTube creators, browse videos, manage playlists, and receive automated notifications when new content is published — all powered by the YouTube Data API v3 and n8n workflow automation.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React"/>
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="TailwindCSS"/>
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" alt="Express"/>
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker"/>
  <img src="https://img.shields.io/badge/Clerk-Auth-6C47FF?logo=clerk&logoColor=white" alt="Clerk"/>
</p>

---

## 📑 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running with Docker](#running-with-docker)
  - [Running Locally (without Docker)](#running-locally-without-docker)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Frontend Pages](#frontend-pages)
- [Webhook & Notification System](#webhook--notification-system)
- [Custom Hooks](#custom-hooks)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**CreatorHub** is a YouTube-centric web application designed for users who want a centralized dashboard to follow their favorite YouTube creators. Instead of relying on YouTube's own recommendation algorithm, CreatorHub gives users full control over their feed by subscribing to specific channels, browsing their latest videos, managing personal playlists, and optionally receiving email/webhook-based notifications when new videos are published.

The application is split into a **React (Vite) frontend** and an **Express.js backend** backed by a **PostgreSQL** database, all orchestrated with **Docker Compose** for seamless development and deployment.

---

## Features

### 🔐 Authentication & Onboarding
- **Clerk-based authentication** — Secure sign-in/sign-up with Google, GitHub, or email via [Clerk](https://clerk.dev).
- **Onboarding setup flow** — First-time users go through a guided setup page where they search for and select YouTube channels to follow.
- **User verification** — Returning users are automatically verified against the backend, with local state hydrated from the database.

### 🏠 Personalized Home Feed
- **Subscription-based feed** — The home page displays the latest videos exclusively from channels the user has subscribed to.
- **Infinite scrolling** — Automatically loads more content as the user scrolls, powered by `@tanstack/react-query` infinite queries.
- **Empty state with CTA** — New users with no subscriptions see a friendly prompt to discover channels.

### 🔍 YouTube Search
- **Real-time video search** — Powered by the YouTube Data API v3, users can search for any video on YouTube.
- **Channel search & scraping** — During setup, users can search for YouTube channels. Backend scrapes channel metadata (name, avatar, subscriber count) from YouTube search results.
- **Debounced search** — Search input is optimized with debouncing and URL parameter synchronization to prevent excessive API calls.
- **Cancellable requests** — Active search requests are cancelled when a new search is initiated using `AbortController`.

### 🎬 Video Player
- **Custom-built video player** — Full-featured player with:
  - Play/Pause, Volume control (slider + mute toggle)
  - Seek bar with hover preview
  - Time display (current / total)
  - **Theater mode** — Expands the player to fill the viewport width
  - **Fullscreen mode** — Native fullscreen with custom controls overlay
  - **Mini player (PiP)** — Floating mini player for multitasking
  - **Keyboard shortcuts** — `Space/K` (play/pause), `M` (mute), `F` (fullscreen), `T` (theater)
  - **Auto-hiding controls** — Controls fade after 3 seconds of inactivity during playback
- **YouTube embed support** — For YouTube-sourced videos, an iframe embed with autoplay is used instead of the native player.

### 📺 Channel Subscriptions
- **Subscribe/Unsubscribe** — Toggle subscriptions from the watch page or the subscriptions dashboard.
- **Subscription management page** — View all subscribed channels with their avatars, names, and subscriber counts.
- **Backend sync** — Subscriptions are stored both in `localStorage` (for instant UI updates) and synced to the PostgreSQL database.

### 📂 Playlists
- **Create custom playlists** — Users can create named playlists and add videos from any watch page.
- **Playlist detail view** — Browse individual playlists with video cards and the ability to remove videos.
- **Save to playlist modal** — Quick save overlay on video watch pages with existing playlist selection and new playlist creation.

### ❤️ Liked Videos
- **Like/unlike videos** — Toggle likes directly from the watch page with visual feedback.
- **Liked videos page** — Dedicated page showing all liked videos with timestamps.

### 📜 Watch History
- **Automatic history tracking** — Every video watched is automatically added to the user's history, with the most recent at the top.
- **History management** — Users can clear their entire history or remove individual entries.
- **Deduplication** — Re-watching a video moves it to the top without creating duplicate entries.

### 🔔 Automated Notifications (n8n Integration)
- **Batch channel polling** — Instead of checking all channels at once, channels are checked in priority-based batches for scalability.
- **New video detection** — When the backend detects new videos from monitored channels, it triggers an n8n webhook with video data and subscriber information.
- **Subscriber email collection** — During setup, users can optionally provide their email for notification purposes.
- **Webhook logging & auditing** — All webhook events (incoming and outgoing) are logged for debugging.

### 🎨 UI/UX
- **Dark mode** — Uses a custom dark theme with CSS variables for consistent theming.
- **Responsive design** — Fully responsive layout adapting from mobile to ultra-wide displays.
- **Collapsible sidebar** — Desktop sidebar collapses to an icon-only mini sidebar; on mobile, it opens as an overlay.
- **Loading skeletons** — Skeleton components for all data-loading states to provide a polished experience.
- **Smooth transitions** — CSS transitions and animations throughout the interface.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vite + React)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  Pages   │  │Components│  │  Hooks   │  │   API Layer    │  │
│  │ (Router) │──│ (UI)     │──│ (Logic)  │──│ (Axios + RQ)   │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────┬────────┘  │
│                                                     │           │
│  Auth: Clerk ─────────────────────────────────────  │           │
└─────────────────────────────────────────────────────┼───────────┘
                                                      │ HTTP
┌─────────────────────────────────────────────────────┼───────────┐
│                      BACKEND (Express.js)           │           │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────┐   │           │
│  │  Routes  │──│  Controllers │──│  Services   │───────────    │
│  └──────────┘  └──────────────┘  └──────┬──────┘              │
│                                         │                      │
│  ┌──────────────────────┐    ┌──────────┴──────────┐          │
│  │   YouTube Data API   │    │   PostgreSQL (pg)   │          │
│  │   (googleapis)       │    │   via Docker Compose │          │
│  └──────────────────────┘    └─────────────────────┘          │
│                                                                │
│  Webhooks ──────────► n8n (Automation Platform)               │
└────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React** | 19.2 | UI component library |
| **Vite** | 7.3 | Build tool & dev server with HMR |
| **TailwindCSS** | 4.2 | Utility-first CSS framework |
| **React Router** | 7.13 | Client-side routing |
| **TanStack React Query** | 5.90 | Server state management, caching, infinite queries |
| **Clerk React** | 5.61 | Authentication (sign-in, sign-up, user management) |
| **Axios** | 1.13 | HTTP client for API requests |
| **Lucide React** | 0.577 | SVG icon library |
| **Radix UI** | Various | Accessible, unstyled UI primitives (dialogs, tooltips, sliders, etc.) |
| **clsx + tailwind-merge** | Latest | Conditional className composition |
| **class-variance-authority** | 0.7 | Variant-based component styling |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Express.js** | 5.2 | Web framework for REST API |
| **PostgreSQL** | 16 (Alpine) | Persistent relational database |
| **pg (node-postgres)** | 8.20 | PostgreSQL client for Node.js |
| **googleapis** | 171.4 | Official Google API client (YouTube Data API v3) |
| **Axios** | 1.13 | HTTP client for webhook/external API calls |
| **fast-xml-parser** | 5.4 | Parses YouTube RSS feeds for channel data |
| **dotenv** | 17.3 | Environment variable management |
| **cors** | 2.8 | Cross-Origin Resource Sharing middleware |
| **nodemon** | 3.1 | Hot-reload during development |

### Infrastructure

| Technology | Purpose |
|---|---|
| **Docker Compose** | Multi-container orchestration (PostgreSQL, pgAdmin, Backend) |
| **pgAdmin 4** | PostgreSQL GUI for database management |
| **n8n** | Workflow automation for video notifications |

---

## Project Structure

```
YouTube/
├── .env                          # Root env vars (used by Docker Compose)
├── docker-compose.yml            # Docker services (Postgres, pgAdmin, Backend)
├── README.md                     # ← You are here
│
├── frontend/                     # React + Vite frontend
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx              # App entry point (Clerk, React Query, Router)
│       ├── index.css             # Global styles & CSS variables
│       ├── App.jsx               # Default Vite app (unused, routes handle rendering)
│       │
│       ├── api/                  # API layer (Axios-based)
│       │   ├── videosApi.js      # Video CRUD, search, channel videos, scraping
│       │   ├── userApi.js        # User state, history, likes, subscriptions, sync
│       │   └── playlistApi.js    # Playlist CRUD operations
│       │
│       ├── components/           # Reusable UI components
│       │   ├── Topbar.jsx        # Navigation header with search bar
│       │   ├── Sidebar.jsx       # Collapsible navigation sidebar
│       │   ├── VideoCard.jsx     # Video thumbnail card for grid layouts
│       │   ├── VideoPlayer.jsx   # Full-featured custom video player
│       │   └── Skeleton.jsx      # Loading skeleton components
│       │
│       ├── hooks/                # Custom React hooks
│       │   ├── useVideoPlayer.js # Video player state & keyboard shortcuts
│       │   ├── useDarkMode.js    # Dark mode toggle hook
│       │   └── useInfiniteScroll.js # Intersection Observer for infinite scroll
│       │
│       ├── layouts/              # Page layout wrappers
│       │   └── AppLayout.jsx     # Main layout (Topbar + Sidebar + Content)
│       │
│       ├── pages/                # Route-level page components
│       │   ├── HomePage.jsx      # Subscription-based personalized feed
│       │   ├── SearchPage.jsx    # YouTube video/channel search
│       │   ├── WatchPage.jsx     # Video player + metadata + actions
│       │   ├── SetupPage.jsx     # Onboarding channel selection
│       │   ├── HistoryPage.jsx   # Watch history management
│       │   ├── LikedPage.jsx     # Liked videos collection
│       │   ├── PlaylistsPage.jsx # All playlists overview
│       │   ├── PlaylistDetailPage.jsx # Single playlist view
│       │   └── SubscriptionsPage.jsx  # Subscription management
│       │
│       ├── routes/               # React Router configuration
│       │   └── AppRoutes.jsx     # Route definitions, auth guards, setup guards
│       │
│       ├── data/                 # Static/seed data
│       │   ├── videos.js         # Sample video data (fallback)
│       │   └── youtubers.js      # Pre-seeded list of popular YouTubers
│       │
│       └── utils/                # Utility functions
│           └── index.js          # formatViews, formatTimeAgo, cn, generateId, etc.
│
└── backend/                      # Express.js backend
    ├── package.json
    ├── Dockerfile                # Development Docker image (node:20-alpine)
    ├── .env                      # Backend-specific environment variables
    ├── .env.example              # Template for environment variables
    ├── server.js                 # Express app entry point
    ├── app.js                    # App module export
    │
    ├── routes/                   # Express route definitions
    │   ├── user.routes.js        # /api/user/* (verify, setup, sync)
    │   ├── youtube.routes.js     # /api/youtube/* (feed, search, video, channels)
    │   ├── channels.routes.js    # /api/channels/* (subscribe, polling, check)
    │   ├── video.routes.js       # /api/videos/* (bulk video ingestion)
    │   └── webhook.routes.js     # /api/webhooks/* (n8n send/receive/logs)
    │
    ├── controllers/              # Request handlers
    │   ├── user.controller.js    # User verification, setup, data sync
    │   ├── youtube.controller.js # YouTube API proxy endpoints
    │   ├── channels.controller.js # Channel subscription & polling logic
    │   ├── video.controller.js   # Video storage & retrieval
    │   └── webhook.controller.js # Webhook send/receive/logging
    │
    ├── services/                 # Business logic layer
    │   ├── user.service.js       # User CRUD, sync, data hydration
    │   ├── youtube.service.js    # YouTube Data API v3 integration
    │   ├── channel.service.js    # Channel CRUD, batch check, priority
    │   ├── subscription.service.js # Subscription management & lookups
    │   ├── video.service.js      # Video storage, bulk insert
    │   └── webhook.service.js    # n8n webhook integration & logging
    │
    ├── db/                       # Database layer
    │   ├── db.js                 # PostgreSQL pool + waitForDB helper
    │   ├── dummyDB.js            # Legacy in-memory DB (unused)
    │   └── migrations/           # SQL migration files
    │       ├── 001_init.sql      # Users & Channels tables, triggers
    │       ├── 002_channel_polling.sql # Polling fields (last_checked, priority)
    │       └── 003_subscriptions_videos.sql # Subscriptions & Videos tables
    │
    ├── middleware/               # Express middleware
    │   └── auth.js               # Clerk ID extraction from headers
    │
    ├── scripts/                  # CLI scripts
    │   └── migrate.js            # Database migration runner
    │
    └── test-webhooks.js          # Manual webhook testing utility
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20.x
- **Docker** & **Docker Compose** (for database and backend services)
- **YouTube Data API v3 key** ([Get one here](https://console.cloud.google.com/apis/credentials))
- **Clerk account** ([Sign up](https://clerk.dev)) — for authentication
- *(Optional)* **n8n instance** — for automated video notifications

### Environment Variables

#### Root `.env` (used by Docker Compose)

```env
# PostgreSQL credentials
DB_HOST=postgres
DB_PORT=5432
DB_NAME=youtube_db
DB_USER=postgres
DB_PASS=your_strong_password

# YouTube Data API v3
YOUTUBE_API_KEY=your_youtube_api_key

# n8n Webhook (optional)
N8N_WEBHOOK_URL=https://your-n8n-instance/webhook/your-id
```

#### `frontend/.env`

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
```

#### `backend/.env`

```env
PORT=5000
NODE_ENV=development

YOUTUBE_API_KEY=your_youtube_api_key

DB_HOST=postgres          # Use "localhost" if running backend outside Docker
DB_PORT=5432
DB_NAME=youtube_db
DB_USER=postgres
DB_PASS=your_strong_password

N8N_WEBHOOK_URL=https://your-n8n-instance/webhook/your-id
N8N_NEW_VIDEO_WEBHOOK_URL=https://your-n8n-instance/webhook/new-video-id
```

### Running with Docker

```bash
# 1. Clone the repository
git clone https://github.com/your-username/creatorhub.git
cd creatorhub

# 2. Set up environment variables
# Copy and fill in the .env files as described above

# 3. Start all services (PostgreSQL, pgAdmin, Backend)
docker compose up -d

# 4. Run database migrations
docker compose exec backend npm run migrate

# 5. Start the frontend dev server
cd frontend
npm install
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| pgAdmin | http://localhost:5050 (admin@admin.com / root) |

### Running Locally (without Docker)

```bash
# 1. Start PostgreSQL locally (or use a managed instance)
# Update DB_HOST=localhost in backend/.env

# 2. Backend
cd backend
npm install
npm run migrate     # Run database migrations
npm run dev         # Starts on port 5000 with nodemon

# 3. Frontend (in a new terminal)
cd frontend
npm install
npm run dev         # Starts on port 5173 with Vite HMR
```

---

## Database Schema

The database is managed through incremental SQL migrations in `backend/db/migrations/`.

```
┌──────────────────────────┐       ┌──────────────────────────┐
│         users            │       │        channels          │
├──────────────────────────┤       ├──────────────────────────┤
│ clerk_id (PK)   TEXT     │       │ channel_id (PK)  TEXT    │
│ email           TEXT     │       │ name             TEXT    │
│ channel_ids     TEXT[]   │       │ avatar           TEXT    │
│ liked_videos    TEXT[]   │       │ subscriber_count INTEGER │
│ playlists       JSONB    │       │ last_videos      TEXT[]  │
│ history         TEXT[]   │       │ last_video_at    TIMESTAMPTZ │
│ created_at      TIMESTAMPTZ     │ last_checked_at  TIMESTAMPTZ │
│ updated_at      TIMESTAMPTZ     │ check_priority   INTEGER │
└─────────┬────────────────┘       │ updated_at       TIMESTAMPTZ │
          │                        └─────────┬────────────────┘
          │                                  │
          │        ┌─────────────────────┐   │
          │        │   subscriptions     │   │
          │        ├─────────────────────┤   │
          └────────│ user_id (FK)  TEXT  │───┘
                   │ channel_id (FK) TEXT│
                   │ id (PK)    SERIAL  │
                   │ created_at TIMESTAMPTZ │
                   └─────────────────────┘
                             │
                   ┌─────────────────────┐
                   │      videos         │
                   ├─────────────────────┤
                   │ video_id (PK) TEXT  │
                   │ channel_id (FK) TEXT│
                   │ title         TEXT  │
                   │ url           TEXT  │
                   │ published_at  TIMESTAMPTZ │
                   │ created_at    TIMESTAMPTZ │
                   └─────────────────────┘
```

**Key relations:**
- `subscriptions` is a many-to-many join between `users` and `channels`
- `videos` belongs to `channels` via `channel_id`
- Auto-update triggers on `users` and `channels` keep `updated_at` current

---

## API Reference

### User Routes (`/api/user`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/verify` | Verify user exists, hydrate local state from DB |
| `POST` | `/setup` | Save initial channel subscriptions + email |
| `POST` | `/sync` | Sync localStorage data (history, likes, playlists) to DB |

### YouTube Routes (`/api/youtube`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/feed` | Popular videos feed (paginated) |
| `GET` | `/search` | Search YouTube videos by query |
| `GET` | `/video/:id` | Get single video details |
| `GET` | `/video/:id/related` | Get related videos *(deprecated)* |
| `GET` | `/channels` | Get channel details by IDs |
| `GET` | `/subscriptions/videos` | Get latest videos from subscribed channels |
| `GET` | `/scrape-channel` | Search and scrape YouTube channel metadata |

### Channel Routes (`/api/channels`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/subscribe` | Subscribe to a channel (fetch & cache its videos) |
| `GET` | `/channels-to-check` | Get batch of channels due for polling |
| `POST` | `/check-results` | Receive polling results from n8n |
| `GET` | `/:channelId/subscribers` | Get all subscribers for a channel |

### Video Routes (`/api/videos`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/bulk` | Bulk insert new videos for a channel |

### Webhook Routes (`/api/webhooks`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/send` | Manually trigger an n8n webhook |
| `POST` | `/receive` | Receive and process incoming webhooks from n8n |
| `GET` | `/logs` | View webhook event logs |
| `DELETE` | `/logs` | Clear webhook logs |
| `GET` | `/test` | Test webhook connectivity |

---

## Frontend Pages

| Page | Route | Description |
|---|---|---|
| **Sign In** | `/sign-in` | Clerk-powered authentication page |
| **Setup** | `/setup` | Onboarding — search and select YouTube channels |
| **Home** | `/home` | Personalized feed from subscribed channels |
| **Search** | `/search` | Search YouTube videos with infinite scroll |
| **Watch** | `/watch/:id` | Video player with channel info, like, save, share |
| **History** | `/history` | Watch history with clear/remove options |
| **Liked** | `/liked` | All liked videos |
| **Playlists** | `/playlists` | All user playlists |
| **Playlist Detail** | `/playlists/:id` | Single playlist with video list |
| **Subscriptions** | `/subscriptions` | Manage channel subscriptions |

### Route Protection
- **`AuthGuard`** — Redirects unauthenticated users to `/sign-in`
- **`SetupGuard`** — Redirects users who haven't completed setup to `/setup`
- **`RedirectIfAuth`** — Prevents authenticated users from accessing `/sign-in`

---

## Webhook & Notification System

CreatorHub integrates with **n8n** (a workflow automation platform) to provide automated notifications when new videos are detected.

### Flow

```
1. n8n Scheduler (cron)
       │
       ▼
2. GET /api/channels/channels-to-check
   → Returns batch of channels sorted by priority
       │
       ▼
3. n8n checks each channel's YouTube RSS feed
       │
       ▼
4. POST /api/channels/check-results
   → Backend compares new videos against stored ones
   → If new videos found:
       │
       ▼
5. Backend calls POST to N8N_NEW_VIDEO_WEBHOOK_URL
   → Sends: { channel_id, new_videos[], subscribers[{ userId, email }] }
       │
       ▼
6. n8n sends email/notification to subscribers
```

### Channel Polling Priority

| Priority | Check Interval | Description |
|---|---|---|
| **3** (High) | Most frequent | Channels with very recent new video activity |
| **2** (Medium) | Moderate | Channels with some recent activity |
| **1** (Low) | Least frequent | Channels with no recent activity or newly added |

---

## Custom Hooks

### `useVideoPlayer(videoRef, containerRef)`
Manages all video player state including playback, volume, progress tracking, fullscreen, theater mode, mini player, keyboard shortcuts, and auto-hiding controls.

### `useInfiniteScroll(callback, options)`
Uses `IntersectionObserver` to detect when a sentinel element enters the viewport, triggering the callback to load more data for infinite scrolling.

### `useDarkMode()`
Toggles dark mode by managing a CSS class on the document root, persisted to `localStorage`.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the **ISC License** — see the backend's `package.json` for details.

---

<p align="center">
  Built with ❤️ using React, Express, PostgreSQL, and the YouTube Data API
</p>
