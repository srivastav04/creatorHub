import VIDEOS from '@/data/videos'
import { delay, shuffle } from '@/utils'

const ITEMS_PER_PAGE = 12

/**
 * Fetches a paginated list of all videos
 * @param {number} page - 1-indexed page number
 * @param {number} limit - items per page
 */
export async function getVideos(page = 1, limit = ITEMS_PER_PAGE) {
    await delay()
    const start = (page - 1) * limit
    const items = VIDEOS.slice(start, start + limit)
    return {
        data: items,
        page,
        limit,
        total: VIDEOS.length,
        hasMore: start + limit < VIDEOS.length,
    }
}

/**
 * Gets a randomised feed page (for the home feed)
 * Shuffles the pool and paginates
 */
export async function getRandomFeed(page = 1, limit = ITEMS_PER_PAGE) {
    await delay()
    // Seed the shuffle with the page number so successive calls give different results
    const basePool = [...VIDEOS, ...VIDEOS] // double the pool so we have > 12 items per page
    const shuffled = shuffle(basePool)
    const start = (page - 1) * limit
    const items = shuffled.slice(start, start + limit).map((v, i) => ({
        ...v,
        // Give each card a unique id within the page to avoid React key collisions
        _uid: `${v.id}-${page}-${i}`,
    }))

    return {
        data: items,
        page,
        limit,
        total: basePool.length,
        hasMore: start + limit < basePool.length,
    }
}

/**
 * Fetch a single video by id
 */
export async function getVideoById(id) {
    await delay()
    const video = VIDEOS.find(v => v.id === String(id))
    if (!video) throw new Error(`Video ${id} not found`)
    return { data: video }
}

/**
 * Get related videos (excludes current video, randomised)
 */
export async function getRelatedVideos(id, limit = 10) {
    await delay(200, 400)
    const others = VIDEOS.filter(v => v.id !== String(id))
    const shuffled = shuffle(others)
    return { data: shuffled.slice(0, limit) }
}

/**
 * Search videos by title / tag / channel
 */
export async function searchVideos(query = '', limit = 20) {
    await delay()
    const q = query.toLowerCase().trim()
    const results = VIDEOS.filter(v =>
        v.title.toLowerCase().includes(q) ||
        v.channel.toLowerCase().includes(q) ||
        (v.tags || []).some(t => t.toLowerCase().includes(q))
    )
    return { data: results.slice(0, limit), total: results.length }
}
