import { delay, generateId } from '@/utils'

const STORE_KEY = 'yt_playlists'

function getStore() {
    try {
        const raw = localStorage.getItem(STORE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

function setStore(playlists) {
    try {
        localStorage.setItem(STORE_KEY, JSON.stringify(playlists))
    } catch (e) {
        console.error('localStorage write failed', e)
    }
}

export async function getPlaylists() {
    await delay()
    return { data: getStore() }
}

export async function getPlaylistById(playlistId) {
    await delay()
    const playlists = getStore()
    const playlist = playlists.find(p => p.id === playlistId)
    if (!playlist) throw new Error(`Playlist ${playlistId} not found`)
    return { data: playlist }
}

export async function createPlaylist(name, description = '') {
    await delay(200, 400)
    const playlists = getStore()
    const newPlaylist = {
        id: generateId(),
        name: name.trim(),
        description: description.trim(),
        videos: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
    const updated = [newPlaylist, ...playlists]
    setStore(updated)
    return { data: newPlaylist }
}

export async function deletePlaylist(playlistId) {
    await delay(200, 300)
    const playlists = getStore()
    const updated = playlists.filter(p => p.id !== playlistId)
    setStore(updated)
    return { data: updated }
}

export async function addToPlaylist(playlistId, video) {
    await delay(200, 300)
    const playlists = getStore()
    const updated = playlists.map(p => {
        if (p.id !== playlistId) return p
        const alreadyIn = p.videos.some(v => v.id === video.id)
        if (alreadyIn) return p
        return {
            ...p,
            videos: [...p.videos, { ...video, addedAt: new Date().toISOString() }],
            updatedAt: new Date().toISOString(),
        }
    })
    setStore(updated)
    const playlist = updated.find(p => p.id === playlistId)
    return { data: playlist }
}

export async function removeFromPlaylist(playlistId, videoId) {
    await delay(100, 200)
    const playlists = getStore()
    const updated = playlists.map(p => {
        if (p.id !== playlistId) return p
        return {
            ...p,
            videos: p.videos.filter(v => v.id !== videoId),
            updatedAt: new Date().toISOString(),
        }
    })
    setStore(updated)
    const playlist = updated.find(p => p.id === playlistId)
    return { data: playlist }
}

export async function renamePlaylist(playlistId, newName) {
    await delay(200, 300)
    const playlists = getStore()
    const updated = playlists.map(p =>
        p.id === playlistId ? { ...p, name: newName.trim(), updatedAt: new Date().toISOString() } : p
    )
    setStore(updated)
    return { data: updated.find(p => p.id === playlistId) }
}

export async function isInPlaylist(playlistId, videoId) {
    await delay(50, 100)
    const playlists = getStore()
    const playlist = playlists.find(p => p.id === playlistId)
    if (!playlist) return { isIn: false }
    return { isIn: playlist.videos.some(v => v.id === String(videoId)) }
}
