import axios from 'axios'

const BASE_URL = 'http://localhost:5000/api/youtube'
const ITEMS_PER_PAGE = 12

/**
 * Fetches a paginated list of all videos (Popular Feed)
 */
export async function getVideos(page = 1, limit = ITEMS_PER_PAGE, pageToken = '', signal) {
    const response = await axios.get(`${BASE_URL}/feed`, {
        params: { limit, pageToken },
        signal
    })

    return {
        data: response.data.items,
        nextPageToken: response.data.nextPageToken,
        total: response.data.totalResults,
        hasMore: !!response.data.nextPageToken,
    }
}

/**
 * Gets a randomised feed page (for the home feed)
 * In YouTube API, this is usually just the most popular chart
 */
export async function getRandomFeed(page = 1, limit = ITEMS_PER_PAGE, pageToken = '') {
    return getVideos(page, limit, pageToken)
}

/**
 * Fetch a single video by id
 */
export async function getVideoById(id) {
    if (id.length < 5) {
        // Fallback for dummy IDs if they still exist in some data structures
        return { data: null }
    }
    const response = await axios.get(`${BASE_URL}/video/${id}`)
    return { data: response.data }
}

/**
 * Get related videos
 */
export async function getRelatedVideos(id, limit = 10) {
    const response = await axios.get(`${BASE_URL}/video/${id}/related`)
    return { data: response.data.items }
}

/**
 * Search videos by query
 */
export async function searchVideos(query = '', limit = 20, pageToken = '', signal) {
    if (!query) return { data: [], total: 0 }

    const response = await axios.get(`${BASE_URL}/search`, {
        params: { q: query, limit, pageToken },
        signal
    })

    return {
        data: response.data.items,
        nextPageToken: response.data.nextPageToken,
        total: response.data.totalResults,
        hasMore: !!response.data.nextPageToken
    }
}
/**
 * Fetch latest videos from a list of channel IDs
 */
export async function getVideosByChannels(channelIds, pageToken = '') {
    if (!channelIds || channelIds.length === 0) return { data: [] }

    // Join IDs with a comma for the query parameter
    const idsString = channelIds.join(',');

    const response = await axios.get(`${BASE_URL}/subscriptions/videos`, {
        params: { channelIds: idsString, pageToken }
    })

    return {
        data: response.data.items,
        nextPageToken: response.data.nextPageToken
    }
}

/**
 * Fetch channel details for a list of IDs
 */
export async function getChannelsDetails(ids) {
    if (!ids || ids.length === 0) return { data: [] }
    const idsString = ids.join(',')
    const response = await axios.get(`${BASE_URL}/channels`, {
        params: { ids: idsString }
    })
    return { data: response.data.items }
}

