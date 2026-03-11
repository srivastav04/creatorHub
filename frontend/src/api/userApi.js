import VIDEOS from "@/data/videos";
import YOUTUBERS from "@/data/youtubers";
import { delay, generateId } from "@/utils";
import axios from "axios";

// ----- localStorage helpers -----
function getStore(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("localStorage write failed", e);
  }
}

const KEYS = {
  history: "yt_watch_history",
  liked: "yt_liked_videos",
  subscriptions: "yt_subscriptions",
  setup: "yt_setup_complete",
};

const BASE_URL = "http://localhost:5000/api/user";

// ----- Sync Helper -----
async function syncToBackend(clerkId) {
  try {
    const history = getStore(KEYS.history, []);
    const likedVideos = getStore(KEYS.liked, []);
    const playlists = getStore("yt_playlists", []);
    const subscriptions = getStore(KEYS.subscriptions, []);

    await axios.post(
      `${BASE_URL}/sync`,
      {
        history: history.slice(0, 10),
        likedVideos,
        playlists,
        subscriptions,
      },
      {
        headers: { "x-clerk-id": clerkId },
      },
    );
  } catch (error) {
    console.error("Failed to sync with backend:", error);
  }
}

// ----- Watch History -----

export async function getWatchHistory() {
  //await delay()
  const history = getStore(KEYS.history, []);
  return { data: history };
}

export async function addToWatchHistory(video, clerkId) {
  //await delay(100, 200)
  const history = getStore(KEYS.history, []);
  // Remove if already exists (move‑to‑top)
  const filtered = history.filter((h) => h.id !== video.id);
  const entry = { ...video, watchedAt: new Date().toISOString() };
  const updated = [entry, ...filtered].slice(0, 200); // max 200 entries
  setStore(KEYS.history, updated);

  if (clerkId) syncToBackend(clerkId);

  return { data: updated };
}

export async function clearWatchHistory(clerkId) {
  await delay(100, 200);
  setStore(KEYS.history, []);
  if (clerkId) syncToBackend(clerkId);
  return { data: [] };
}

export async function removeFromWatchHistory(videoId, clerkId) {
  await delay(100, 200);
  const history = getStore(KEYS.history, []);
  const updated = history.filter((h) => h.id !== videoId);
  setStore(KEYS.history, updated);
  if (clerkId) syncToBackend(clerkId);
  return { data: updated };
}

// ----- Liked Videos -----

export async function getLikedVideos() {
  await delay();
  const liked = getStore(KEYS.liked, []);
  return { data: liked };
}

export async function toggleLike(video, clerkId) {
  await delay(100, 200);
  const liked = getStore(KEYS.liked, []);
  const exists = liked.some((v) => v.id === video.id);
  let updated;
  if (exists) {
    updated = liked.filter((v) => v.id !== video.id);
  } else {
    updated = [{ ...video, likedAt: new Date().toISOString() }, ...liked];
  }
  setStore(KEYS.liked, updated);

  if (clerkId) syncToBackend(clerkId);

  return { data: updated, isLiked: !exists };
}

export async function isVideoLiked(videoId) {
  await delay(50, 100);
  const liked = getStore(KEYS.liked, []);
  return { isLiked: liked.some((v) => v.id === String(videoId)) };
}

// ----- Subscriptions -----

export async function getSubscriptions() {
  const subs = getStore(KEYS.subscriptions, []);
  if (subs.length === 0) return { data: [] };

  try {
    // Fetch real data from YouTube API for these Ids
    const response = await axios.get(
      `http://localhost:5000/api/youtube/channels`,
      {
        params: { ids: subs.join(",") },
      },
    );
    return { data: response.data.items };
  } catch (err) {
    console.error("Hydration error in getSubscriptions:", err);
    // Fallback or empty
    return { data: [] };
  }
}

export async function saveSubscriptions({ clerkId, subscriptions, email }) {
  // API Call to Backend
  const response = await axios.post(`${BASE_URL}/setup`, {
    clerkId,
    subscriptions,
    email: email || null,
  });

  // Local state fallback update
  setStore(KEYS.subscriptions, subscriptions);
  localStorage.setItem(KEYS.setup, "true");

  return response.data;
}

export async function toggleSubscription(youtuberId, clerkId) {
  const subs = getStore(KEYS.subscriptions, []);
  const exists = subs.includes(youtuberId);
  const updated = exists
    ? subs.filter((id) => id !== youtuberId)
    : [...subs, youtuberId];

  setStore(KEYS.subscriptions, updated);
  if (clerkId) await syncToBackend(clerkId);

  return { data: updated, isSubscribed: !exists };
}

export function isSubscribed(youtuberId) {
  const subs = getStore(KEYS.subscriptions, []);
  return subs.includes(youtuberId);
}

// ----- Setup -----

export function isSetupComplete() {
  return localStorage.getItem(KEYS.setup) === "true";
}

export function markSetupComplete() {
  localStorage.setItem(KEYS.setup, "true");
}

export async function verifyUser(clerkId) {
  try {
    const response = await axios.get(`${BASE_URL}/verify`, {
      headers: {
        "x-clerk-id": clerkId,
      },
    });

    if (response.data.exists) {
      markSetupComplete();
      // Hydrate local storage with DB data
      if (response.data.history) setStore(KEYS.history, response.data.history);
      if (response.data.likedVideos)
        setStore(KEYS.liked, response.data.likedVideos);
      if (response.data.playlists)
        setStore("yt_playlists", response.data.playlists);
      if (response.data.subscriptions)
        setStore(KEYS.subscriptions, response.data.subscriptions);
    } else {
      localStorage.removeItem(KEYS.setup);
    }

    return response.data;
  } catch (error) {
    console.error("Error verifying user:", error);
    throw error;
  }
}

// ----- Subscription Feed -----

export async function getSubscriptionFeed() {
  const subs = getStore(KEYS.subscriptions, []);
  return { data: subs };
}
