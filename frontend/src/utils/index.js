import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export function formatViews(views) {
    if (views >= 1_000_000_000) return `${(views / 1_000_000_000).toFixed(1)}B views`
    if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`
    if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`
    return `${views} views`
}

export function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
}

export function formatTimeAgo(dateString) {
    const now = new Date()
    const date = new Date(dateString)
    const diff = Math.floor((now - date) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`
    if (diff < 2592000) return `${Math.floor(diff / 604800)} weeks ago`
    if (diff < 31536000) return `${Math.floor(diff / 2592000)} months ago`
    return `${Math.floor(diff / 31536000)} years ago`
}

export function generateId() {
    return Math.random().toString(36).substring(2, 10)
}

export function shuffle(array) {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}

export function delay(min = 300, max = 600) {
    return new Promise(resolve =>
        setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min)
    )
}

export function groupByDate(items, dateKey = 'watchedAt') {
    const groups = {}
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const thisWeek = new Date(today)
    thisWeek.setDate(thisWeek.getDate() - 7)

    items.forEach(item => {
        const date = new Date(item[dateKey])
        const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        let label
        if (day >= today) label = 'Today'
        else if (day >= yesterday) label = 'Yesterday'
        else if (day >= thisWeek) label = 'This Week'
        else label = 'Older'
        if (!groups[label]) groups[label] = []
        groups[label].push(item)
    })
    return groups
}
