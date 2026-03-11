import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@clerk/clerk-react'
import { getVideoById } from '@/api/videosApi'
import { addToWatchHistory, toggleLike, isVideoLiked, toggleSubscription, isSubscribed } from '@/api/userApi'
import { getPlaylists as fetchPlaylists, addToPlaylist, createPlaylist } from '@/api/playlistApi'
import { VideoPlayer } from '@/components/VideoPlayer'
import { Skeleton } from '@/components/Skeleton'
import { formatViews, formatTimeAgo, cn } from '@/utils'
import {
    ThumbsUp, ThumbsDown, Share2,
    ListPlus, Bell, Plus, X, Loader2
} from 'lucide-react'

export function WatchPage() {
    const { id } = useParams()
    const { user } = useUser()
    const queryClient = useQueryClient()
    const [isTheater, setIsTheater] = useState(false)
    const [showPlaylistModal, setShowPlaylistModal] = useState(false)
    const [newPlaylistName, setNewPlaylistName] = useState('')
    const [isLiked, setIsLiked] = useState(false)
    const [subscribed, setSubscribed] = useState(false)
    const [showDesc, setShowDesc] = useState(false)



    const addHistoryMutation = useMutation({
        mutationFn: (video) => addToWatchHistory(video, user?.id),

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['history'],
            })
        },
    })



    const { data: videoData, isLoading: videoLoading } = useQuery({
        queryKey: ['video', id],
        queryFn: () => getVideoById(id),
    })


    const { data: playlistsData } = useQuery({
        queryKey: ['playlists'],
        queryFn: fetchPlaylists,
    })

    const video = videoData?.data
    const playlists = playlistsData?.data || []

    // Track watch history
    useEffect(() => {
        if (video) {
            addHistoryMutation.mutate(video)
        }
    }, [video, user?.id])

    // Load liked and subscription state
    useEffect(() => {
        if (id) {
            isVideoLiked(id).then(r => setIsLiked(r.isLiked))
        }
        if (video?.channelId) {
            setSubscribed(isSubscribed(video.channelId))
        }
    }, [id, video?.channelId])

    const likeMutation = useMutation({
        mutationFn: () => toggleLike(video, user?.id),
        onSuccess: (data) => {
            setIsLiked(data.isLiked)
            queryClient.invalidateQueries({ queryKey: ['liked_videos'] })
        },
    })

    const subscribeMutation = useMutation({
        mutationFn: () => toggleSubscription(video.channelId, user?.id),
        onSuccess: (data) => {
            setSubscribed(data.isSubscribed)
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
            queryClient.invalidateQueries({ queryKey: ['subscription_feed'] })
            queryClient.invalidateQueries({ queryKey: ['home_feed'] })
        },
        onSettled: async () => {
            // Refetch to ensure UI updates immediately
            await Promise.all([
                queryClient.refetchQueries({ queryKey: ['subscription_feed'] }),
                queryClient.refetchQueries({ queryKey: ['subscriptions'] })
            ])
        }
    })

    const addToPlaylistMutation = useMutation({
        mutationFn: (playlistId) => addToPlaylist(playlistId, video, user?.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['playlists'] })
            setShowPlaylistModal(false)
        },
    })

    const createPlaylistMutation = useMutation({
        mutationFn: (name) => createPlaylist(name, '', user?.id),
        onSuccess: (newPl) => {
            addToPlaylistMutation.mutate(newPl.data.id)
        },
    })

    if (videoLoading) {
        return (
            <div className="flex flex-col w-full pb-8">
                <div className="max-w-6xl mx-auto px-4 lg:px-6 pt-4 lg:pt-6 w-full flex flex-col gap-4">
                    <Skeleton className="aspect-video w-full rounded-xl" />
                    <Skeleton className="h-8 w-3/4 rounded" />
                    <Skeleton className="h-12 w-full rounded-xl" />
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
        <div className="flex flex-col w-full pb-8">
            {/* Video Player Section */}
            <div className={cn(
                "w-full flex justify-center bg-black transition-all",
                isTheater ? "" : "bg-transparent max-w-6xl mx-auto px-4 lg:px-6 pt-4 lg:pt-6"
            )}>
                <div className={cn(
                    "w-full",
                    isTheater ? "max-w-[1500px]" : ""
                )}>
                    <VideoPlayer
                        video={video}
                        isTheater={isTheater}
                        onTheaterToggle={() => setIsTheater(t => !t)}
                    />
                </div>
            </div>

            {/* Video Info Section */}
            <div className="w-full max-w-6xl mx-auto px-4 lg:px-6 flex flex-col gap-4 mt-4">
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
                        <button
                            onClick={() => subscribeMutation.mutate()}
                            disabled={subscribeMutation.isPending}
                            className={cn(
                                "ml-2 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all active:scale-95",
                                subscribed
                                    ? "bg-accent text-foreground hover:bg-accent/80"
                                    : "bg-foreground text-background hover:opacity-90"
                            )}>
                            {subscribed ? (
                                <>
                                    <Bell className="h-3.5 w-3.5" />
                                    Subscribed
                                </>
                            ) : (
                                'Subscribe'
                            )}
                            {subscribeMutation.isPending && <Loader2 className="ml-1 h-3 w-3 animate-spin" />}
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
