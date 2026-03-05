import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getVideoById, getRelatedVideos } from '@/api/videosApi'
import { addToWatchHistory, toggleLike, isVideoLiked } from '@/api/userApi'
import { getPlaylists as fetchPlaylists, addToPlaylist, createPlaylist } from '@/api/playlistApi'
import { VideoPlayer } from '@/components/VideoPlayer'
import { VideoCardSkeleton, Skeleton } from '@/components/Skeleton'
import { formatViews, formatTimeAgo, cn } from '@/utils'
import {
    ThumbsUp, ThumbsDown, Share2, Download, Flag,
    ListPlus, Bell, Check, Plus, X, Loader2
} from 'lucide-react'

export function WatchPage() {
    const { id } = useParams()
    const queryClient = useQueryClient()
    const [isTheater, setIsTheater] = useState(false)
    const [showPlaylistModal, setShowPlaylistModal] = useState(false)
    const [newPlaylistName, setNewPlaylistName] = useState('')
    const [isLiked, setIsLiked] = useState(false)
    const [showDesc, setShowDesc] = useState(false)

    const { data: videoData, isLoading: videoLoading } = useQuery({
        queryKey: ['video', id],
        queryFn: () => getVideoById(id),
    })

    const { data: relatedData, isLoading: relatedLoading } = useQuery({
        queryKey: ['related', id],
        queryFn: () => getRelatedVideos(id),
    })

    const { data: playlistsData } = useQuery({
        queryKey: ['playlists'],
        queryFn: fetchPlaylists,
    })

    const video = videoData?.data
    const related = relatedData?.data || []
    const playlists = playlistsData?.data || []

    // Track watch history
    useEffect(() => {
        if (video) {
            addToWatchHistory(video)
        }
    }, [video])

    // Load liked state
    useEffect(() => {
        if (id) {
            isVideoLiked(id).then(r => setIsLiked(r.isLiked))
        }
    }, [id])

    const likeMutation = useMutation({
        mutationFn: () => toggleLike(video),
        onSuccess: (data) => {
            setIsLiked(data.isLiked)
        },
    })

    const addToPlaylistMutation = useMutation({
        mutationFn: (playlistId) => addToPlaylist(playlistId, video),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['playlists'] })
            setShowPlaylistModal(false)
        },
    })

    const createPlaylistMutation = useMutation({
        mutationFn: (name) => createPlaylist(name),
        onSuccess: (newPl) => {
            addToPlaylistMutation.mutate(newPl.data.id)
        },
    })

    if (videoLoading) {
        return (
            <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-6">
                <div className="flex-1">
                    <Skeleton className="aspect-video w-full rounded-xl" />
                    <Skeleton className="mt-4 h-7 w-3/4 rounded" />
                    <Skeleton className="mt-2 h-5 w-1/2 rounded" />
                </div>
                <div className="w-full lg:w-96 flex flex-col gap-4">
                    {Array.from({ length: 5 }).map((_, i) => <VideoCardSkeleton key={i} />)}
                </div>
            </div>
        )
    }

    if (!video) return (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
            Video not found.
        </div>
    )

    return (
        <div className={cn(
            'flex flex-col gap-6 p-4 lg:p-6',
            isTheater ? 'lg:flex-col' : 'lg:flex-row'
        )}>
            {/* Main column */}
            <div className={cn('flex flex-col gap-4', isTheater ? 'w-full' : 'flex-1 min-w-0')}>
                {/* Video player */}
                <VideoPlayer
                    video={video}
                    isTheater={isTheater}
                    onTheaterToggle={() => setIsTheater(t => !t)}
                />

                {/* Title */}
                <h1 className="text-xl font-bold leading-tight text-foreground">{video.title}</h1>

                {/* Channel row + actions */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Channel info */}
                    <div className="flex items-center gap-3">
                        <img
                            src={video.channelAvatar}
                            alt={video.channel}
                            className="h-10 w-10 rounded-full object-cover"
                        />
                        <div>
                            <p className="font-semibold text-foreground text-sm">{video.channel}</p>
                            <p className="text-xs text-muted-foreground">{video.subscribers} subscribers</p>
                        </div>
                        <button className="ml-2 flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90">
                            <Bell className="h-3.5 w-3.5" />
                            Subscribe
                        </button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                        {/* Like */}
                        <button
                            onClick={() => likeMutation.mutate()}
                            className={cn(
                                'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                                isLiked
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-accent text-foreground hover:bg-accent/80'
                            )}
                        >
                            <ThumbsUp className={cn('h-4 w-4', isLiked && 'fill-white')} />
                            {formatViews(video.likes).replace(' views', '')}
                        </button>
                        <button className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/80 transition-colors">
                            <ThumbsDown className="h-4 w-4" />
                        </button>
                        <button className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/80 transition-colors">
                            <Share2 className="h-4 w-4" />
                            Share
                        </button>
                        <button
                            onClick={() => setShowPlaylistModal(true)}
                            className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/80 transition-colors"
                        >
                            <ListPlus className="h-4 w-4" />
                            Save
                        </button>
                    </div>
                </div>

                {/* Description */}
                <div className="rounded-xl bg-muted/40 p-4">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                        <span className="font-semibold text-foreground">{formatViews(video.views)}</span>
                        <span>{formatTimeAgo(video.uploadedAt)}</span>
                        {video.tags?.map(t => (
                            <Link key={t} to={`/search?q=${t}`} className="text-blue-500 hover:underline">
                                #{t}
                            </Link>
                        ))}
                    </div>
                    <p className={cn('text-sm text-foreground whitespace-pre-wrap', !showDesc && 'line-clamp-3')}>
                        {video.description}
                    </p>
                    <button
                        onClick={() => setShowDesc(d => !d)}
                        className="mt-1 text-sm font-semibold hover:text-muted-foreground transition-colors"
                    >
                        {showDesc ? 'Show less' : 'Show more'}
                    </button>
                </div>
            </div>

            {/* Sidebar: related videos */}
            <div className={cn(
                'flex flex-col gap-3',
                isTheater ? 'hidden' : 'w-full lg:w-96 shrink-0'
            )}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Up next</h3>
                {relatedLoading
                    ? Array.from({ length: 6 }).map((_, i) => <VideoCardSkeleton key={i} />)
                    : related.map(v => (
                        <Link
                            key={v.id}
                            to={`/watch/${v.id}`}
                            className="group flex gap-3 hover:no-underline"
                        >
                            <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-muted">
                                <img
                                    src={v.thumbnail}
                                    alt={v.title}
                                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                    loading="lazy"
                                />
                            </div>
                            <div className="flex min-w-0 flex-col gap-1">
                                <p className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                    {v.title}
                                </p>
                                <p className="text-xs text-muted-foreground">{v.channel}</p>
                                <p className="text-xs text-muted-foreground">{formatViews(v.views)}</p>
                            </div>
                        </Link>
                    ))
                }
            </div>

            {/* Playlist modal (simple overlay) */}
            {showPlaylistModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-background p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-foreground">Save to playlist</h3>
                            <button onClick={() => setShowPlaylistModal(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Existing playlists */}
                        <div className="flex flex-col gap-2 mb-4 max-h-52 overflow-y-auto">
                            {playlists.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-2">No playlists yet</p>
                            )}
                            {playlists.map(pl => (
                                <button
                                    key={pl.id}
                                    onClick={() => addToPlaylistMutation.mutate(pl.id)}
                                    className="flex items-center gap-3 rounded-xl p-3 text-left hover:bg-accent transition-colors"
                                >
                                    <ListPlus className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{pl.name}</p>
                                        <p className="text-xs text-muted-foreground">{pl.videos.length} videos</p>
                                    </div>
                                    {addToPlaylistMutation.isPending && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
                                </button>
                            ))}
                        </div>

                        {/* Create new playlist */}
                        <div className="flex gap-2 border-t border-border/50 pt-4">
                            <input
                                type="text"
                                placeholder="New playlist name"
                                value={newPlaylistName}
                                onChange={e => setNewPlaylistName(e.target.value)}
                                className="flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                            <button
                                onClick={() => {
                                    if (newPlaylistName.trim()) {
                                        createPlaylistMutation.mutate(newPlaylistName.trim())
                                        setNewPlaylistName('')
                                    }
                                }}
                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
