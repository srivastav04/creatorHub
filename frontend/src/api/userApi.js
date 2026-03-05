import VIDEOS from '@/data/videos'
import YOUTUBERS from '@/data/youtubers'
import { delay, generateId } from '@/utils'

// ----- localStorage helpers -----
function getStore(key, defaultValue) {
    try {
        const raw = localStorage.getItem(key)
        return raw ? JSON.parse(raw) : defaultValue
    } catch {
        return defaultValue
    }
}

function setStore(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
        console.error('localStorage write failed', e)
    }
}

const KEYS = {
    history: 'yt_watch_history',
    liked: 'yt_liked_videos',
    subscriptions: 'yt_subscriptions',
    setup: 'yt_setup_complete',
}

// ----- Watch History -----

export async function getWatchHistory() {
    await delay()
    const history = getStore(KEYS.history, [])
    return { data: history }
}

export async function addToWatchHistory(video) {
    await delay(100, 200)
    const history = getStore(KEYS.history, [])
    // Remove if already exists (move‑to‑top)
    const filtered = history.filter(h => h.id !== video.id)
    const entry = { ...video, watchedAt: new Date().toISOString() }
    const updated = [entry, ...filtered].slice(0, 200) // max 200 entries
    setStore(KEYS.history, updated)
    return { data: updated }
}

export async function clearWatchHistory() {
    await delay(100, 200)
    setStore(KEYS.history, [])
    return { data: [] }
}

export async function removeFromWatchHistory(videoId) {
    await delay(100, 200)
    const history = getStore(KEYS.history, [])
    const updated = history.filter(h => h.id !== videoId)
    setStore(KEYS.history, updated)
    return { data: updated }
}

// ----- Liked Videos -----

export async function getLikedVideos() {
    await delay()
    const liked = getStore(KEYS.liked, [])
    return { data: liked }
}

export async function toggleLike(video) {
    await delay(100, 200)
    const liked = getStore(KEYS.liked, [])
    const exists = liked.some(v => v.id === video.id)
    let updated
    if (exists) {
        updated = liked.filter(v => v.id !== video.id)
    } else {
        updated = [{ ...video, likedAt: new Date().toISOString() }, ...liked]
    }
    setStore(KEYS.liked, updated)
    return { data: updated, isLiked: !exists }
}

export async function isVideoLiked(videoId) {
    await delay(50, 100)
    const liked = getStore(KEYS.liked, [])
    return { isLiked: liked.some(v => v.id === String(videoId)) }
}

// ----- Subscriptions -----

export async function getSubscriptions() {
    await delay()
    const subs = getStore(KEYS.subscriptions, [])
    // Hydrate with full YouTuber data
    const hydrated = subs.map(id => YOUTUBERS.find(y => y.id === id)).filter(Boolean)
    return { data: hydrated }
}

export async function saveSubscriptions(youtuberIds) {
    await delay(200, 400)
    setStore(KEYS.subscriptions, youtuberIds)
    localStorage.setItem(KEYS.setup, 'true')
    return { data: youtuberIds }
}

export async function toggleSubscription(youtuberId) {
    await delay(100, 200)
    const subs = getStore(KEYS.subscriptions, [])
    const exists = subs.includes(youtuberId)
    const updated = exists ? subs.filter(id => id !== youtuberId) : [...subs, youtuberId]
    setStore(KEYS.subscriptions, updated)
    return { data: updated, isSubscribed: !exists }
}

// ----- Setup -----

export function isSetupComplete() {
    return localStorage.getItem(KEYS.setup) === 'true'
}

export function markSetupComplete() {
    localStorage.setItem(KEYS.setup, 'true')
}

// ----- Subscription Feed -----

export async function getSubscriptionFeed() {
    await delay()
    const subs = getStore(KEYS.subscriptions, [])
    const feed = VIDEOS.filter(v => subs.includes(v.channelId))
    return { data: feed }
}
